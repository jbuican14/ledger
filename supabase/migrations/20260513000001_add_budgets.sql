-- Budgets: per-month flat amount per household.
-- One row per (household, year, month). Editing the amount overwrites;
-- no audit history (a budget is a number, not a journal). History is
-- preserved naturally across months because each month is its own row.

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    year            INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2999),
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    amount          DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, year, month)
);

CREATE INDEX idx_budgets_household_month
    ON budgets(household_id, year, month);

CREATE TRIGGER set_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANTS (required per CLAUDE.md migration template; Supabase Data API
-- auto-exposure is being removed Oct 30, 2026)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household budgets"
    ON budgets FOR SELECT
    USING (household_id = get_user_household_id());

CREATE POLICY "Users can create household budgets"
    ON budgets FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household budgets"
    ON budgets FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household budgets"
    ON budgets FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE budgets IS 'Per-month spending budget per household. One row per (household, year, month). Amount stored as a positive DECIMAL — comparison against spend happens client-side.';
COMMENT ON COLUMN budgets.amount IS 'Monthly budget in household currency. Always >= 0. Negative spend (income) does not reduce remaining budget — only expense totals do.';
