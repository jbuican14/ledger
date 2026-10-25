-- Exercises get_invite_preview() (Epic 10.5).
--
-- Run in the Supabase SQL editor after applying
-- 20261019000001_get_invite_preview.sql. Everything is ROLLED BACK.
BEGIN;
DO $$
DECLARE
    sam_id   UUID := gen_random_uuid();
    plain_id UUID := gen_random_uuid();
    hh       UUID;
    hh2      UUID;
    tok      UUID;
    r        RECORD;
    n        INT;
BEGIN
 -- ---------- Setup: Sam (with a real name) owns "The Bew Family" ----------
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (sam_id, 'sam@test.local', '{"full_name": "Sam"}');
  SELECT household_id INTO hh FROM profiles WHERE id = sam_id;
  UPDATE households SET name = 'The Bew Family' WHERE id = hh;

  -- ---------- Case 1: unknown token → not_found, nothing else ----------
  SELECT * INTO r FROM get_invite_preview(gen_random_uuid());
  ASSERT r.status = 'not_found', format('case 1: got %s', r.status);
  ASSERT r.household_name IS NULL AND r.email_hint IS NULL, 'case 1: leaked fields';

  -- ---------- Case 2: valid → names + masked hint ----------
  INSERT INTO household_invites (household_id, email, invited_by)
  VALUES (hh, 'alex@test.local', sam_id) RETURNING token INTO tok;
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.status = 'valid', format('case 2: got %s', r.status);
  ASSERT r.household_name = 'The Bew Family', format('case 2: household %s', r.household_name);
  ASSERT r.inviter_name = 'Sam', format('case 2: inviter %s', r.inviter_name);
  ASSERT r.email_hint = 'al•••x@test.local', format('case 2: hint %s', r.email_hint);
  ASSERT r.expires_at > NOW(), 'case 2: expires_at missing';

  -- ---------- Case 3: short local part (3 or fewer) → first letter only ----------
  INSERT INTO household_invites (household_id, email, invited_by)
  VALUES (hh, 'bob@test.local', sam_id) RETURNING token INTO tok;
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.email_hint = 'b•••@test.local', format('case 3: hint %s', r.email_hint);

  -- ---------- Case 4: inviter's display_name is an email → NULL ----------
  INSERT INTO auth.users (id, email) VALUES (plain_id, 'plain@test.local');
  SELECT household_id INTO hh2 FROM profiles WHERE id = plain_id;
  INSERT INTO household_invites (household_id, email, invited_by)
  VALUES (hh2, 'friend@test.local', plain_id) RETURNING token INTO tok;
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.status = 'valid', format('case 4: got %s', r.status);
  ASSERT r.inviter_name IS NULL, format('case 4: leaked inviter email %s', r.inviter_name);

  -- ---------- Case 5: expired → no hint, no names ----------
  INSERT INTO household_invites (household_id, email, invited_by, expires_at)
  VALUES (hh, 'late@test.local', sam_id, NOW() - INTERVAL '1 day') RETURNING token INTO tok;
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.status = 'expired', format('case 5: got %s', r.status);
  ASSERT r.email_hint IS NULL, 'case 5: expired invite leaked the hint';

  -- ---------- Case 6: used → Alex signs up, trigger accepts the invite ----------
  SELECT token INTO tok FROM household_invites WHERE email = 'alex@test.local';
  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'alex@test.local');
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.status = 'used', format('case 6: got %s', r.status);

   -- ---------- Case 7: email already has an account → account_exists ----------
  -- Existing user first (gets their own household), then the invite.
  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'old@test.local');
  INSERT INTO household_invites (household_id, email, invited_by)
  VALUES (hh, 'old@test.local', sam_id) RETURNING token INTO tok;
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.status = 'account_exists', format('case 7: got %s', r.status);
  ASSERT r.email_hint = 'o•••@test.local', format('case 7: hint %s', r.email_hint);
  ASSERT r.household_name IS NULL, 'case 7: leaked household name';

  -- ---------- Case 8: anon can call the function but not read the table ----------
  -- Must be last: statements after this run as `anon`.
  SET LOCAL ROLE anon;
  SELECT * INTO r FROM get_invite_preview(tok);
  ASSERT r.status = 'account_exists', 'case 8: anon could not call the function';
  BEGIN
      SELECT count(*) INTO n FROM household_invites;
      RAISE EXCEPTION 'case 8: anon read household_invites directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  RAISE NOTICE 'All get_invite_preview() cases passed';
END $$;
ROLLBACK;