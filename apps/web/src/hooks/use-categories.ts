"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { Category } from "@/types/database";

export function useCategories() {
  const { household } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("*")
        .eq("household_id", household.id)
        .order("is_income", { ascending: true })
        .order("sort_order", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCategories(data || []);
      }

      setIsLoading(false);
    };

    fetchCategories();
  }, [household?.id]);

  const expenseCategories = categories.filter((c) => !c.is_income);
  const incomeCategories = categories.filter((c) => c.is_income);

  return {
    categories,
    expenseCategories,
    incomeCategories,
    isLoading,
    error,
  };
}
