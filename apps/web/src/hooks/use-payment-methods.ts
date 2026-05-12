"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { PaymentMethod } from "@/types/database";

const supabase = createClient();

export type PaymentMethodFormData = {
  name: string;
};

export function usePaymentMethods() {
  const { household } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("household_id", household.id)
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPaymentMethods(data || []);
    }

    setIsLoading(false);
  }, [household?.id]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = async (
    formData: PaymentMethodFormData,
  ): Promise<{ error: string | null }> => {
    if (!household?.id) return { error: "No household found" };

    const maxOrder = paymentMethods.reduce(
      (max, p) => Math.max(max, p.sort_order),
      0,
    );

    const { error: insertError } = await supabase
      .from("payment_methods")
      .insert({
        household_id: household.id,
        name: formData.name.trim(),
        sort_order: maxOrder + 1,
      });

    if (insertError) return { error: insertError.message };

    await fetchPaymentMethods();
    return { error: null };
  };

  const deletePaymentMethod = async (
    id: string,
  ): Promise<{ error: string | null }> => {
    const { error: deleteError } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);

    if (deleteError) return { error: deleteError.message };

    setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
    return { error: null };
  };

  return {
    paymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    isLoading,
    error,
  };
}
