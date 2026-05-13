"use client";

import { useState, useEffect, useCallback } from "react";
import { addWeeks, addMonths, addYears, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { invalidateMonthTotal } from "./use-month-total";
import type {
  RecurringFrequency,
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

// Advance an ISO yyyy-MM-dd date by one frequency unit. Used after quick-add
// so the recurring rule's next_due_date moves to the next occurrence.
export function advanceDueDate(
  isoDate: string,
  frequency: RecurringFrequency,
): string {
  const d = parseISO(isoDate);
  const next =
    frequency === "weekly"
      ? addWeeks(d, 1)
      : frequency === "yearly"
        ? addYears(d, 1)
        : addMonths(d, 1);
  return format(next, "yyyy-MM-dd");
}

export function useRecurringTransactions() {
  const { household, user } = useAuth();
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

  // Items whose next_due_date falls in the given calendar month (1-indexed).
  // Memoization isn't worthwhile here — the filter is cheap and the input
  // list is small (a household's recurring rules, typically <20).
  const dueInMonth = (
    year: number,
    month: number,
  ): RecurringTransactionWithCategory[] => {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    return items.filter((r) => r.next_due_date.startsWith(prefix));
  };

  // Convert selected recurring rules into real transactions. Per spec: the
  // transaction date is the rule's current next_due_date; after success we
  // advance next_due_date by the frequency. Each item is its own DB round-trip
  // — atomic per-item, partial success is acceptable (any failure surfaces
  // and the user can retry; advanced rules don't roll back).
  const quickAdd = async (
    selected: RecurringTransactionWithCategory[],
  ): Promise<{ added: number; failed: number; firstError: string | null }> => {
    if (!household?.id || !user?.id) {
      return {
        added: 0,
        failed: selected.length,
        firstError: "No household or user",
      };
    }

    let added = 0;
    let failed = 0;
    let firstError: string | null = null;
    const monthsToInvalidate = new Set<string>();

    for (const item of selected) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          household_id: household.id,
          user_id: user.id,
          category_id: item.category_id,
          payment_method_id: null,
          amount: item.amount,
          description: item.name,
          transaction_date: item.next_due_date,
        });

      if (insertError) {
        failed += 1;
        firstError = firstError ?? insertError.message;
        continue;
      }

      const nextDue = advanceDueDate(item.next_due_date, item.frequency);
      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update({ next_due_date: nextDue })
        .eq("id", item.id);

      if (updateError) {
        // The transaction was created but the rule didn't advance. Surface
        // the error; on next render the banner will still show this item
        // (with same next_due_date) which is correct — user can retry.
        failed += 1;
        firstError = firstError ?? updateError.message;
        continue;
      }

      added += 1;
      const [y, m] = item.next_due_date.split("-");
      monthsToInvalidate.add(`${y}:${m}`);
    }

    // Invalidate month-total caches for any month we touched so navigator
    // labels re-fetch.
    monthsToInvalidate.forEach((key) => {
      const [y, m] = key.split(":");
      invalidateMonthTotal(household.id, Number(y), Number(m));
    });

    await fetchItems();
    return { added, failed, firstError };
  };

  return {
    items,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    dueInMonth,
    quickAdd,
    isLoading,
    error,
    refetch: fetchItems,
  };
}
