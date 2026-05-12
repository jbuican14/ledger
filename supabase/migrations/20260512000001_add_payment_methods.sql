-- Payment methods (Cash, Debit Card, Credit Card 1, …) per household.
-- Mirrors the categories pattern: multi-tenant via household_id, RLS by
-- get_user_household_id(), seeded on signup, soft-references from
-- transactions via ON DELETE SET NULL so historical rows survive deletion.

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE payment_methods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, name)
);

CREATE INDEX idx_payment_methods_household ON payment_methods(household_id);

CREATE TRIGGER set_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRANSACTIONS: FK to payment_methods
-- ============================================
-- Nullable: payment method is optional, and only meaningful for expenses.
-- SET NULL on delete so deleting a payment method preserves historical
-- transactions (matches how categories behave via SET NULL on category_id).
ALTER TABLE transactions
    ADD COLUMN payment_method_id UUID
    REFERENCES payment_methods(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_payment_method
    ON transactions(payment_method_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household payment methods"
    ON payment_methods FOR SELECT
    USING (household_id = get_user_household_id());

CREATE POLICY "Users can create household payment methods"
    ON payment_methods FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household payment methods"
    ON payment_methods FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household payment methods"
    ON payment_methods FOR DELETE
    USING (household_id = get_user_household_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;

-- ============================================
-- DEFAULT PAYMENT METHODS SEEDER
-- ============================================
CREATE OR REPLACE FUNCTION create_default_payment_methods(p_household_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO payment_methods (household_id, name, sort_order) VALUES
    (p_household_id, 'Cash',        1),
    (p_household_id, 'Debit Card',  2),
    (p_household_id, 'Credit Card', 3);
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ============================================
-- EXTEND handle_new_user() TO SEED PAYMENT METHODS
-- ============================================
-- Replaces the existing function. Same behavior as before, plus a call to
-- create_default_payment_methods() so new households get sensible defaults.
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
    PERFORM create_default_payment_methods(new_household_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- ============================================
-- BACKFILL FOR EXISTING HOUSEHOLDS
-- ============================================
-- Seed the 3 defaults for every household that doesn't already have payment
-- methods. Safe to run again — UNIQUE(household_id, name) protects against
-- duplicates if this migration is ever re-applied.
INSERT INTO payment_methods (household_id, name, sort_order)
SELECT h.id, m.name, m.sort_order
FROM households h
CROSS JOIN (VALUES
    ('Cash',        1),
    ('Debit Card',  2),
    ('Credit Card', 3)
) AS m(name, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods pm WHERE pm.household_id = h.id
)
ON CONFLICT (household_id, name) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE payment_methods IS 'Payment methods per household (Cash, Debit Card, Credit Card, …)';
COMMENT ON COLUMN transactions.payment_method_id IS 'Payment method used for this transaction. Nullable; typically set on expenses only.';
COMMENT ON FUNCTION create_default_payment_methods(UUID) IS 'Seeds 3 default payment methods (Cash, Debit Card, Credit Card) for a new household.';
