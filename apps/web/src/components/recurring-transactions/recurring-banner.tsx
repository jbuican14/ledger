"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRecurringTransactions } from "@/hooks/use-recurring-transactions";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

interface RecurringBannerProps {
  year: number;
  month: number;
  // Called after a successful quick-add so the parent can refetch dependent
  // data (transactions list, month totals on the navigator, etc.).
  onAdded?: () => void;
}

function formatAmount(amount: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

export function RecurringBanner({ year, month, onAdded }: RecurringBannerProps) {
  const { household } = useAuth();
  const { dueInMonth, quickAdd, isLoading } = useRecurringTransactions();
  const { showToast } = useToast();
  const currency = household?.currency ?? "GBP";

  // Items due in the currently-viewed month. Memoize on identity of the
  // filtered slice so the checkbox state below stays stable across renders
  // that don't actually change the set.
  const due = useMemo(() => dueInMonth(year, month), [dueInMonth, year, month]);

  // selectedIds defaults to "all" — most users will want to add everything
  // due this month; opting out is a quick uncheck.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(due.map((r) => r.id)),
  );
  const [dismissed, setDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When the underlying set changes (month nav, after add), re-sync defaults.
  // Reset dismissed too so adding an item later in the same month resurrects
  // the banner.
  const dueKey = due.map((r) => r.id).join(",");
  useMemoCompareReset(dueKey, () => {
    setSelectedIds(new Set(due.map((r) => r.id)));
    setDismissed(false);
  });

  if (isLoading || dismissed) return null;
  if (due.length === 0) return null;

  const selectedItems = due.filter((r) => selectedIds.has(r.id));
  const selectedTotal = selectedItems.reduce(
    (sum, r) => sum + Math.abs(r.amount),
    0,
  );

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM");

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedItems.length === 0) return;
    setIsSubmitting(true);
    const { added, failed, firstError } = await quickAdd(selectedItems);
    setIsSubmitting(false);

    if (added > 0) {
      showToast(
        added === 1
          ? `Added 1 recurring item`
          : `Added ${added} recurring items`,
        "success",
      );
      onAdded?.();
    }
    if (failed > 0 && firstError) {
      showToast(firstError, "error");
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">
            {monthLabel} recurring{" "}
            <span className="text-muted-foreground font-normal">
              · {due.length} {due.length === 1 ? "item" : "items"} due
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss recurring banner"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="space-y-1 mb-4">
        {due.map((item) => {
          const checked = selectedIds.has(item.id);
          const isIncome = item.amount > 0;
          return (
            <li key={item.id}>
              <label
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 cursor-pointer select-none",
                  "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                  />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      due {format(parseISO(item.next_due_date), "d MMM")}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    isIncome ? "text-emerald-600" : "text-foreground",
                  )}
                >
                  {isIncome ? "+" : "−"}
                  {formatAmount(Math.abs(item.amount), currency)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <Button
          onClick={handleAdd}
          disabled={selectedItems.length === 0 || isSubmitting}
          className="flex-1"
        >
          {isSubmitting
            ? "Adding…"
            : `Add ${selectedItems.length || ""} (${formatAmount(selectedTotal, currency)})`}
        </Button>
        <Button
          variant="outline"
          onClick={() => setDismissed(true)}
          disabled={isSubmitting}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

// Run `fn` when `value` changes between renders. Used to re-sync the
// default-checked state when the month nav changes or after quick-add
// shrinks the due-set.
function useMemoCompareReset(value: string, fn: () => void) {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      fn();
    }
    // fn intentionally not in deps — we only want to react to `value` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
