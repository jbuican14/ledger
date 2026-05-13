"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { Budget } from "@/types/database";

const supabase = createClient();

// One household + month = at most one budget row. The hook returns the
// budget for that month or null when none has been set yet, and exposes
// setBudget to upsert by (household_id, year, month).
export function useBudget(year: number, month: number) {
  const { household } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("budgets")
      .select("*")
      .eq("household_id", household.id)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBudget((data as Budget) ?? null);
    }
    setIsLoading(false);
  }, [household?.id, year, month]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const setAmount = async (
    amount: number,
  ): Promise<{ error: string | null }> => {
    if (!household?.id) return { error: "No household found" };
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Budget must be 0 or greater" };
    }

    // Upsert on (household_id, year, month) — the unique constraint ensures
    // we never accumulate duplicate rows for the same month.
    const { data, error: upsertError } = await supabase
      .from("budgets")
      .upsert(
        {
          household_id: household.id,
          year,
          month,
          amount,
        },
        { onConflict: "household_id,year,month" },
      )
      .select()
      .single();

    if (upsertError) return { error: upsertError.message };
    setBudget(data as Budget);
    return { error: null };
  };

  const clearBudget = async (): Promise<{ error: string | null }> => {
    if (!budget) return { error: null };
    const { error: deleteError } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budget.id);
    if (deleteError) return { error: deleteError.message };
    setBudget(null);
    return { error: null };
  };

  return {
    budget,
    setAmount,
    clearBudget,
    isLoading,
    error,
    refetch: fetchBudget,
  };
}
