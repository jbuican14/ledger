"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Repeat, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useRecurringTransactions } from "@/hooks/use-recurring-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/lib/auth/auth-context";
import { RecurringTransactionForm } from "./recurring-transaction-form";
import type {
  RecurringTransactionFormData,
  RecurringTransactionWithCategory,
} from "@/types/database";

function formatAmount(amount: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

export function RecurringTransactionManagement() {
  const {
    items,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    isLoading,
    error: fetchError,
  } = useRecurringTransactions();
  const { categories } = useCategories();
  const { household } = useAuth();
  const { showToast } = useToast();
  const currency = household?.currency ?? "GBP";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<RecurringTransactionWithCategory | null>(null);

  const openAdd = () => {
    setEditingItem(null);
    setSheetOpen(true);
  };

  const openEdit = (item: RecurringTransactionWithCategory) => {
    setEditingItem(item);
    setSheetOpen(true);
  };

  const handleSubmit = async (data: RecurringTransactionFormData) => {
    const result = editingItem
      ? await updateRecurring(editingItem.id, data)
      : await addRecurring(data);
    if (!result.error) {
      showToast(
        editingItem
          ? `"${data.name.trim()}" updated`
          : `"${data.name.trim()}" added`,
        "success",
      );
    }
    return result;
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    const { error } = await deleteRecurring(editingItem.id);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${editingItem.name}" deleted`, "success");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Recurring</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bills and income that repeat each week, month, or year.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : fetchError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive font-medium mb-1">
            Couldn&apos;t load recurring items
          </p>
          <p className="text-muted-foreground">{fetchError}</p>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recurring items yet. Add bills like Rent or subscriptions like
          Netflix to see them in next month&apos;s banner.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const isIncome = item.amount > 0;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-label={`Edit ${item.name}`}
                >
                  <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.frequency} · next{" "}
                      {format(parseISO(item.next_due_date), "d MMM yyyy")}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={
                      isIncome
                        ? "text-sm font-medium text-emerald-600 tabular-nums"
                        : "text-sm font-medium tabular-nums"
                    }
                  >
                    {isIncome ? "+" : "−"}
                    {formatAmount(Math.abs(item.amount), currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    aria-label={`Edit ${item.name}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="pb-safe max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>
              {editingItem ? "Edit recurring" : "New recurring"}
            </SheetTitle>
            <SheetDescription>
              {editingItem
                ? "Update this recurring rule."
                : "A bill or income that repeats on a schedule."}
            </SheetDescription>
          </SheetHeader>

          <RecurringTransactionForm
            categories={categories}
            initialData={editingItem}
            onSubmit={handleSubmit}
            onDelete={editingItem ? handleDelete : undefined}
            onClose={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
