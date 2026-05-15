"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { useGoals } from "@/hooks/use-goals";
import { useAuth } from "@/lib/auth/auth-context";

const VISIBLE_LIMIT = 3;

// Dashboard widget surfacing up to 3 active goals at a glance. Reads the
// same useGoals data the /goals page uses — small dataset, one extra
// fetch is fine. Rows are intentionally compact so the widget doesn't
// dominate a dashboard that already has Budget, Recent, and Categories.
export function GoalsWidget() {
  const { activeGoals, isLoading } = useGoals();
  const { household } = useAuth();
  const currency = household?.currency ?? "GBP";

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="h-5 w-24 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  // Empty state: a quiet "no goals yet" CTA rather than hiding entirely.
  // Hiding teaches users the feature doesn't exist; surfacing it teaches
  // them it does.
  if (activeGoals.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <h2 className="font-semibold mb-1">Savings goals</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Set a target you&apos;re saving towards — we&apos;ll track your
          progress.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/goals">
            <Target className="w-3.5 h-3.5 mr-1" />
            Create your first goal
          </Link>
        </Button>
      </div>
    );
  }

  const visible = activeGoals.slice(0, VISIBLE_LIMIT);
  const hiddenCount = activeGoals.length - visible.length;

  return (
    <div className="bg-card border rounded-lg">
      <div className="flex items-center justify-between p-4 pb-3">
        <h2 className="font-semibold">Savings goals</h2>
        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground">
            Showing {VISIBLE_LIMIT} of {activeGoals.length}
          </span>
        )}
      </div>
      <ul className="divide-y">
        {visible.map((goal) => {
          const pct =
            goal.target_amount > 0
              ? (goal.current_amount / goal.target_amount) * 100
              : 0;
          const isOver = goal.current_amount < 0;
          const isComplete = goal.current_amount >= goal.target_amount;
          const isWarn = !isComplete && pct >= 80;
          const barColor = isOver
            ? "bg-destructive"
            : isComplete
              ? "bg-blue-500"
              : isWarn
                ? "bg-amber-500"
                : "bg-green-600";
          const fillPct = isOver ? 0 : Math.min(pct, 100);

          return (
            <li key={goal.id}>
              <Link
                href={`/goals/${goal.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <CategoryIcon
                  name={goal.icon}
                  color="#0ea5e9"
                  size={16}
                  className="w-8 h-8 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium truncate">{goal.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {formatCurrency(goal.current_amount)} /{" "}
                      {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                  <div
                    className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.max(
                      0,
                      Math.min(Math.round(pct), 100),
                    )}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.name}: ${Math.round(pct)}% saved`}
                  >
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/goals"
        className="flex items-center justify-center gap-1 p-3 text-sm text-primary hover:bg-muted/50 border-t transition-colors rounded-b-lg"
      >
        See all goals
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
