"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { Goal } from "@/types/database";

const supabase = createClient();

export type GoalFormData = {
  name: string;
  target_amount: number;
  target_date: string | null;
  icon: string | null;
};

// Fetches goals for the active household. Future tickets (KAN-69 edit,
// KAN-70 archive, KAN-68 contributions) will extend this hook with the
// matching mutations.
export function useGoals() {
  const { household } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setGoals((data as Goal[]) ?? []);
    }
    setIsLoading(false);
  }, [household?.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const updateGoal = async (
    id: string,
    form: GoalFormData,
  ): Promise<{ error: string | null }> => {
    if (!household?.id) return { error: "No household found" };
    if (!form.name.trim()) return { error: "Name is required" };
    if (!Number.isFinite(form.target_amount) || form.target_amount <= 0) {
      return { error: "Target amount must be greater than 0" };
    }

    // Hard guard: blocking a target reduction below current_amount needs to
    // happen here too, not just in the form, since callers other than the
    // form could hit this path.
    const existing = goals.find((g) => g.id === id);
    if (
      existing &&
      existing.current_amount > 0 &&
      form.target_amount < existing.current_amount
    ) {
      return {
        error: "Target can't go below the amount already saved",
      };
    }

    // Re-evaluate status when the target changes. Archived goals stay
    // archived — that's a user action, not a derived state.
    const newCurrent = existing?.current_amount ?? 0;
    const newStatus: "active" | "completed" | undefined =
      existing?.status === "archived"
        ? undefined
        : newCurrent >= form.target_amount
          ? "completed"
          : "active";

    const updates: {
      name: string;
      target_amount: number;
      target_date: string | null;
      icon: string | null;
      status?: "active" | "completed";
    } = {
      name: form.name.trim(),
      target_amount: form.target_amount,
      target_date: form.target_date,
      icon: form.icon,
    };
    if (newStatus) updates.status = newStatus;

    const { data, error: updateError } = await supabase
      .from("goals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) return { error: updateError.message };
    setGoals((prev) => prev.map((g) => (g.id === id ? (data as Goal) : g)));
    return { error: null };
  };

  const addGoal = async (
    form: GoalFormData,
  ): Promise<{ error: string | null }> => {
    if (!household?.id) return { error: "No household found" };
    if (!form.name.trim()) return { error: "Name is required" };
    if (!Number.isFinite(form.target_amount) || form.target_amount <= 0) {
      return { error: "Target amount must be greater than 0" };
    }

    const { data, error: insertError } = await supabase
      .from("goals")
      .insert({
        household_id: household.id,
        name: form.name.trim(),
        target_amount: form.target_amount,
        current_amount: 0,
        target_date: form.target_date,
        icon: form.icon,
        status: "active",
      })
      .select()
      .single();

    if (insertError) return { error: insertError.message };
    setGoals((prev) => [data as Goal, ...prev]);
    return { error: null };
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const archivedGoals = goals.filter((g) => g.status === "archived");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return {
    goals,
    activeGoals,
    archivedGoals,
    completedGoals,
    addGoal,
    updateGoal,
    isLoading,
    error,
    refetch: fetchGoals,
  };
}

// Single-goal hook for the detail page. Separate from useGoals to avoid
// pulling the full list when we only need one row.
export function useGoal(id: string | undefined) {
  const { household } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = useCallback(async () => {
    if (!household?.id || !id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("household_id", household.id)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setGoal((data as Goal) ?? null);
    }
    setIsLoading(false);
  }, [household?.id, id]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  const updateGoal = async (
    form: GoalFormData,
  ): Promise<{ error: string | null }> => {
    if (!goal) return { error: "No goal loaded" };
    if (!form.name.trim()) return { error: "Name is required" };
    if (!Number.isFinite(form.target_amount) || form.target_amount <= 0) {
      return { error: "Target amount must be greater than 0" };
    }
    if (
      goal.current_amount > 0 &&
      form.target_amount < goal.current_amount
    ) {
      return { error: "Target can't go below the amount already saved" };
    }

    const newStatus: "active" | "completed" | undefined =
      goal.status === "archived"
        ? undefined
        : goal.current_amount >= form.target_amount
          ? "completed"
          : "active";

    const updates: {
      name: string;
      target_amount: number;
      target_date: string | null;
      icon: string | null;
      status?: "active" | "completed";
    } = {
      name: form.name.trim(),
      target_amount: form.target_amount,
      target_date: form.target_date,
      icon: form.icon,
    };
    if (newStatus) updates.status = newStatus;

    const { data, error: updateError } = await supabase
      .from("goals")
      .update(updates)
      .eq("id", goal.id)
      .select()
      .single();

    if (updateError) return { error: updateError.message };
    setGoal(data as Goal);
    return { error: null };
  };

  // Archives the goal — hides it from the active list / dashboard widget
  // but keeps history intact. Reversible via unarchiveGoal.
  const archiveGoal = async (): Promise<{ error: string | null }> => {
    if (!goal) return { error: "No goal loaded" };
    const { data, error: archiveError } = await supabase
      .from("goals")
      .update({ status: "archived" })
      .eq("id", goal.id)
      .select()
      .single();
    if (archiveError) return { error: archiveError.message };
    setGoal(data as Goal);
    return { error: null };
  };

  // Restores an archived goal. Re-derives active vs completed from the
  // current total so it lands in the right bucket.
  const unarchiveGoal = async (): Promise<{ error: string | null }> => {
    if (!goal) return { error: "No goal loaded" };
    const restoredStatus: "active" | "completed" =
      goal.current_amount >= goal.target_amount ? "completed" : "active";
    const { data, error: unarchiveError } = await supabase
      .from("goals")
      .update({ status: restoredStatus })
      .eq("id", goal.id)
      .select()
      .single();
    if (unarchiveError) return { error: unarchiveError.message };
    setGoal(data as Goal);
    return { error: null };
  };

  return {
    goal,
    isLoading,
    error,
    refetch: fetchGoal,
    updateGoal,
    archiveGoal,
    unarchiveGoal,
  };
}
