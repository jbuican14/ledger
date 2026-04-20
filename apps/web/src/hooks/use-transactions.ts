"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { TransactionWithCategory, TransactionFormData } from "@/types/database";

export function useTransactions() {
  const { user, household } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTransactions = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("transactions")
      .select(`
        *,
        category:categories(*)
      `)
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTransactions(data || []);
    }

    setIsLoading(false);
  }, [household?.id, supabase]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (formData: TransactionFormData) => {
    if (!household?.id || !user?.id) {
      throw new Error("No household or user");
    }

    const { data, error: insertError } = await supabase
      .from("transactions")
      .insert({
        household_id: household.id,
        user_id: user.id,
        category_id: formData.category_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
        is_income: formData.is_income,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    setTransactions((prev) => [data, ...prev]);
    return data;
  };

  const updateTransaction = async (id: string, formData: TransactionFormData) => {
    const { data, error: updateError } = await supabase
      .from("transactions")
      .update({
        category_id: formData.category_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
        is_income: formData.is_income,
      })
      .eq("id", id)
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? data : t))
    );
    return data;
  };

  const deleteTransaction = async (id: string) => {
    // Soft delete
    const { error: deleteError } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const undoDelete = async (id: string) => {
    const { data, error: undoError } = await supabase
      .from("transactions")
      .update({ deleted_at: null })
      .eq("id", id)
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (undoError) {
      throw new Error(undoError.message);
    }

    setTransactions((prev) => [data, ...prev]);
    return data;
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.transaction_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, TransactionWithCategory[]>);

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.is_income) {
        acc.income += t.amount;
      } else {
        acc.expenses += t.amount;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

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
