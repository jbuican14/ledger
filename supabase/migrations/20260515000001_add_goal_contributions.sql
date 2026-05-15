-- Goal contributions: ledger of deposits and withdrawals against a goal.
-- amount is signed (+ deposit, − withdrawal) so a single table captures
-- both directions and SUM(amount) yields the goal's current_amount cheaply.
--
-- goals.current_amount is denormalized — the app updates it in lockstep
-- with every insert/update/delete to keep dashboard reads fast.

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE goal_contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    -- household_id denormalized so RLS can match without a join. Cheap to
    -- maintain because contributions never move between households.
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    amount          DECIMAL(12, 2) NOT NULL CHECK (amount <> 0),
    note            TEXT,
    -- User-editable contribution date so back-fills work (e.g. logging
    -- last week's bank transfer). Defaults to today.
    contributed_at  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- History list reads chronologically per goal — covering index keeps it
-- a single index scan.
CREATE INDEX idx_goal_contributions_goal_date
    ON goal_contributions(goal_id, contributed_at DESC, created_at DESC);

CREATE TRIGGER set_goal_contributions_updated_at
    BEFORE UPDATE ON goal_contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANTS (required per CLAUDE.md migration template; Supabase Data API
-- auto-exposure is being removed Oct 30, 2026)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON goal_contributions TO authenticated;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household goal contributions"
    ON goal_contributions FOR SELECT
    USING (household_id = get_user_household_id());

CREATE POLICY "Users can create household goal contributions"
    ON goal_contributions FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household goal contributions"
    ON goal_contributions FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household goal contributions"
    ON goal_contributions FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE goal_contributions IS 'Signed-amount ledger of deposits and withdrawals against a goal. + = deposit, − = withdrawal. Matches the rest of the app''s signed-amount convention.';
COMMENT ON COLUMN goal_contributions.amount IS 'Signed amount in household currency. Strictly non-zero. Sum across all contributions for a goal equals goals.current_amount (maintained by the app).';
COMMENT ON COLUMN goal_contributions.contributed_at IS 'User-editable contribution date. Defaults to CURRENT_DATE so the common case of logging today''s deposit is one tap.';
