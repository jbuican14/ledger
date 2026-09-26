-- Consume a household invite at signup (Epic 10.2).
--
-- handle_new_user() now has two paths:
--   1. A pending, unexpired invite matches NEW.email → join that household
--      with the invite's role, mark the invite accepted, skip seeding and
--      onboarding (the household already has categories, a name, a currency).
--   2. Otherwise → exactly as before: new household, seeded defaults, and the
--      user is its owner.
--
-- RISK: this trigger runs inside the auth.users INSERT transaction. Any error
-- here fails EVERY signup, invited or not. Keep it boring.
--
-- See docs/HOUSEHOLD_SHARING_DESIGN.md (Decision 3, story 10.2).

-- ============================================
-- FIX: signups since 10.1 were created as 'member'
-- ============================================
-- 10.1 added profiles.role DEFAULT 'member' but did not update this trigger,
-- which never set role. So anyone who signed up after that migration is a
-- 'member' of a household with no owner — and cannot invite anyone.
--
-- No invite has been consumed yet, so every household still has exactly one
-- profile; any household without an owner is one of these. Promote them.
UPDATE profiles p
SET role = 'owner'
WHERE NOT EXISTS (
    SELECT 1 FROM profiles o
    WHERE o.household_id = p.household_id AND o.role = 'owner'
);

-- ============================================
-- TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
    invite household_invites%ROWTYPE;
BEGIN
    -- Newest wins if several households invited the same email. auth.users.email
    -- is already lowercase; lower() is defensive and cheap. A NULL email (phone
    -- signup) matches nothing and falls through to the normal path.
    --
    -- No FOR UPDATE needed: auth.users.email is unique, so two signups can't
    -- race for the same invite.
    SELECT * INTO invite
    FROM household_invites
    WHERE email = lower(NEW.email)
      AND accepted_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        INSERT INTO profiles (id, household_id, display_name, role, onboarding_completed)
        VALUES (
            NEW.id,
            invite.household_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            invite.role,
            TRUE
        );

        UPDATE household_invites
        SET accepted_at = NOW()
        WHERE id = invite.id;

        RETURN NEW;
    END IF;

    INSERT INTO households (name)
    VALUES ('My Finances')
    RETURNING id INTO new_household_id;

    INSERT INTO profiles (id, household_id, display_name, role)
    VALUES (
        NEW.id,
        new_household_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'owner'
    );

    PERFORM create_default_categories(new_household_id);
    PERFORM create_default_payment_methods(new_household_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION handle_new_user() IS
    'On signup: joins the household of a pending invite matching NEW.email, otherwise creates a household (as owner) and seeds defaults. SECURITY DEFINER + search_path pinned.';
