-- Row Level Security Policies
-- Conforms to PRODUCT_SPEC.md v2.1 (2026-05-09)
--
-- Folds in three earlier "fix" migrations:
--   - 20260420210159_fix_transaction_update_policy (WITH CHECK on UPDATE)
--   - 20260420220300_fix_update_policy_soft_delete (allow soft-delete via UPDATE)
--   - 20260422000000_fix_rls_security_issues       (search_path on SECURITY DEFINER, tighter household INSERT/UPDATE, WITH CHECK on categories UPDATE)

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE households    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get user's household_id
-- ============================================
-- SECURITY DEFINER so it can read profiles regardless of caller; STABLE so
-- Postgres can cache results within a query; search_path pinned for safety
-- (lint 0011: function search path mutable).
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
    SELECT household_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Profiles are created by the on_auth_user_created trigger (SECURITY DEFINER),
-- so no INSERT policy is needed for normal flow.

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Single UPDATE policy covers display_name, avatar, household_id reassignment
-- (the latter happens during invite acceptance — Phase 2, Epic 10).
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- HOUSEHOLDS POLICIES
-- ============================================

CREATE POLICY "Users can view own household"
    ON households FOR SELECT
    USING (id = get_user_household_id());

-- Households are normally created by the signup trigger. This policy is a
-- defense-in-depth fallback that only allows authenticated users without an
-- existing household to create one (lint 0024: permissive RLS).
CREATE POLICY "Users can create household if none exists"
    ON households FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND household_id IS NOT NULL
        )
    );

CREATE POLICY "Users can update own household"
    ON households FOR UPDATE
    USING (id = get_user_household_id())
    WITH CHECK (id = get_user_household_id());

-- ============================================
-- CATEGORIES POLICIES
-- ============================================

CREATE POLICY "Users can view household categories"
    ON categories FOR SELECT
    USING (household_id = get_user_household_id());

CREATE POLICY "Users can create household categories"
    ON categories FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household categories"
    ON categories FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household categories"
    ON categories FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================

-- Normal reads exclude soft-deleted rows. Undo restores via UPDATE (clears
-- deleted_at) using client-side state — no SELECT of deleted rows required.
CREATE POLICY "Users can view household transactions"
    ON transactions FOR SELECT
    USING (
        household_id = get_user_household_id()
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can create household transactions"
    ON transactions FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

-- WITH CHECK allows two cases:
--   1. Normal updates that keep household_id matching the user's household.
--   2. Soft-delete operations (deleted_at IS NOT NULL) which set deleted_at
--      and may temporarily fail the household check during the WITH CHECK
--      pass. Restore (undo) goes through case 1.
CREATE POLICY "Users can update household transactions"
    ON transactions FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (
        household_id = get_user_household_id()
        OR deleted_at IS NOT NULL
    );

CREATE POLICY "Users can delete household transactions"
    ON transactions FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON households   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION get_user_household_id() IS
    'Returns the household_id for the current authenticated user. SECURITY DEFINER + search_path pinned.';
COMMENT ON POLICY "Users can view household transactions" ON transactions IS
    'Excludes soft-deleted transactions from normal queries.';
COMMENT ON POLICY "Users can update household transactions" ON transactions IS
    'WITH CHECK allows soft-delete (deleted_at IS NOT NULL) to bypass the household match.';
COMMENT ON POLICY "Users can create household if none exists" ON households IS
    'Defense-in-depth: signup trigger normally handles creation. Only allows authed users with no household to create one.';
