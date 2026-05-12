"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  RecurringTransactionFormData,
  RecurringTransactionWithCategory,
} from "@/types/database";

const supabase = createClient();

function toSignedAmount(rawAmount: string, isIncome: boolean): number {
  const n = Number.parseFloat(rawAmount);
  if (Number.isNaN(n) || n === 0) return 0;
  const positive = Math.abs(n);
  return isIncome ? positive : -positive;
}

export function useRecurringTransactions() {
  const { household } = useAuth();
  const [items, setItems] = useState<RecurringTransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*, category:categories(*)")
      .eq("household_id", household.id)
      .order("next_due_date", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data as RecurringTransactionWithCategory[]) ?? []);
    }

    setIsLoading(false);
  }, [household?.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addRecurring = async (
    formData: RecurringTransactionFormData,
  ): Promise<{ error: string | null }> => {
    if (!household?.id) return { error: "No household found" };

    const amount = toSignedAmount(formData.amount, formData.is_income);
    if (amount === 0) return { error: "Amount must be greater than 0" };

    const { error: insertError } = await supabase
      .from("recurring_transactions")
      .insert({
        household_id: household.id,
        category_id: formData.category_id || null,
        name: formData.name.trim(),
        amount,
        frequency: formData.frequency,
        next_due_date: formData.next_due_date,
      });

    if (insertError) return { error: insertError.message };

    await fetchItems();
    return { error: null };
  };

  const updateRecurring = async (
    id: string,
    formData: RecurringTransactionFormData,
  ): Promise<{ error: string | null }> => {
    const amount = toSignedAmount(formData.amount, formData.is_income);
    if (amount === 0) return { error: "Amount must be greater than 0" };

    const { error: updateError } = await supabase
      .from("recurring_transactions")
      .update({
        category_id: formData.category_id || null,
        name: formData.name.trim(),
        amount,
        frequency: formData.frequency,
        next_due_date: formData.next_due_date,
      })
      .eq("id", id);

    if (updateError) return { error: updateError.message };

    await fetchItems();
    return { error: null };
  };

  const deleteRecurring = async (
    id: string,
  ): Promise<{ error: string | null }> => {
    const { error: deleteError } = await supabase
      .from("recurring_transactions")
      .delete()
      .eq("id", id);

    if (deleteError) return { error: deleteError.message };

    setItems((prev) => prev.filter((r) => r.id !== id));
    return { error: null };
  };

  return {
    items,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    isLoading,
    error,
    refetch: fetchItems,
  };
}
