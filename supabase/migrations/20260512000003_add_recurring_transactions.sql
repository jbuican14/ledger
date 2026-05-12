-- Recurring transactions: rules that describe a bill/income that repeats.
-- Mirrors the categories/payment_methods pattern: multi-tenant via
-- household_id, RLS by get_user_household_id(), category_id is nullable
-- with ON DELETE SET NULL so historical recurring rules survive category
-- deletion (matches transactions.category_id).

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE recurring_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    amount          DECIMAL(12, 2) NOT NULL CHECK (amount <> 0),
    frequency       TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
    next_due_date   DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_transactions_household
    ON recurring_transactions(household_id);

CREATE INDEX idx_recurring_transactions_due
    ON recurring_transactions(household_id, next_due_date);

CREATE TRIGGER set_recurring_transactions_updated_at
    BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household recurring transactions"
    ON recurring_transactions FOR SELECT
    USING (household_id = get_user_household_id());

CREATE POLICY "Users can create household recurring transactions"
    ON recurring_transactions FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household recurring transactions"
    ON recurring_transactions FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household recurring transactions"
    ON recurring_transactions FOR DELETE
    USING (household_id = get_user_household_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_transactions TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE recurring_transactions IS 'Recurring rules per household. Each row describes a bill or income that repeats at a fixed frequency. The monthly dashboard banner reads next_due_date to surface "items due this month"; quick-add advances next_due_date by the frequency after creating a transaction.';
COMMENT ON COLUMN recurring_transactions.amount IS 'Signed amount, same convention as transactions: negative = expense, positive = income. CHECK (amount <> 0).';
COMMENT ON COLUMN recurring_transactions.next_due_date IS 'The date the next occurrence is due. Updated by application code after quick-add (advanced by frequency).';
