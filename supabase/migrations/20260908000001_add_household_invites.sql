-- Household invites: lets an owner invite one other person into their household.
--
-- Model: a profile belongs to exactly ONE household (profiles.household_id).
-- Joining a household therefore MOVES a user rather than adding a membership
-- row. See docs/HOUSEHOLD_SHARING_DESIGN.md for why we kept the single FK.
--
-- Delivery: the owner shares a link containing invites.token. The link is only
-- navigation — authorisation comes from matching the signup email to
-- invites.email, so possession of the link alone is not enough to join.
--
-- Acceptance happens in handle_new_user() (next migration), which runs
-- SECURITY DEFINER and therefore bypasses the RLS policies below. The invitee
-- never reads or writes this table directly; no anon grant is needed.

-- ============================================
-- PROFILES: role
-- ============================================
ALTER TABLE profiles
    ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'member'));

-- Every existing profile is the sole occupant of its own household, so they
-- are all owners. Must run before any owner-only policy is enforced.
UPDATE profiles SET role = 'owner';

-- ============================================
-- PROFILES: close two holes before adding roles
-- ============================================
-- 1. "Users can update own profile" checks only WHICH ROW you may write, not
--    WHICH COLUMNS. With a role column that becomes privilege escalation
--    (set role='owner'), and it already allowed setting household_id to an
--    arbitrary value to move yourself into someone else's household.
--
--    RLS cannot express column restrictions, so use column-level GRANTs.
--    household_id and role are then writable only by SECURITY DEFINER
--    functions — the signup trigger and, later, invite acceptance.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, onboarding_completed)
    ON profiles TO authenticated;

-- 2. Household members need to see each other for the members list. The old
--    policy limited SELECT to your own row.
DROP POLICY "Users can view own profile" ON profiles;

CREATE POLICY "Users can view household profiles"
    ON profiles FOR SELECT
    USING (household_id = get_user_household_id());

-- ============================================
-- HELPER: is_household_owner()
-- ============================================
-- Mirrors get_user_household_id(). Policies call this instead of inlining a
-- subquery against profiles, so the ownership rule lives in one place.
-- SECURITY DEFINER so it can read profiles without recursing through RLS.
CREATE OR REPLACE FUNCTION is_household_owner()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'owner'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE household_invites (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- The authorisation. Stored lowercase so it can be compared directly to
    -- auth.users.email, which Supabase normalises the same way.
    email        TEXT NOT NULL CHECK (email = lower(email)),

    role         TEXT NOT NULL DEFAULT 'member'
                     CHECK (role IN ('owner', 'member')),

    -- Goes in the shareable link. Separate from id so a link can be rotated
    -- without deleting the row and losing the audit trail.
    token        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    invited_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',

    -- NULL until used. This is what makes an invite single-use.
    accepted_at  TIMESTAMPTZ,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One pending invite per email per household. Partial index so a person can
-- be re-invited after an earlier invite was accepted.
CREATE UNIQUE INDEX idx_household_invites_pending
    ON household_invites(household_id, email)
    WHERE accepted_at IS NULL;

-- The signup trigger looks up pending invites by email on every new user.
CREATE INDEX idx_household_invites_email
    ON household_invites(email)
    WHERE accepted_at IS NULL;

CREATE TRIGGER set_household_invites_updated_at
    BEFORE UPDATE ON household_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANTS (required per CLAUDE.md migration template; Supabase Data API
-- auto-exposure is being removed Oct 30, 2026)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON household_invites TO authenticated;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Anyone in the household can see pending invites, so a member can tell
-- someone has already been invited.
CREATE POLICY "Users can view household invites"
    ON household_invites FOR SELECT
    USING (household_id = get_user_household_id());

-- Only owners may invite, and only into their own household.
CREATE POLICY "Owners can create household invites"
    ON household_invites FOR INSERT
    WITH CHECK (
        household_id = get_user_household_id()
        AND is_household_owner()
    );

CREATE POLICY "Owners can update household invites"
    ON household_invites FOR UPDATE
    USING (household_id = get_user_household_id() AND is_household_owner())
    WITH CHECK (household_id = get_user_household_id() AND is_household_owner());

-- Revoking an invite is a delete.
CREATE POLICY "Owners can delete household invites"
    ON household_invites FOR DELETE
    USING (household_id = get_user_household_id() AND is_household_owner());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE household_invites IS
    'Pending invitations to join a household. Authorised by email match at signup, not by possession of the token.';
COMMENT ON COLUMN household_invites.token IS
    'Random UUID embedded in the share link. Navigation only — the email match is what authorises the join.';
COMMENT ON COLUMN household_invites.accepted_at IS
    'Set by handle_new_user() when the invite is consumed. NULL means pending.';
COMMENT ON COLUMN profiles.role IS
    'owner may invite/remove members and rename the household; member has full data access but no admin rights. Writable only by SECURITY DEFINER functions.';
COMMENT ON FUNCTION is_household_owner() IS
    'True when the current user is an owner of their household. SECURITY DEFINER + search_path pinned.';
