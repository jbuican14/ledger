"use client";

import { useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMonth } from "@/hooks/use-month";
import { useMonthTotal } from "@/hooks/use-month-total";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactCurrency } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthYearPicker } from "./month-year-picker";

type AnchorPill = {
  year: number;
  month: number;
};

export function MonthNavigator() {
  const { year, month, goTo } = useMonth();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Anchored pair: previous-previous and previous month relative to the real
  // current month. These two never move.
  const { leftPills, currentPill } = useMemo(() => {
    const now = new Date();
    const realAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
    const left: AnchorPill[] = [-2, -1].map((offset) => {
      const d = addMonths(realAnchor, offset);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
    const current: AnchorPill = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
    return { leftPills: left, currentPill: current };
  }, []);

  // "Off-anchor" = the selected month sits outside the three anchored pills,
  // i.e. it was reached via the picker. In that case the right pill takes on
  // the selected label so the user can always see where they are.
  const selectedIsLeftAnchor = leftPills.some(
    (p) => p.year === year && p.month === month,
  );
  const selectedIsCurrent =
    year === currentPill.year && month === currentPill.month;
  const isOffAnchor = !selectedIsLeftAnchor && !selectedIsCurrent;

  const rightPill: AnchorPill = isOffAnchor
    ? { year, month }
    : currentPill;
  const rightPillIsSelected =
    rightPill.year === year && rightPill.month === month;

  return (
    <>
      {/* items-start so each anchor pill's column is free to grow downward
          with its preview label, without stretching the right pill vertically. */}
      <div className="flex items-start gap-2">
        {leftPills.map((pill) => {
          const isSelected = pill.year === year && pill.month === month;
          const date = new Date(pill.year, pill.month - 1, 1);
          return (
            <div
              key={`${pill.year}-${pill.month}`}
              className="flex-1 flex flex-col gap-1"
            >
              <button
                type="button"
                onClick={() => goTo(pill.year, pill.month)}
                aria-pressed={isSelected}
                className={cn(
                  pillBase,
                  "w-full flex-col gap-1",
                  pillState(isSelected),
                )}
              >
                <span className="leading-snug">{format(date, "MMM")}</span>
                <span className="text-[10px] font-normal opacity-60 leading-tight">
                  {pill.year}
                </span>
              </button>
              <MonthTotalLabel year={pill.year} month={pill.month} />
            </div>
          );
        })}

        <CurrentMonthPill
          pill={rightPill}
          isSelected={rightPillIsSelected}
          onSelect={() => goTo(rightPill.year, rightPill.month)}
          onOpenPicker={() => setPickerOpen(true)}
        />
      </div>

      <MonthYearPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedYear={year}
        selectedMonth={month}
        onSelect={(y, m) => goTo(y, m)}
      />
    </>
  );
}

/**
 * Tiny expense-total label rendered under each anchor pill — peripheral
 * context so the user can compare "did I spend more last month?" without
 * navigating. Loading state shows a thin skeleton so the layout doesn't
 * jump when totals resolve.
 */
function MonthTotalLabel({ year, month }: { year: number; month: number }) {
  const { household } = useAuth();
  const { expenses, isLoading } = useMonthTotal(year, month);

  if (isLoading) {
    return <Skeleton className="h-3 w-10 mx-auto rounded" />;
  }
  if (expenses == null) {
    return <span className="h-3" aria-hidden />;
  }
  return (
    <span
      className="text-[10px] text-muted-foreground text-center leading-tight tabular-nums"
      aria-label={`${expenses} spent`}
    >
      {formatCompactCurrency(expenses, household?.currency ?? "GBP")}
    </span>
  );
}

const pillBase =
  "flex items-center justify-center rounded-lg border min-h-[48px] px-4 py-1.5 text-sm font-medium transition-colors";

function pillState(isSelected: boolean) {
  return isSelected
    ? "bg-primary/10 text-primary border-primary underline underline-offset-4 decoration-2"
    : "bg-card text-muted-foreground border-input hover:bg-muted hover:text-foreground";
}

function CurrentMonthPill({
  pill,
  isSelected,
  onSelect,
  onOpenPicker,
}: {
  pill: AnchorPill;
  isSelected: boolean;
  onSelect: () => void;
  onOpenPicker: () => void;
}) {
  const label = format(new Date(pill.year, pill.month - 1, 1), "MMM yyyy");
  return (
    <div className="flex flex-[1.4]">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Jump to ${label}`}
        className={cn(
          pillBase,
          "flex-1 rounded-r-none border-r-0",
          pillState(isSelected),
        )}
      >
        <span>{label}</span>
      </button>
      <button
        type="button"
        onClick={onOpenPicker}
        aria-label="Open month picker"
        className={cn(pillBase, "rounded-l-none px-3", pillState(isSelected))}
      >
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}
