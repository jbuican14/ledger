"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Archive,
  Plus,
  Minus,
  PiggyBank,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon } from "@/components/categories/category-icon";
import { useAuth } from "@/lib/auth/auth-context";
import { useGoal } from "@/hooks/use-goals";
import { computeGoalPace } from "@/components/goals/goal-pace";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { goal, isLoading, error } = useGoal(params?.id);
  const { household } = useAuth();
  const currency = household?.currency ?? "GBP";

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl">
        <ListItemSkeleton />
        <div className="mt-6 h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl">
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to goals
        </Link>
        <EmptyState
          icon={PiggyBank}
          title="Goal not found"
          description={error ?? "This goal may have been archived or removed."}
          action={
            <Button onClick={() => router.push("/goals")}>Go to goals</Button>
          }
        />
      </div>
    );
  }

  const pace = computeGoalPace(
    goal.current_amount,
    goal.target_amount,
    goal.target_date,
  );
  const pct =
    goal.target_amount > 0
      ? (goal.current_amount / goal.target_amount) * 100
      : 0;
  const isComplete = goal.status === "completed" || pct >= 100;
  const isOver = goal.current_amount < 0;
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
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl">
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to goals
        </Link>

        {/* Header: icon + name + actions */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryIcon
              name={goal.icon}
              color="#0ea5e9"
              size={22}
              className="w-12 h-12 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{goal.name}</h1>
              {goal.status !== "active" && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
                  {goal.status}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" disabled aria-label="Edit (KAN-69)">
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" disabled aria-label="Archive (KAN-70)">
              <Archive className="w-3.5 h-3.5 mr-1" />
              Archive
            </Button>
          </div>
        </div>

        {/* Hero stat card */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-3xl font-bold">
              {formatCurrency(goal.current_amount)}
            </p>
            <p className="text-sm text-muted-foreground">
              of {formatCurrency(goal.target_amount)}
            </p>
          </div>

          <div
            className="h-3 bg-muted rounded-full overflow-hidden mb-3"
            role="progressbar"
            aria-valuenow={Math.max(0, Math.min(Math.round(pct), 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(pct)}% of target saved`}
          >
            <div
              className={`h-full ${barColor} transition-all rounded-full`}
              style={{ width: `${fillPct}%` }}
            />
          </div>

          <PaceLine
            pace={pace}
            isOver={isOver}
            overAmount={Math.abs(goal.current_amount)}
            formatCurrency={formatCurrency}
          />

          <div className="flex gap-2 mt-5">
            <Button disabled aria-label="Add money (KAN-68)" className="flex-1">
              <Plus className="w-4 h-4 mr-1" />
              Add money
            </Button>
            <Button
              variant="outline"
              disabled
              aria-label="Withdraw (KAN-68)"
              className="flex-1"
            >
              <Minus className="w-4 h-4 mr-1" />
              Withdraw
            </Button>
          </div>
        </div>

        {/* History section — populated by KAN-68/72 */}
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-semibold mb-3">History</h2>
          <EmptyState
            icon={Receipt}
            title="No contributions yet"
            description="Once you add money to this goal, your contributions and withdrawals will appear here."
          />
        </div>
      </div>
    </div>
  );
}

function PaceLine({
  pace,
  isOver,
  overAmount,
  formatCurrency,
}: {
  pace: ReturnType<typeof computeGoalPace>;
  isOver: boolean;
  overAmount: number;
  formatCurrency: (n: number) => string;
}) {
  if (isOver) {
    return (
      <p className="text-sm text-destructive">
        Over-withdrawn by {formatCurrency(overAmount)}
      </p>
    );
  }
  switch (pace.kind) {
    case "reached":
      return (
        <p className="text-sm text-blue-600 font-medium">
          🎉 Target reached — nice work.
        </p>
      );
    case "no-date":
      return (
        <p className="text-sm text-muted-foreground">
          {formatCurrency(pace.remaining)} to go
        </p>
      );
    case "overdue":
      return (
        <p className="text-sm text-muted-foreground">
          {formatCurrency(pace.remaining)} to go · target date{" "}
          {format(pace.targetDate, "d MMM yyyy")} has passed
        </p>
      );
    case "on-pace":
      return (
        <p className="text-sm text-muted-foreground">
          {formatCurrency(pace.remaining)} to go · save{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(pace.perMonth)}/mo
          </span>{" "}
          to hit {format(pace.targetDate, "MMM yyyy")}
        </p>
      );
  }
}
