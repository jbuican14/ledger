"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { computeTotals, toSignedAmount } from "@/lib/transactions/utils";
import type { TransactionWithCategory, TransactionFormData } from "@/types/database";

const supabase = createClient();

export function useTransactions() {
  const { user, household } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        category:categories(*),
        payment_method:payment_methods(*)
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
  }, [household?.id]);

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
        // Payment method is expense-only — drop it for income even if the form happens to carry one.
        payment_method_id: formData.is_income ? null : formData.payment_method_id || null,
        amount: toSignedAmount(formData),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      })
      .select(`
        *,
        category:categories(*),
        payment_method:payment_methods(*)
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
        payment_method_id: formData.is_income ? null : formData.payment_method_id || null,
        amount: toSignedAmount(formData),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      })
      .eq("id", id)
      .select(`
        *,
        category:categories(*),
        payment_method:payment_methods(*)
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
      .eq("id", id)

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
        category:categories(*),
        payment_method:payment_methods(*)
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
