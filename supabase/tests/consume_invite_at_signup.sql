-- Exercises every branch of handle_new_user() (Epic 10.2).
--
-- Run in the Supabase SQL editor (or psql). Everything happens inside one
-- transaction that is ROLLED BACK at the end, so it leaves no trace. Any
-- failed assertion raises and aborts with a message naming the case.
--
-- Inserting into auth.users fires the real on_auth_user_created trigger —
-- the same code path a real signup takes.

BEGIN;

DO $$
DECLARE
    owner_id     UUID := gen_random_uuid();
    hh           UUID;
    p            profiles%ROWTYPE;
    n            INT;
    households_before INT;
BEGIN
    -- ---------- Case 1: no invite → unchanged behaviour ----------
    INSERT INTO auth.users (id, email) VALUES (owner_id, 'owner@test.local');
    SELECT * INTO p FROM profiles WHERE id = owner_id;
    hh := p.household_id;

    ASSERT p.role = 'owner', 'case 1: fresh signup should be owner';
    ASSERT NOT p.onboarding_completed, 'case 1: fresh signup should still onboard';
    SELECT count(*) INTO n FROM categories WHERE household_id = hh;
    ASSERT n = 10, format('case 1: expected 10 seeded categories, got %s', n);
    SELECT count(*) INTO n FROM payment_methods WHERE household_id = hh;
    ASSERT n > 0, 'case 1: payment methods should be seeded';

    -- ---------- Case 2: valid invite → joins inviter's household ----------
    INSERT INTO household_invites (household_id, email, invited_by)
    VALUES (hh, 'partner@test.local', owner_id);

    -- Count before/after rather than asserting zero empty households: a live
    -- database may already contain some (e.g. left behind by deleted users).
    SELECT count(*) INTO households_before FROM households;

    -- Mixed case on the way in: matching must be case-insensitive.
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'Partner@Test.local');
    SELECT * INTO p FROM profiles WHERE display_name = 'Partner@Test.local';

    ASSERT p.household_id = hh, 'case 2: invitee should join the inviter''s household';
    ASSERT p.role = 'member', 'case 2: invitee should adopt the invite role';
    ASSERT p.onboarding_completed, 'case 2: invitee should skip onboarding';
    SELECT count(*) INTO n FROM categories WHERE household_id = hh;
    ASSERT n = 10, format('case 2: categories duplicated (%s)', n);
    SELECT count(*) INTO n FROM households;
    ASSERT n = households_before, 'case 2: a household was created for the invitee';
    ASSERT (SELECT accepted_at IS NOT NULL FROM household_invites
            WHERE email = 'partner@test.local'),
        'case 2: invite should be marked accepted';

    -- ---------- Case 3: expired invite → own household ----------
    INSERT INTO household_invites (household_id, email, expires_at)
    VALUES (hh, 'late@test.local', NOW() - INTERVAL '1 minute');

    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'late@test.local');
    SELECT * INTO p FROM profiles WHERE display_name = 'late@test.local';

    ASSERT p.household_id <> hh, 'case 3: expired invite must not be honoured';
    ASSERT p.role = 'owner', 'case 3: should own their own household';
    ASSERT (SELECT accepted_at IS NULL FROM household_invites
            WHERE email = 'late@test.local'),
        'case 3: expired invite should stay unaccepted';

    -- ---------- Case 4: invite already accepted → can't be reused ----------
    -- partner@ consumed it in case 2. Same address can't sign up twice
    -- (auth.users.email is unique), so check the invite is no longer pending.
    SELECT count(*) INTO n FROM household_invites
    WHERE email = 'partner@test.local' AND accepted_at IS NULL;
    ASSERT n = 0, 'case 4: accepted invite should not be pending';

    -- ---------- Case 5: Google-style metadata → full_name used ----------
    INSERT INTO household_invites (household_id, email) VALUES (hh, 'g@test.local');
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (gen_random_uuid(), 'g@test.local', '{"full_name": "Gee Oogle"}');
    SELECT * INTO p FROM profiles WHERE display_name = 'Gee Oogle';

    ASSERT p.household_id = hh, 'case 5: OAuth-shaped signup should also join';

    RAISE NOTICE 'All handle_new_user() cases passed';
END $$;

ROLLBACK;
