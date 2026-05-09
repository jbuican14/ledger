-- Ledger Database Schema - Phase 1
-- Conforms to PRODUCT_SPEC.md v2.1 (2026-05-09)
--
-- Tables: households, profiles, categories, transactions
-- Conventions:
--   - Every tenant table carries household_id (RLS key) and updated_at.
--   - transactions.amount is signed: negative = expense, positive = income.
--   - categories.type ('expense'|'income') drives UI grouping; transaction
--     sign is the source of truth for reporting.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HOUSEHOLDS (Tenants)
-- ============================================
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'My Finances',
    currency TEXT NOT NULL DEFAULT 'GBP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
    display_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    icon TEXT,
    type TEXT NOT NULL DEFAULT 'expense'
        CHECK (type IN ('expense', 'income')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, name)
);

CREATE INDEX idx_categories_household ON categories(household_id);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount <> 0),
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_household ON transactions(household_id);
CREATE INDEX idx_transactions_date ON transactions(household_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_not_deleted ON transactions(household_id) WHERE deleted_at IS NULL;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER households_updated_at
    BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DEFAULT CATEGORIES SEEDER
-- ============================================
-- Defined before handle_new_user() so the trigger can reference it.
CREATE OR REPLACE FUNCTION create_default_categories(p_household_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO categories (household_id, name, color, icon, type, sort_order) VALUES
    (p_household_id, 'Groceries',     '#22C55E', 'shopping-cart', 'expense', 1),
    (p_household_id, 'Bills',         '#3B82F6', 'file-text',     'expense', 2),
    (p_household_id, 'Transport',     '#F97316', 'car',           'expense', 3),
    (p_household_id, 'Entertainment', '#A855F7', 'film',          'expense', 4),
    (p_household_id, 'Eating Out',    '#EF4444', 'utensils',      'expense', 5),
    (p_household_id, 'Shopping',      '#EC4899', 'shopping-bag',  'expense', 6),
    (p_household_id, 'Health',        '#14B8A6', 'heart-pulse',   'expense', 7),
    (p_household_id, 'Other',         '#6B7280', 'box',           'expense', 8),
    (p_household_id, 'Salary',        '#22C55E', 'banknote',      'income',  1),
    (p_household_id, 'Other Income',  '#22C55E', 'coins',         'income',  2);
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ============================================
-- AUTO-CREATE HOUSEHOLD + PROFILE + CATEGORIES ON SIGNUP
-- ============================================
-- Spec Epic 2.5: every signup gets a household. This atomically creates the
-- household, profile, and seeds default categories so profile.household_id
-- can be NOT NULL from the first row. SECURITY DEFINER bypasses RLS during
-- signup (the user has no profile yet, so RLS would otherwise block them).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_household_id UUID;
BEGIN
    INSERT INTO households (name)
    VALUES ('My Finances')
    RETURNING id INTO new_household_id;

    INSERT INTO profiles (id, household_id, display_name)
    VALUES (
        NEW.id,
        new_household_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );

    PERFORM create_default_categories(new_household_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE households IS 'Tenant table - groups users and their data';
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users; every profile belongs to exactly one household';
COMMENT ON TABLE categories IS 'Expense and income categories per household';
COMMENT ON TABLE transactions IS 'Individual expense and income records';
COMMENT ON COLUMN categories.type IS 'Category type: expense or income (drives UI grouping)';
COMMENT ON COLUMN transactions.amount IS 'Signed amount: negative = expense, positive = income';
COMMENT ON COLUMN transactions.deleted_at IS 'Soft delete timestamp for undo functionality';
COMMENT ON FUNCTION handle_new_user() IS 'On signup: creates household, links profile, seeds default categories. SECURITY DEFINER + search_path pinned for safety.';
COMMENT ON FUNCTION create_default_categories(UUID) IS 'Seeds the 10 default expense/income categories for a new household.';
