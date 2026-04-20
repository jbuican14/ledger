-- Fix transaction update policy to include WITH CHECK for security
-- This prevents users from changing the household_id of transactions

DROP POLICY IF EXISTS "Users can update household transactions" ON transactions;

CREATE POLICY "Users can update household transactions"
    ON transactions FOR UPDATE
    USING (household_id = get_user_household_id())
    WITH CHECK (household_id = get_user_household_id());