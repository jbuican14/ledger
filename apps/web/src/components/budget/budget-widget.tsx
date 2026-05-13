"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/hooks/use-budget";
import { useAuth } from "@/lib/auth/auth-context";

type Props = {
  year: number;
  month: number;
  spent: number;
};

// Dashboard tile that surfaces budget progress for the active month. Three
// visual states: loading skeleton, empty (no budget yet → CTA to settings),
// and progress (bar coloured by % used — amber at 80%, red at 100%).
export function BudgetWidget({ year, month, spent }: Props) {
  const { budget, isLoading } = useBudget(year, month);
  const { household } = useAuth();
  const currency = household?.currency ?? "GBP";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-32 bg-muted animate-pulse rounded mt-2" />
        <div className="h-3 w-20 bg-muted animate-pulse rounded mt-2" />
      </div>
    );
  }

  if (!budget) {
    const monthLabel = format(new Date(year, month - 1, 1), "MMMM");
    return (
      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Budget</p>
        <p className="text-2xl font-bold mt-1">Not set</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Set a target for {monthLabel} to see what&apos;s left.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/settings">Set a budget</Link>
        </Button>
      </div>
    );
  }

  const remaining = budget.amount - spent;
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOver = remaining < 0;
  const isWarning = percentUsed >= 80 && !isOver;

  const barColor = isOver
    ? "bg-destructive"
    : isWarning
      ? "bg-amber-500"
      : "bg-green-600";
  const textColor = isOver
    ? "text-destructive"
    : isWarning
      ? "text-amber-600"
      : "text-green-600";

  return (
    <div className="bg-card border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">
        {isOver ? "Over budget" : "Budget remaining"}
      </p>
      <p className={`text-2xl font-bold ${textColor}`}>
        {formatCurrency(Math.abs(remaining))}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatCurrency(spent)} of {formatCurrency(budget.amount)} spent
      </p>
      <div
        className="h-2 bg-muted rounded-full mt-3 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.min(percentUsed, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(percentUsed)}% of budget used`}
      >
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
    </div>
  );
}
