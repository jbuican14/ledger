-- Row Level Security Policies
-- Ensures users can only access their own household's data

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get user's household_id
-- ============================================
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
    SELECT household_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Profiles are created via trigger (no direct insert needed)
-- But allow users to update their household_id when joining
CREATE POLICY "Users can set their household"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- HOUSEHOLDS POLICIES
-- ============================================

-- Users can view their own household
CREATE POLICY "Users can view own household"
    ON households FOR SELECT
    USING (id = get_user_household_id());

-- Users can create a household (during onboarding)
CREATE POLICY "Users can create household"
    ON households FOR INSERT
    WITH CHECK (true);

-- Users can update their own household
CREATE POLICY "Users can update own household"
    ON households FOR UPDATE
    USING (id = get_user_household_id());

-- ============================================
-- CATEGORIES POLICIES
-- ============================================

-- Users can view categories in their household
CREATE POLICY "Users can view household categories"
    ON categories FOR SELECT
    USING (household_id = get_user_household_id());

-- Users can create categories in their household
CREATE POLICY "Users can create household categories"
    ON categories FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

-- Users can update categories in their household
CREATE POLICY "Users can update household categories"
    ON categories FOR UPDATE
    USING (household_id = get_user_household_id());

-- Users can delete categories in their household
CREATE POLICY "Users can delete household categories"
    ON categories FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================

-- Users can view transactions in their household (excluding soft-deleted)
CREATE POLICY "Users can view household transactions"
    ON transactions FOR SELECT
    USING (
        household_id = get_user_household_id()
        AND deleted_at IS NULL
    );

-- Users can create transactions in their household
CREATE POLICY "Users can create household transactions"
    ON transactions FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

-- Users can update transactions in their household
CREATE POLICY "Users can update household transactions"
    ON transactions FOR UPDATE
    USING (household_id = get_user_household_id());

-- Users can delete (soft delete) transactions in their household
CREATE POLICY "Users can delete household transactions"
    ON transactions FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to tables for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION get_user_household_id() IS 'Returns the household_id for the current authenticated user';
COMMENT ON POLICY "Users can view household transactions" ON transactions IS 'Excludes soft-deleted transactions from normal queries';
