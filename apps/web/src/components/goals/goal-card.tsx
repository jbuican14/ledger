"use client";

import { format, parseISO, differenceInDays } from "date-fns";
import { Plus, PiggyBank } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import type { Goal } from "@/types/database";

type Props = {
  goal: Goal;
  // onAddContribution: () => void;  // wired in KAN-68
  // onClick?: () => void;            // wired in KAN-67 (detail page)
};

// Generic goal display card used on the dashboard widget and the /goals
// list. Tappable target + inline +Add button arrive with KAN-67/68.
export function GoalCard({ goal }: Props) {
  const { household } = useAuth();
  const currency = household?.currency ?? "GBP";

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  const pct =
    goal.target_amount > 0
      ? (goal.current_amount / goal.target_amount) * 100
      : 0;
  const isComplete = goal.current_amount >= goal.target_amount;
  const isOverWithdrawn = goal.current_amount < 0;
  const isWarn = !isComplete && pct >= 80;

  const barColor = isOverWithdrawn
    ? "bg-destructive"
    : isComplete
      ? "bg-blue-500"
      : isWarn
        ? "bg-amber-500"
        : "bg-green-600";

  // Bar fill is clamped to 100; over-withdrawn shows an empty red bar.
  const fillPct = isOverWithdrawn ? 0 : Math.min(pct, 100);

  let dateLabel: string | null = null;
  if (goal.target_date) {
    const target = parseISO(goal.target_date);
    const days = differenceInDays(target, new Date());
    if (days < 0) {
      dateLabel = `Target was ${format(target, "d MMM yyyy")}`;
    } else {
      dateLabel = `by ${format(target, "MMM yyyy")} · ${days} day${days === 1 ? "" : "s"} left`;
    }
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <CategoryIcon
          name={goal.icon}
          color="#0ea5e9"
          size={18}
          className="w-10 h-10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{goal.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {formatCurrency(goal.current_amount)} of{" "}
            {formatCurrency(goal.target_amount)}
            {isComplete && " · Reached 🎉"}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled
          aria-label="Add contribution (coming in KAN-68)"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.max(0, Math.min(Math.round(pct), 100))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.name}: ${Math.round(pct)}% saved`}
      >
        <div
          className={`h-full ${barColor} transition-all rounded-full`}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>
          {isOverWithdrawn
            ? `Over-withdrawn by ${formatCurrency(Math.abs(goal.current_amount))}`
            : `${Math.round(pct)}% saved`}
        </span>
        {dateLabel && <span>{dateLabel}</span>}
      </div>
    </div>
  );
}

// Lighter default avatar when no icon is set on the goal. Mostly here to
// keep the import shape stable even though CategoryIcon already falls back.
export const DEFAULT_GOAL_ICON = PiggyBank;
