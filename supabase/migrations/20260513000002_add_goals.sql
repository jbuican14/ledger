-- Savings goals: per-household named savings targets.
-- One row per goal; current_amount is maintained by the application from
-- the sum of goal_contributions (added in a later migration) — denormalized
-- here for cheap reads in dashboard widgets and list views.
--
-- current_amount is allowed to go negative ("over-withdrawn") so withdrawals
-- never silently block. The UI surfaces the deficit state.

-- ============================================
-- TABLE
-- ============================================
CREATE TABLE goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    target_amount   DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    target_date     DATE,
    icon            TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'completed', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Most reads filter by household + status (active goals on dashboard,
-- archived in a separate view). Partial index keeps the hot path cheap.
CREATE INDEX idx_goals_household_status
    ON goals(household_id, status);

CREATE TRIGGER set_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANTS (required per CLAUDE.md migration template; Supabase Data API
-- auto-exposure is being removed Oct 30, 2026)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON goals TO authenticated;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household goals"
    ON goals FOR SELECT
    USING (household_id = get_user_household_id());

CREATE POLICY "Users can create household goals"
    ON goals FOR INSERT
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household goals"
    ON goals FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household goals"
    ON goals FOR DELETE
    USING (household_id = get_user_household_id());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE goals IS 'Per-household savings goals. current_amount is denormalized — maintained by the application as SUM(goal_contributions.amount). Negative current_amount is permitted to support withdrawals exceeding deposits.';
COMMENT ON COLUMN goals.target_amount IS 'Target the goal is working toward, in household currency. Strictly positive.';
COMMENT ON COLUMN goals.current_amount IS 'Cached sum of contributions. App-maintained on every contribution insert/update/delete. May be negative if withdrawals exceed deposits.';
COMMENT ON COLUMN goals.status IS 'active = still saving; completed = target met (auto-set when current_amount >= target_amount); archived = user-archived (hidden from default views).';
