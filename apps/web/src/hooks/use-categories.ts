"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { Category, CategoryType } from "@/types/database";

const supabase = createClient();

export type CategoryFormData = {
  name: string;
  type: CategoryType;
  color: string;
  icon?: string | null;
};

export function useCategories() {
  const { household } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .eq("household_id", household.id)
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCategories(data || []);
    }

    setIsLoading(false);
  }, [household?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (formData: CategoryFormData): Promise<{ error: string | null }> => {
    if (!household?.id) return { error: "No household found" };

    const maxOrder = categories
      .filter((c) => c.type === formData.type)
      .reduce((max, c) => Math.max(max, c.sort_order), 0);

    const { error: insertError } = await supabase.from("categories").insert({
      household_id: household.id,
      name: formData.name.trim(),
      type: formData.type,
      color: formData.color,
      icon: formData.icon ?? null,
      sort_order: maxOrder + 1,
    });

    if (insertError) return { error: insertError.message };

    await fetchCategories();
    return { error: null };
  };

  const deleteCategory = async (id: string): Promise<{ error: string | null }> => {
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) return { error: deleteError.message };

    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { error: null };
  };

  // Count how many transactions and recurring rules still reference this
  // category. Used to warn the user before delete cascades them all to NULL.
  const getCategoryUsage = async (
    id: string,
  ): Promise<{ transactions: number; recurring: number; error: string | null }> => {
    const [txRes, recRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("category_id", id)
        .is("deleted_at", null),
      supabase
        .from("recurring_transactions")
        .select("*", { count: "exact", head: true })
        .eq("category_id", id),
    ]);
    if (txRes.error) return { transactions: 0, recurring: 0, error: txRes.error.message };
    if (recRes.error) return { transactions: 0, recurring: 0, error: recRes.error.message };
    return {
      transactions: txRes.count ?? 0,
      recurring: recRes.count ?? 0,
      error: null,
    };
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return {
    categories,
    expenseCategories,
    incomeCategories,
    addCategory,
    deleteCategory,
    getCategoryUsage,
    isLoading,
    error,
  };
}

