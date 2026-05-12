"use client";

import { useState, useEffect, useCallback } from "react";
import { endOfMonth, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { computeTotals, toSignedAmount } from "@/lib/transactions/utils";
import { invalidateMonthTotal } from "./use-month-total";
import type {
  TransactionWithCategory,
  TransactionFormData,
} from "@/types/database";

const supabase = createClient();

export const FUTURE_DATE_ERROR =
  "Future months are managed by Recurring (coming soon)";

export type DateRange = {
  from: string;
  to: string;
};

function isInRange(date: string, range?: DateRange): boolean {
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

// Defense-in-depth: even if the form somehow lets a future-month date through,
// the data layer rejects it before hitting Supabase. Comparison is lexicographic
// on yyyy-MM-dd, which is correct because both sides are zero-padded ISO dates.
function isFutureMonth(date: string): boolean {
  const todayEom = format(endOfMonth(new Date()), "yyyy-MM-dd");
  return date > todayEom;
}

// Extract { year, month } from a yyyy-MM-dd string. Cheaper than parsing into
// a Date and respects the literal calendar month rather than a timezone-shifted
// one. Used to invalidate adjacent-month preview caches after mutations.
function monthOf(date: string): { year: number; month: number } {
  const [y, m] = date.split("-");
  return { year: Number(y), month: Number(m) };
}

export function useTransactions(range?: DateRange) {
  const { user, household } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Destructure so the useCallback dep array can react to range edges
  // without re-running on every parent render that creates a new object.
  const from = range?.from;
  const to = range?.to;

  const fetchTransactions = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    let query = supabase
      .from("transactions")
      .select(
        `
        *,
        category:categories(*),
        payment_method:payment_methods(*)
      `,
      )
      .eq("household_id", household.id)
      .is("deleted_at", null);

    if (from && to) {
      query = query.gte("transaction_date", from).lte("transaction_date", to);
    }

    const { data, error: fetchError } = await query
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTransactions(data || []);
    }

    setIsLoading(false);
  }, [household?.id, from, to]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const activeRange: DateRange | undefined =
    from && to ? { from, to } : undefined;

  const addTransaction = async (formData: TransactionFormData) => {
    if (!household?.id || !user?.id) {
      throw new Error("No household or user");
    }

    if (isFutureMonth(formData.transaction_date)) {
      throw new Error(FUTURE_DATE_ERROR);
    }

    const { data, error: insertError } = await supabase
      .from("transactions")
      .insert({
        household_id: household.id,
        user_id: user.id,
        category_id: formData.category_id || null,
        // Payment method is expense-only — drop it for income even if the form happens to carry one.
        payment_method_id: formData.is_income
          ? null
          : formData.payment_method_id || null,
        amount: toSignedAmount(formData),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      })
      .select(
        `
        *,
        category:categories(*),
        payment_method:payment_methods(*)
      `,
      )
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Only show optimistically if the new row falls within the active range;
    // otherwise the user is viewing a different month and shouldn't see it.
    if (isInRange(data.transaction_date, activeRange)) {
      setTransactions((prev) => [data, ...prev]);
    }
    // Bust the preview cache for the affected month so any visible navigator
    // label re-fetches.
    const newMonth = monthOf(data.transaction_date);
    invalidateMonthTotal(household.id, newMonth.year, newMonth.month);
    return data;
  };

  const updateTransaction = async (
    id: string,
    formData: TransactionFormData,
  ) => {
    if (isFutureMonth(formData.transaction_date)) {
      throw new Error(FUTURE_DATE_ERROR);
    }

    // Capture the row's previous date before the update so we can invalidate
    // the old month too if the user moved the transaction across months.
    const previous = transactions.find((t) => t.id === id);

    const { data, error: updateError } = await supabase
      .from("transactions")
      .update({
        category_id: formData.category_id || null,
        payment_method_id: formData.is_income
          ? null
          : formData.payment_method_id || null,
        amount: toSignedAmount(formData),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      })
      .eq("id", id)
      .select(
        `
        *,
        category:categories(*),
        payment_method:payment_methods(*)
      `,
      )
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    setTransactions((prev) => {
      const inRange = isInRange(data.transaction_date, activeRange);
      const exists = prev.some((t) => t.id === id);
      if (inRange) {
        return exists ? prev.map((t) => (t.id === id ? data : t)) : [data, ...prev];
      }
      // Date moved out of the active range — drop it from view.
      return prev.filter((t) => t.id !== id);
    });

    if (household?.id) {
      const newMonth = monthOf(data.transaction_date);
      invalidateMonthTotal(household.id, newMonth.year, newMonth.month);
      if (previous && previous.transaction_date !== data.transaction_date) {
        const oldMonth = monthOf(previous.transaction_date);
        invalidateMonthTotal(household.id, oldMonth.year, oldMonth.month);
      }
    }
    return data;
  };

  const deleteTransaction = async (id: string) => {
    const previous = transactions.find((t) => t.id === id);

    // Soft delete
    const { error: deleteError } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (previous && household?.id) {
      const m = monthOf(previous.transaction_date);
      invalidateMonthTotal(household.id, m.year, m.month);
    }
  };

  const undoDelete = async (id: string) => {
    const { data, error: undoError } = await supabase
      .from("transactions")
      .update({ deleted_at: null })
      .eq("id", id)
      .select(
        `
        *,
        category:categories(*),
        payment_method:payment_methods(*)
      `,
      )
      .single();

    if (undoError) {
      throw new Error(undoError.message);
    }

    if (isInRange(data.transaction_date, activeRange)) {
      setTransactions((prev) => [data, ...prev]);
    }
    if (household?.id) {
      const m = monthOf(data.transaction_date);
      invalidateMonthTotal(household.id, m.year, m.month);
    }
    return data;
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce(
    (groups, transaction) => {
      const date = transaction.transaction_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {} as Record<string, TransactionWithCategory[]>,
  );

  const totals = computeTotals(transactions);

  return {
    transactions,
    groupedTransactions,
    totals,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    undoDelete,
    refetch: fetchTransactions,
  };
}
