-- Fix soft-delete RLS interaction.
--
-- Root cause: the SELECT policy excluded rows where `deleted_at IS NOT NULL`.
-- When PostgREST runs UPDATE ... RETURNING (e.g. soft-delete sets deleted_at),
-- the RETURNING phase applies the SELECT policy to the new row. Since the new
-- row has deleted_at set, SELECT filters it out and PostgreSQL raises 42501
-- "new row violates row-level security policy" — even though the UPDATE
-- WITH CHECK itself passes.
--
-- Fix: the SELECT policy stops filtering soft-deleted rows. The app already
-- filters `.is("deleted_at", null)` everywhere it lists transactions, so this
-- only removes defense-in-depth that was causing soft delete to break.
--
-- Also restores the proper UPDATE WITH CHECK (was temporarily `true` for
-- diagnostics).

-- Re-enable RLS (was disabled for diagnostics)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- SELECT: no longer hide soft-deleted rows at the RLS layer.
DROP POLICY "Users can view household transactions" ON transactions;

CREATE POLICY "Users can view household transactions"
    ON transactions FOR SELECT
    USING (household_id = get_user_household_id());

-- UPDATE: restore proper WITH CHECK after diagnostic loosening.
DROP POLICY "Users can update household transactions" ON transactions;

CREATE POLICY "Users can update household transactions"
    ON transactions FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());

COMMENT ON POLICY "Users can view household transactions" ON transactions IS
    'Users can view all transactions in their household, including soft-deleted. App filters deleted_at IS NULL client-side.';
COMMENT ON POLICY "Users can update household transactions" ON transactions IS
    'Users can update transactions in their household, including soft-delete and undo.';
