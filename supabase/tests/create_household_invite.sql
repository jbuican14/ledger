-- Exercises create_household_invite() and invite RLS (Epic 10.3).
--
-- Run in the Supabase SQL editor after applying
-- 20260926000002_create_household_invite.sql. Everything is ROLLED BACK.
--
-- auth.uid() reads the JWT claims setting, so set_config('request.jwt.claims')
-- is how we "sign in" as a given user inside the test.

BEGIN;

DO $$
DECLARE
    owner_id  UUID := gen_random_uuid();
    member_id UUID := gen_random_uuid();
    m2_id     UUID := gen_random_uuid();
    hh        UUID;
    inv       household_invites%ROWTYPE;
    n         INT;
    state     TEXT;
    msg       TEXT;
BEGIN
    -- ---------- Setup: an owner with their own household ----------
    INSERT INTO auth.users (id, email) VALUES (owner_id, 'owner@test.local');
    SELECT household_id INTO hh FROM profiles WHERE id = owner_id;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id)::text, true);

    -- ---------- Case 1: owner invites → row created, email normalised ----------
    inv := create_household_invite('  Mem@Test.local ');
    ASSERT inv.email = 'mem@test.local', format('case 1: email not normalised (%s)', inv.email);
    ASSERT inv.household_id = hh, 'case 1: wrong household';
    ASSERT inv.invited_by = owner_id, 'case 1: invited_by not set';

    -- ---------- Case 2: duplicate pending invite → unique violation ----------
    BEGIN
        PERFORM create_household_invite('mem@test.local');
        RAISE EXCEPTION 'case 2: duplicate invite was allowed';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    -- ---------- Case 3: invalid email → 22023 ----------
    BEGIN
        PERFORM create_household_invite('not-an-email');
        RAISE EXCEPTION 'case 3: invalid email was allowed';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    -- mem@ signs up and claims the invite (unconfirmed → PENDING)
    INSERT INTO auth.users (id, email) VALUES (member_id, 'mem@test.local');
    ASSERT (SELECT household_id FROM profiles WHERE id = member_id) = hh,
        'setup: member did not join';

    -- ---------- Case 4: PENDING claim → refuse, user untouched ----------
    BEGIN
        PERFORM create_household_invite('mem@test.local');
        RAISE EXCEPTION 'case 4: re-invite of PENDING claim was allowed';
    EXCEPTION WHEN raise_exception THEN
        GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
        ASSERT msg = 'Waiting for them to confirm their email', format('case 4: wrong error (%s)', msg);
    END;
    ASSERT EXISTS (SELECT 1 FROM auth.users WHERE id = member_id), 'case 4: pending user was deleted';

    -- ---------- Case 5: ACTIVE member → refuse ----------
    UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = member_id;
    BEGIN
        PERFORM create_household_invite('mem@test.local');
        RAISE EXCEPTION 'case 5: re-invite of ACTIVE member was allowed';
    EXCEPTION WHEN raise_exception THEN
        GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
        ASSERT msg = 'They are already a member of this household', format('case 5: wrong error (%s)', msg);
    END;

    -- ---------- Case 6: EXPIRED claim → stale user deleted, fresh invite ----------
    UPDATE auth.users SET email_confirmed_at = NULL WHERE id = member_id;
    UPDATE profiles SET created_at = NOW() - INTERVAL '8 days' WHERE id = member_id;

    inv := create_household_invite('mem@test.local');
    ASSERT NOT EXISTS (SELECT 1 FROM auth.users WHERE id = member_id), 'case 6: stale user not deleted';
    ASSERT NOT EXISTS (SELECT 1 FROM profiles WHERE id = member_id), 'case 6: stale profile not deleted';
    ASSERT inv.accepted_at IS NULL, 'case 6: new invite should be pending';

    -- ---------- Case 7: expired unclaimed invite → re-invite replaces it ----------
    INSERT INTO household_invites (household_id, email, expires_at)
    VALUES (hh, 'old@test.local', NOW() - INTERVAL '1 day');
    inv := create_household_invite('old@test.local');
    SELECT count(*) INTO n FROM household_invites WHERE household_id = hh AND email = 'old@test.local';
    ASSERT n = 1, format('case 7: expected 1 invite row, got %s', n);
    ASSERT inv.expires_at > NOW(), 'case 7: new invite should be unexpired';

    -- ---------- Case 8: account in ANOTHER household is never touched ----------
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'elsewhere@test.local');
    PERFORM create_household_invite('elsewhere@test.local');
    ASSERT EXISTS (SELECT 1 FROM auth.users WHERE email = 'elsewhere@test.local'),
        'case 8: user in another household was deleted';

    -- ---------- Case 9: member (non-owner) → refused ----------
    PERFORM create_household_invite('m2@test.local');
    INSERT INTO auth.users (id, email) VALUES (m2_id, 'm2@test.local');
    PERFORM set_config('request.jwt.claims', json_build_object('sub', m2_id)::text, true);
    BEGIN
        PERFORM create_household_invite('someone@test.local');
        RAISE EXCEPTION 'case 9: member was allowed to invite';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- ---------- Case 10: member can't bypass the function via the table ----------
    -- Run as the real client role so RLS applies. Must be last: statements
    -- after this run as `authenticated`.
    SET LOCAL ROLE authenticated;
    BEGIN
        INSERT INTO household_invites (household_id, email) VALUES (hh, 'sneaky@test.local');
        RAISE EXCEPTION 'case 10: member inserted an invite directly';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    SELECT count(*) INTO n FROM household_invites WHERE household_id = hh;
    ASSERT n > 0, 'case 10: member should still be able to SEE household invites';
    RESET ROLE;

    RAISE NOTICE 'All create_household_invite() cases passed';
END $$;

ROLLBACK;
