"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrencySymbol } from "@/lib/currency";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import type { ContributionFormData } from "@/hooks/use-goal-contributions";
import type { GoalContribution } from "@/types/database";

type Props = {
  initialData?: GoalContribution | null;
  onSubmit: (data: ContributionFormData) => Promise<{ error: string | null }>;
  onDelete?: () => Promise<{ error: string | null }>;
  onClose: () => void;
};

// Single form covers Add and Edit (signed amount carries direction).
// Deposit is the celebrated path — selected by default — so logging
// a contribution is a one-tap flow once a value is typed.
export function ContributionForm({
  initialData,
  onSubmit,
  onDelete,
  onClose,
}: Props) {
  const { household } = useAuth();
  const currencySymbol = getCurrencySymbol(household?.currency ?? "GBP");

  const initialIsDeposit = !initialData || initialData.amount > 0;
  const [isDeposit, setIsDeposit] = useState(initialIsDeposit);
  const [amount, setAmount] = useState(
    initialData ? Math.abs(initialData.amount).toString() : "",
  );
  const [note, setNote] = useState(initialData?.note ?? "");
  const [date, setDate] = useState(
    initialData?.contributed_at ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const validateAmount = (v: string): string | null => {
    if (!v) return "Amount is required";
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return "Must be greater than 0";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ae = validateAmount(amount);
    setAmountError(ae);
    if (ae) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const parsed = Number.parseFloat(amount);
    const signed = isDeposit ? parsed : -parsed;
    const { error } = await onSubmit({
      amount: signed,
      note: note.trim() || null,
      contributed_at: date,
    });
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    const { error } = await onDelete();
    setIsDeleting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Direction toggle. Deposit visually dominates; withdraw is the
          quiet escape valve so users don't feel punished for life events. */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setIsDeposit(true)}
          aria-pressed={isDeposit}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors",
            isDeposit
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className="w-4 h-4" />
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setIsDeposit(false)}
          aria-pressed={!isDeposit}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors",
            !isDeposit
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Minus className="w-4 h-4" />
          Withdraw
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contribution-amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {currencySymbol}
          </span>
          <Input
            id="contribution-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="100.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            onBlur={() => setAmountError(validateAmount(amount))}
            aria-invalid={!!amountError}
            aria-describedby={amountError ? "contribution-amount-error" : undefined}
            className="pl-7"
            autoFocus={!initialData}
          />
        </div>
        {amountError && (
          <p id="contribution-amount-error" className="text-sm text-destructive">
            {amountError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contribution-note">Note (optional)</Label>
        <Input
          id="contribution-note"
          placeholder="Birthday money, bonus, etc."
          value={note}
          maxLength={120}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contribution-date">Date</Label>
        <Input
          id="contribution-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={format(new Date(), "yyyy-MM-dd")}
        />
      </div>

      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting
            ? "Saving…"
            : initialData
              ? "Save changes"
              : isDeposit
                ? "Add deposit"
                : "Record withdrawal"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {onDelete && initialData && (
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {isDeleting ? "Deleting…" : "Delete this entry"}
        </Button>
      )}
    </form>
  );
}
