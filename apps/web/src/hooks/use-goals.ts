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

  return { goal, isLoading, error, refetch: fetchGoal };
}
