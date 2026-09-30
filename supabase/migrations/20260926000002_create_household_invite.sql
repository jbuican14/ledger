-- Create a household invite (Epic 10.3).
--
-- The UI calls this via supabase.rpc() instead of inserting into
-- household_invites directly, because the lifecycle rules below need to read
-- auth.users, which the client can't see.
--
-- Claim lifecycle for the invited email, derived — no state column:
--   ACTIVE   member of this household with a confirmed email  → refuse
--   PENDING  member, unconfirmed, claimed < 7 days ago         → refuse
--   EXPIRED  member, unconfirmed, claimed >= 7 days ago        → delete the
--            stale auth user, then invite afresh
--
-- Why delete on EXPIRED: auth.users.email is unique, so while the stale row
-- exists a new signup with that email can never fire handle_new_user() and the
-- new invite could never be claimed. Also stops a late confirmation turning a
-- stale claim ACTIVE. PENDING claims are never deleted — that would break
-- someone halfway through confirming.
--
-- Only users in the CALLER'S household are considered. An account elsewhere is
-- Decision 4 territory (10.5) and is never touched here.
--
-- See docs/HOUSEHOLD_SHARING_DESIGN.md (story 10.2 lifecycle decision, 10.3).

CREATE OR REPLACE FUNCTION create_household_invite(p_email TEXT)
RETURNS household_invites AS $$
DECLARE
    v_email          TEXT := lower(trim(p_email));
    v_household_id   UUID := get_user_household_id();
    v_user_id        UUID;
    v_confirmed_at   TIMESTAMPTZ;
    v_claimed_at     TIMESTAMPTZ;
    result           household_invites;
BEGIN
    IF NOT is_household_owner() THEN
        RAISE EXCEPTION 'Only the household owner can invite people'
            USING ERRCODE = '42501';
    END IF;

    IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'Enter a valid email address'
            USING ERRCODE = '22023';
    END IF;

    -- Claim time is profiles.created_at: the trigger creates the profile at
    -- the moment the invite is claimed, and it's NOT NULL. (auth.users.created_at
    -- has no default, so a NULL there would silently read as EXPIRED and
    -- delete a PENDING user.)
    SELECT u.id, u.email_confirmed_at, p.created_at
    INTO v_user_id, v_confirmed_at, v_claimed_at
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE lower(u.email) = v_email
      AND p.household_id = v_household_id;

    IF FOUND THEN
        IF v_confirmed_at IS NOT NULL THEN
            RAISE EXCEPTION 'They are already a member of this household'
                USING ERRCODE = 'P0001';
        ELSIF v_claimed_at > NOW() - INTERVAL '7 days' THEN
            RAISE EXCEPTION 'Waiting for them to confirm their email'
                USING ERRCODE = 'P0001';
        ELSE
            -- EXPIRED. Cascades to profiles. An unconfirmed user can't have
            -- signed in, so there's no data of theirs to lose.
            DELETE FROM auth.users WHERE id = v_user_id;
        END IF;
    END IF;

    -- An unclaimed invite past its expiry still occupies the partial unique
    -- index (accepted_at IS NULL). Clear it so the owner can simply re-invite.
    DELETE FROM household_invites
    WHERE household_id = v_household_id
      AND email = v_email
      AND accepted_at IS NULL
      AND expires_at <= NOW();

    -- A still-valid pending invite for this email raises unique_violation
    -- (23505); the UI turns that into "already has a pending invite".
    INSERT INTO household_invites (household_id, email, invited_by)
    VALUES (v_household_id, v_email, auth.uid())
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Functions are executable by PUBLIC by default. Restrict to signed-in users;
-- the owner check inside does the rest.
REVOKE EXECUTE ON FUNCTION create_household_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_household_invite(TEXT) TO authenticated;

COMMENT ON FUNCTION create_household_invite(TEXT) IS
    'Owner-only. Creates an invite, enforcing the ACTIVE/PENDING/EXPIRED claim lifecycle. Deletes a stale unconfirmed auth user only when its claim is EXPIRED. SECURITY DEFINER + search_path pinned.';
