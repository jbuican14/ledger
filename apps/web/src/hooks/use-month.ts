"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  format,
  parse,
  addMonths,
  subMonths,
  isValid,
} from "date-fns";

export type MonthRange = {
  from: string;
  to: string;
};

export type UseMonthReturn = {
  year: number;
  month: number;
  range: MonthRange;
  next: () => void;
  prev: () => void;
  goTo: (year: number, month: number) => void;
  today: () => void;
  isCurrent: boolean;
  canGoNext: boolean;
};

function parseMonthParam(
  param: string | null,
): { year: number; month: number } | null {
  if (!param) return null;
  const date = parse(param, "yyyy-MM", new Date());
  if (!isValid(date)) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function formatMonthParam(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "yyyy-MM");
}

export function getMonthRange(year: number, month: number): MonthRange {
  const date = new Date(year, month - 1, 1);
  return {
    from: format(startOfMonth(date), "yyyy-MM-dd"),
    to: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function useMonth(): UseMonthReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const parsed = parseMonthParam(searchParams.get("month"));
  // Clamp future months in URL back to the current real-world month so a
  // stale/hand-edited URL can never escape the "no future" rule.
  let year = parsed?.year ?? currentYear;
  let month = parsed?.month ?? currentMonth;
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    year = currentYear;
    month = currentMonth;
  }

  const isCurrent = year === currentYear && month === currentMonth;
  const canGoNext = !isCurrent;

  const setMonth = useCallback(
    (newYear: number, newMonth: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newYear === currentYear && newMonth === currentMonth) {
        params.delete("month");
      } else {
        params.set("month", formatMonthParam(newYear, newMonth));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams, currentYear, currentMonth],
  );

  const next = useCallback(() => {
    if (!canGoNext) return;
    const nextDate = addMonths(new Date(year, month - 1, 1), 1);
    setMonth(nextDate.getFullYear(), nextDate.getMonth() + 1);
  }, [year, month, canGoNext, setMonth]);

  const prev = useCallback(() => {
    const prevDate = subMonths(new Date(year, month - 1, 1), 1);
    setMonth(prevDate.getFullYear(), prevDate.getMonth() + 1);
  }, [year, month, setMonth]);

  const goTo = useCallback(
    (y: number, m: number) => {
      if (y > currentYear || (y === currentYear && m > currentMonth)) return;
      setMonth(y, m);
    },
    [setMonth, currentYear, currentMonth],
  );

  const today = useCallback(() => {
    setMonth(currentYear, currentMonth);
  }, [setMonth, currentYear, currentMonth]);

  const range = useMemo(() => getMonthRange(year, month), [year, month]);

  return {
    year,
    month,
    range,
    next,
    prev,
    goTo,
    today,
    isCurrent,
    canGoNext,
  };
}
