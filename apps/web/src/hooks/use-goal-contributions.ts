"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { GoalContribution } from "@/types/database";

const supabase = createClient();

export type ContributionFormData = {
  // Signed: positive = deposit, negative = withdrawal. Validation happens
  // upstream — the hook just stores whatever is passed (with !== 0 check).
  amount: number;
  note: string | null;
  contributed_at: string; // YYYY-MM-DD
};

// Returned from mutations so callers can show the updated total / status
// in a toast without re-rendering off the next fetch.
type MutationResult = {
  error: string | null;
  newCurrentAmount?: number;
  newStatus?: "active" | "completed";
};

// Recomputes goal.current_amount from the SUM of its contributions and
// re-evaluates active/completed in one UPDATE. Returns the values it just
// wrote so callers don't have to refetch the goal to display them.
async function recomputeGoalAfterMutation(
  goalId: string,
): Promise<MutationResult> {
  // SUM and target_amount are both needed to decide the new status.
  const [sumRes, goalRes] = await Promise.all([
    supabase
      .from("goal_contributions")
      .select("amount")
      .eq("goal_id", goalId),
    supabase
      .from("goals")
      .select("target_amount,status")
      .eq("id", goalId)
      .single(),
  ]);

  if (sumRes.error) return { error: sumRes.error.message };
  if (goalRes.error) return { error: goalRes.error.message };

  const rows = (sumRes.data ?? []) as Array<{ amount: number }>;
  const newCurrent = rows.reduce((acc, row) => acc + Number(row.amount), 0);
  const target = Number(goalRes.data.target_amount);

  // Don't reset 'archived' goals automatically — that's a user action.
  let newStatus: "active" | "completed" | undefined;
  if (goalRes.data.status !== "archived") {
    newStatus = newCurrent >= target ? "completed" : "active";
  }

  const updates: { current_amount: number; status?: "active" | "completed" } = {
    current_amount: newCurrent,
  };
  if (newStatus) updates.status = newStatus;

  const { error: updateError } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", goalId);

  if (updateError) return { error: updateError.message };
  return { error: null, newCurrentAmount: newCurrent, newStatus };
}

export function useGoalContributions(goalId: string | undefined) {
  const { household } = useAuth();
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContributions = useCallback(async () => {
    if (!household?.id || !goalId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("goal_contributions")
      .select("*")
      .eq("goal_id", goalId)
      .order("contributed_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setContributions((data as GoalContribution[]) ?? []);
    }
    setIsLoading(false);
  }, [household?.id, goalId]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const addContribution = async (
    form: ContributionFormData,
  ): Promise<MutationResult> => {
    if (!household?.id || !goalId) return { error: "No goal context" };
    if (!Number.isFinite(form.amount) || form.amount === 0) {
      return { error: "Amount must be non-zero" };
    }

    const { data, error: insertError } = await supabase
      .from("goal_contributions")
      .insert({
        goal_id: goalId,
        household_id: household.id,
        amount: form.amount,
        note: form.note,
        contributed_at: form.contributed_at,
      })
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    const recomputed = await recomputeGoalAfterMutation(goalId);
    if (recomputed.error) return { error: recomputed.error };

    setContributions((prev) => [data as GoalContribution, ...prev]);
    return recomputed;
  };

  const updateContribution = async (
    id: string,
    form: ContributionFormData,
  ): Promise<MutationResult> => {
    if (!household?.id || !goalId) return { error: "No goal context" };
    if (!Number.isFinite(form.amount) || form.amount === 0) {
      return { error: "Amount must be non-zero" };
    }

    const { data, error: updateError } = await supabase
      .from("goal_contributions")
      .update({
        amount: form.amount,
        note: form.note,
        contributed_at: form.contributed_at,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return { error: updateError.message };

    const recomputed = await recomputeGoalAfterMutation(goalId);
    if (recomputed.error) return { error: recomputed.error };

    setContributions((prev) =>
      prev.map((c) => (c.id === id ? (data as GoalContribution) : c)),
    );
    return recomputed;
  };

  const deleteContribution = async (id: string): Promise<MutationResult> => {
    if (!goalId) return { error: "No goal context" };
    const { error: deleteError } = await supabase
      .from("goal_contributions")
      .delete()
      .eq("id", id);

    if (deleteError) return { error: deleteError.message };

    const recomputed = await recomputeGoalAfterMutation(goalId);
    if (recomputed.error) return { error: recomputed.error };

    setContributions((prev) => prev.filter((c) => c.id !== id));
    return recomputed;
  };

  return {
    contributions,
    isLoading,
    error,
    addContribution,
    updateContribution,
    deleteContribution,
    refetch: fetchContributions,
  };
}
