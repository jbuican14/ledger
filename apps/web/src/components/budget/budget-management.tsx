"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useBudget } from "@/hooks/use-budget";
import { useAuth } from "@/lib/auth/auth-context";
import { getCurrencySymbol } from "@/lib/currency";

// Settings card for the household's monthly budget. Operates on the current
// calendar month — per-month historical edits will arrive via the dashboard
// nudge in KAN-60 once the widget exists to surface them.
export function BudgetManagement() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { budget, setAmount, clearBudget, isLoading } = useBudget(year, month);
  const { household } = useAuth();
  const { showToast } = useToast();
  const currency = household?.currency ?? "GBP";
  const currencySymbol = getCurrencySymbol(currency);

  const [value, setValue] = useState("");
  const [valueError, setValueError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Re-seed the input when the loaded budget changes (e.g. first fetch or
  // after clear). Empty string when no budget yet so the placeholder shows.
  useEffect(() => {
    setValue(budget ? String(budget.amount) : "");
  }, [budget]);

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const isDirty = value !== (budget ? String(budget.amount) : "");

  const validate = (raw: string): string | null => {
    if (!raw.trim()) return "Budget is required";
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return "Enter a valid number";
    if (n < 0) return "Budget cannot be negative";
    return null;
  };

  const handleSave = async () => {
    const err = validate(value);
    if (err) {
      setValueError(err);
      return;
    }
    setValueError(null);
    setIsSaving(true);
    const { error } = await setAmount(Number.parseFloat(value));
    setIsSaving(false);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`Budget for ${monthLabel} saved`, "success");
    }
  };

  const handleClear = async () => {
    if (!budget) return;
    setIsSaving(true);
    const { error } = await clearBudget();
    setIsSaving(false);
    if (error) showToast(error, "error");
    else showToast(`Budget for ${monthLabel} cleared`, "success");
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-semibold">Monthly budget</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Spending target for {monthLabel}. We&apos;ll show what&apos;s left on the
          dashboard.
        </p>
      </div>

      {isLoading ? (
        <ListItemSkeleton />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="budget-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (valueError) setValueError(null);
                }}
                onBlur={() => setValueError(validate(value))}
                aria-invalid={!!valueError}
                aria-describedby={valueError ? "budget-error" : undefined}
                className="pl-7"
              />
            </div>
            {valueError && (
              <p id="budget-error" className="text-sm text-destructive">
                {valueError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              size="sm"
            >
              {isSaving ? "Saving…" : budget ? "Update budget" : "Set budget"}
            </Button>
            {budget && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isSaving}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
