"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrencySymbol } from "@/lib/currency";
import { useAuth } from "@/lib/auth/auth-context";
import { CategoryIcon, ICON_MAP } from "@/components/categories/category-icon";
import { cn } from "@/lib/utils";
import type { GoalFormData } from "@/hooks/use-goals";
import type { Goal } from "@/types/database";

type Props = {
  onSubmit: (data: GoalFormData) => Promise<{ error: string | null }>;
  onClose: () => void;
  // Edit mode: when provided, all fields are pre-filled from the goal and
  // the submit label switches to "Save changes". The target_amount also
  // becomes constrained — it can't go below the goal's current_amount.
  initialData?: Goal | null;
  initialName?: string;
};

// Goal icons are reused from the existing CategoryIcon set. A small curated
// shortlist appears first so the picker doesn't overwhelm — full set still
// accessible by scrolling. The piggy-bank icon is the default.
const SUGGESTED_ICONS = [
  "piggy-bank",
  "plane",
  "home",
  "car",
  "gift",
  "gamepad-2",
  "dumbbell",
  "coffee",
];

export function GoalForm({
  onSubmit,
  onClose,
  initialData,
  initialName = "",
}: Props) {
  const { household } = useAuth();
  const currencySymbol = getCurrencySymbol(household?.currency ?? "GBP");

  const isEditing = !!initialData;
  const minAllowedTarget = initialData?.current_amount ?? 0;

  const [name, setName] = useState(initialData?.name ?? initialName);
  const [amount, setAmount] = useState(
    initialData ? initialData.target_amount.toString() : "",
  );
  const [targetDate, setTargetDate] = useState(initialData?.target_date ?? "");
  const [icon, setIcon] = useState<string>(initialData?.icon ?? "piggy-bank");
  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: household?.currency ?? "GBP",
    }).format(n);

  const validateName = (v: string): string | null =>
    v.trim() ? null : "Name is required";
  const validateAmount = (v: string): string | null => {
    if (!v) return "Target amount is required";
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return "Must be greater than 0";
    // Reducing the target below what's already saved would put the goal
    // straight into "completed" land, which isn't what the user wants
    // when they're nudging a number. Block it explicitly.
    if (isEditing && minAllowedTarget > 0 && n < minAllowedTarget) {
      return `Can't go below ${formatCurrency(minAllowedTarget)} already saved`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ne = validateName(name);
    const ae = validateAmount(amount);
    setNameError(ne);
    setAmountError(ae);
    if (ne || ae) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const { error } = await onSubmit({
      name,
      target_amount: Number.parseFloat(amount),
      target_date: targetDate || null,
      icon,
    });
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Name</Label>
        <Input
          id="goal-name"
          placeholder="e.g. Holiday in Greece"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          onBlur={() => setNameError(validateName(name))}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "goal-name-error" : undefined}
        />
        {nameError && (
          <p id="goal-name-error" className="text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-amount">Target amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {currencySymbol}
          </span>
          <Input
            id="goal-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="2000.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            onBlur={() => setAmountError(validateAmount(amount))}
            aria-invalid={!!amountError}
            aria-describedby={amountError ? "goal-amount-error" : undefined}
            className="pl-7"
          />
        </div>
        {amountError && (
          <p id="goal-amount-error" className="text-sm text-destructive">
            {amountError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-target-date">Target date (optional)</Label>
        <Input
          id="goal-target-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Icon</Label>
        <div className="grid grid-cols-8 gap-2">
          {SUGGESTED_ICONS.map((iconName) => {
            const selected = icon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                aria-label={`Choose ${iconName} icon`}
                aria-pressed={selected}
                onClick={() => setIcon(iconName)}
                className={cn(
                  "rounded-full p-0.5 transition-shadow",
                  selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <CategoryIcon
                  name={iconName}
                  color={selected ? "#0ea5e9" : "#94a3b8"}
                  size={18}
                  className="w-10 h-10"
                />
              </button>
            );
          })}
        </div>
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
            : isEditing
              ? "Save changes"
              : "Create goal"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Re-export to make the icon registry available to other goal components
// without forcing them to reach into the categories module.
export { ICON_MAP as GOAL_ICON_MAP };
