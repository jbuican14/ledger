-- 10.5 (KAN-21): preview an invite for the landing page at /invite/[token].
--
-- The visitor isn't signed in (anon), and RLS hides household_invites from
-- anyone outside the household. SECURITY DEFINER lets this function read the
-- row; it returns only a status and safe display fields, never the full email,
-- household_id or user ids. Granted to anon on purpose (see CLAUDE.md).

CREATE OR REPLACE FUNCTION get_invite_preview(p_token UUID)
RETURNS TABLE (
  status TEXT,
  household_name TEXT,
  inviter_name TEXT,
  email_hint TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_invite household_invites%ROWTYPE;
  v_local TEXT;
  v_hint TEXT;
BEGIN
  SELECT * INTO v_invite FROM household_invites i WHERE i.token = p_token;

  -- Revoke and mistyped links look the same on purpose.
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT 'used'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_invite.expires_at <= NOW() THEN
    RETURN QUERY SELECT 'expired'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Email hint: first 2 + last 1 of the local part; 3 chars or fewer → first only.
  v_local := SPLIT_PART(v_invite.email, '@', 1);
  v_hint := CASE
    WHEN LENGTH(v_local) <= 3 THEN LEFT(v_local, 1) || '•••'
    ELSE LEFT(v_local, 2) || '•••' || RIGHT(v_local, 1)
  END || '@' || SPLIT_PART(v_invite.email, '@', 2);

  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(v_invite.email)) THEN
    RETURN QUERY SELECT 'account_exists'::TEXT, NULL::TEXT, NULL::TEXT, v_hint, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- display_name falls back to the email for password signups; never leak it
  RETURN QUERY
  SELECT 'valid'::TEXT,
          h.name,
          CASE WHEN p.display_name LIKE '%@%' THEN NULL ELSE p.display_name END,
          v_hint,
          v_invite.expires_at
  FROM households h
  LEFT JOIN profiles p ON p.id = v_invite.invited_by
  WHERE h.id = v_invite.household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

REVOKE EXECUTE ON FUNCTION get_invite_preview(UUID) FROM public;
GRANT EXECUTE ON FUNCTION get_invite_preview(UUID) TO anon, authenticated;

COMMENT ON FUNCTION get_invite_preview(UUID) IS 
  'Landing-page preview for /invite/[token]. Callable by anon. Returns status (not_found/used/expired/account_exists/valid) plus masked, display-only fields. SECURITY DEFINER + search_path pinned.';