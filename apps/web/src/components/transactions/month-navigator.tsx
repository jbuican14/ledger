"use client";

import { useMemo } from "react";
import { addMonths, format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMonth } from "@/hooks/use-month";

type Pill = {
  year: number;
  month: number;
  isCurrent: boolean;
};

export function MonthNavigator() {
  const { year, month, goTo } = useMonth();

  // Pills are anchored to the real current month — they don't shift with
  // selection. The rightmost pill is always the current month and owns
  // the dropdown for jumping further back than two months.
  const pills = useMemo<Pill[]>(() => {
    const now = new Date();
    const realAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
    return [-2, -1, 0].map((offset) => {
      const d = addMonths(realAnchor, offset);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        isCurrent: offset === 0,
      };
    });
  }, []);

  return (
    <div className="flex items-stretch gap-2">
      {pills.map((pill) => {
        const isSelected = pill.year === year && pill.month === month;
        const date = new Date(pill.year, pill.month - 1, 1);
        const label = pill.isCurrent
          ? format(date, "MMM yyyy")
          : format(date, "MMM");

        return (
          <button
            key={`${pill.year}-${pill.month}`}
            type="button"
            onClick={() => goTo(pill.year, pill.month)}
            aria-pressed={isSelected}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border min-h-[44px] px-4 py-2 text-sm font-medium transition-colors",
              pill.isCurrent ? "flex-[1.4]" : "flex-1",
              isSelected
                ? "bg-primary/10 text-primary border-primary underline underline-offset-4 decoration-2"
                : "bg-card text-muted-foreground border-input hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{label}</span>
            {pill.isCurrent && (
              <ChevronDown
                className={cn(
                  "h-4 w-4",
                  isSelected ? "opacity-80" : "opacity-50",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
