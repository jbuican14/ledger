"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { getMonthRange } from "./use-month";

const supabase = createClient();

type MonthTotals = { expenses: number; income: number };

// Module-level cache so adjacent navigator pills can share a single fetch and
// totals survive across page-internal re-renders. Keyed by household + ISO
// month so different households never collide. Cleared by page refresh.
const cache = new Map<string, MonthTotals>();

// Per-key subscriber set: each useMonthTotal call subscribes only to its own
// (household, year, month). Invalidating month A doesn't force month B to
// re-fetch — important once we extend previews beyond the two anchor pills.
const subscribers = new Map<string, Set<() => void>>();

function cacheKey(householdId: string, year: number, month: number): string {
  return `${householdId}:${year}-${String(month).padStart(2, "0")}`;
}

function notify(key: string): void {
  subscribers.get(key)?.forEach((fn) => fn());
}

export function invalidateMonthTotal(
  householdId: string,
  year: number,
  month: number,
): void {
  const key = cacheKey(householdId, year, month);
  cache.delete(key);
  notify(key);
}

// Test helper — keep cache state from leaking across `it` blocks.
export function __clearMonthTotalsCache(): void {
  cache.clear();
  subscribers.forEach((set) => set.forEach((fn) => fn()));
}

export type UseMonthTotalReturn = {
  expenses: number | null;
  income: number | null;
  isLoading: boolean;
};

export function useMonthTotal(
  year: number,
  month: number,
): UseMonthTotalReturn {
  const { household } = useAuth();
  const [data, setData] = useState<MonthTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Subscribe to this specific (household, year, month) so invalidations
  // trigger a re-fetch via the version bump.
  useEffect(() => {
    if (!household?.id) return;
    const key = cacheKey(household.id, year, month);
    const bump = () => setVersion((v) => v + 1);
    let set = subscribers.get(key);
    if (!set) {
      set = new Set();
      subscribers.set(key, set);
    }
    set.add(bump);
    return () => {
      set?.delete(bump);
      if (set?.size === 0) subscribers.delete(key);
    };
  }, [household?.id, year, month]);

  useEffect(() => {
    if (!household?.id) {
      setIsLoading(false);
      return;
    }

    const key = cacheKey(household.id, year, month);
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const range = getMonthRange(year, month);

    let cancelled = false;
    void (async () => {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("amount")
        .eq("household_id", household.id)
        .is("deleted_at", null)
        .gte("transaction_date", range.from)
        .lte("transaction_date", range.to);

      if (cancelled) return;
      if (error) {
        setIsLoading(false);
        return;
      }
      const totals: MonthTotals = (rows ?? []).reduce(
        (acc: MonthTotals, row: { amount: number }) => {
          if (row.amount < 0) acc.expenses += Math.abs(row.amount);
          else acc.income += row.amount;
          return acc;
        },
        { expenses: 0, income: 0 },
      );
      cache.set(key, totals);
      setData(totals);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [household?.id, year, month, version]);

  return {
    expenses: data?.expenses ?? null,
    income: data?.income ?? null,
    isLoading,
  };
}
