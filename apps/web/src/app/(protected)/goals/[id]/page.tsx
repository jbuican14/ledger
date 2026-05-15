"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useParams,
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Archive,
  ArchiveRestore,
  Plus,
  Minus,
  PiggyBank,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon } from "@/components/categories/category-icon";
import { useAuth } from "@/lib/auth/auth-context";
import { useGoal } from "@/hooks/use-goals";
import { useGoalContributions } from "@/hooks/use-goal-contributions";
import { computeGoalPace } from "@/components/goals/goal-pace";
import { ContributionForm } from "@/components/goals/contribution-form";
import { ContributionHistory } from "@/components/goals/contribution-history";
import { GoalForm } from "@/components/goals/goal-form";
import type { GoalContribution } from "@/types/database";

type SheetMode =
  | { kind: "closed" }
  | { kind: "add"; defaultDirection: "deposit" | "withdraw" }
  | { kind: "edit"; contribution: GoalContribution }
  | { kind: "edit-goal" };

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    goal,
    isLoading,
    error,
    refetch: refetchGoal,
    updateGoal,
    archiveGoal,
    unarchiveGoal,
  } = useGoal(params?.id);
  const {
    contributions,
    isLoading: contribsLoading,
    addContribution,
    updateContribution,
    deleteContribution,
  } = useGoalContributions(params?.id);
  const { household } = useAuth();
  const { showToast } = useToast();
  const currency = household?.currency ?? "GBP";

  const [sheet, setSheet] = useState<SheetMode>({ kind: "closed" });
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  // ?add=1 deep-link from the +Add button on goal cards. Open the sheet
  // once on mount, then strip the param so a refresh doesn't re-trigger.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    if (searchParams?.get("add") === "1") {
      setSheet({ kind: "add", defaultDirection: "deposit" });
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const closeSheet = () => setSheet({ kind: "closed" });
  const openAdd = (defaultDirection: "deposit" | "withdraw") =>
    setSheet({ kind: "add", defaultDirection });
  const openEdit = (contribution: GoalContribution) =>
    setSheet({ kind: "edit", contribution });

  const handleDelete = async (c: GoalContribution) => {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    const { error: err } = await deleteContribution(c.id);
    if (err) {
      showToast(err, "error");
      return;
    }
    await refetchGoal();
    showToast("Entry deleted", "success");
  };

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

        {/* Header */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSheet({ kind: "edit-goal" })}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
            {goal.status === "archived" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setArchiveBusy(true);
                  const { error: err } = await unarchiveGoal();
                  setArchiveBusy(false);
                  if (err) {
                    showToast(err, "error");
                  } else {
                    showToast("Goal restored", "success");
                  }
                }}
                disabled={archiveBusy}
              >
                <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
                {archiveBusy ? "Restoring…" : "Restore"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveDialog(true)}
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                Archive
              </Button>
            )}
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
            <Button onClick={() => openAdd("deposit")} className="flex-1">
              <Plus className="w-4 h-4 mr-1" />
              Add money
            </Button>
            <Button
              variant="outline"
              onClick={() => openAdd("withdraw")}
              className="flex-1"
            >
              <Minus className="w-4 h-4 mr-1" />
              Withdraw
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-semibold mb-3">History</h2>
          <ContributionHistory
            contributions={contributions}
            isLoading={contribsLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <Sheet
        open={sheet.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {sheet.kind === "edit-goal"
                ? "Edit goal"
                : sheet.kind === "edit"
                  ? "Edit entry"
                  : "New contribution"}
            </SheetTitle>
            <SheetDescription>
              {sheet.kind === "edit-goal"
                ? "Adjust the name, target, target date, or icon."
                : sheet.kind === "edit"
                  ? "Update the amount, note, or date — the goal total will recalculate."
                  : sheet.kind === "add" && sheet.defaultDirection === "withdraw"
                    ? "Pulling money out is fine — we'll keep the history straight."
                    : "Log what you've saved towards this goal."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {sheet.kind === "edit-goal" && (
              <GoalForm
                initialData={goal}
                onSubmit={async (data) => {
                  const result = await updateGoal(data);
                  if (result.error) return result;
                  showToast("Goal updated", "success");
                  return { error: null };
                }}
                onClose={closeSheet}
              />
            )}
            {(sheet.kind === "add" || sheet.kind === "edit") && (
              <ContributionForm
                initialData={
                  sheet.kind === "edit" ? sheet.contribution : null
                }
                defaultDirection={
                  sheet.kind === "add" ? sheet.defaultDirection : "deposit"
                }
                onSubmit={async (data) => {
                  const result =
                    sheet.kind === "edit"
                      ? await updateContribution(sheet.contribution.id, data)
                      : await addContribution(data);
                  if (result.error) return { error: result.error };
                  await refetchGoal();
                  showToast(
                    sheet.kind === "edit"
                      ? "Entry updated"
                      : data.amount > 0
                        ? `${formatCurrency(data.amount)} added`
                        : `${formatCurrency(Math.abs(data.amount))} withdrawn`,
                    "success",
                  );
                  return { error: null };
                }}
                onDelete={
                  sheet.kind === "edit"
                    ? async () => {
                        const { error: err } = await deleteContribution(
                          sheet.contribution.id,
                        );
                        if (err) return { error: err };
                        await refetchGoal();
                        showToast("Entry deleted", "success");
                        return { error: null };
                      }
                    : undefined
                }
                onClose={closeSheet}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={showArchiveDialog}
        onOpenChange={(open) => {
          if (!archiveBusy) setShowArchiveDialog(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Archive &quot;{goal.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be hidden from your active list and dashboard. History
            stays intact — you can restore it any time from{" "}
            <span className="font-medium">Goals → Show archived</span>.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={archiveBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setArchiveBusy(true);
                const { error: err } = await archiveGoal();
                setArchiveBusy(false);
                setShowArchiveDialog(false);
                if (err) {
                  showToast(err, "error");
                } else {
                  showToast("Goal archived", "success");
                }
              }}
              disabled={archiveBusy}
            >
              {archiveBusy ? "Archiving…" : "Archive goal"}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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
