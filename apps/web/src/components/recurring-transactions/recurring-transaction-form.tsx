"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/categories/category-icon";
import { getCurrencySymbol } from "@/lib/currency";
import { useAuth } from "@/lib/auth/auth-context";
import { Trash2 } from "lucide-react";
import type {
  Category,
  RecurringFrequency,
  RecurringTransactionFormData,
  RecurringTransactionWithCategory,
} from "@/types/database";

interface RecurringTransactionFormProps {
  categories: Category[];
  initialData?: RecurringTransactionWithCategory | null;
  onSubmit: (data: RecurringTransactionFormData) => Promise<{ error: string | null }>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function RecurringTransactionForm({
  categories,
  initialData,
  onSubmit,
  onDelete,
  onClose,
}: RecurringTransactionFormProps) {
  const { household } = useAuth();
  const currencySymbol = getCurrencySymbol(household?.currency ?? "GBP");

  const [isIncome, setIsIncome] = useState(
    initialData ? initialData.amount > 0 : false,
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [amount, setAmount] = useState(
    initialData?.amount !== undefined
      ? Math.abs(initialData.amount).toString()
      : "",
  );
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initialData?.frequency ?? "monthly",
  );
  const [nextDueDate, setNextDueDate] = useState(
    initialData?.next_due_date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (c) => c.type === (isIncome ? "income" : "expense"),
  );

  const validateAmount = (value: string): string | null => {
    if (!value) return "Amount is required";
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed) || parsed <= 0)
      return "Amount must be greater than 0";
    return null;
  };

  const validateName = (value: string): string | null => {
    if (!value.trim()) return "Name is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nameValidation = validateName(name);
    const amountValidation = validateAmount(amount);
    if (nameValidation || amountValidation) {
      setNameError(nameValidation);
      setAmountError(amountValidation);
      return;
    }
    setNameError(null);
    setAmountError(null);
    setIsSubmitting(true);

    const { error } = await onSubmit({
      name,
      amount,
      category_id: categoryId,
      frequency,
      next_due_date: nextDueDate,
      is_income: isIncome,
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
    setIsSubmitting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6" noValidate>
      {/* Income/Expense Toggle */}
      <div className="flex rounded-lg border p-1 bg-muted/30">
        <button
          type="button"
          onClick={() => {
            setIsIncome(false);
            setCategoryId("");
          }}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            !isIncome
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => {
            setIsIncome(true);
            setCategoryId("");
          }}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            isIncome
              ? "bg-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Income
        </button>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="recurring-name">Name</Label>
        <Input
          id="recurring-name"
          type="text"
          placeholder="e.g. Rent, Netflix, Salary"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          onBlur={() => setNameError(validateName(name))}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "recurring-name-error" : undefined}
          autoFocus
        />
        {nameError && (
          <p id="recurring-name-error" className="text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="recurring-amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {currencySymbol}
          </span>
          <Input
            id="recurring-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            onBlur={() => setAmountError(validateAmount(amount))}
            className="pl-7 text-lg"
            aria-invalid={!!amountError}
            aria-describedby={amountError ? "recurring-amount-error" : undefined}
          />
        </div>
        {amountError && (
          <p id="recurring-amount-error" className="text-sm text-destructive">
            {amountError}
          </p>
        )}
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label>Frequency</Label>
        <div className="flex rounded-lg border p-1 bg-muted/30">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                frequency === f.value
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category (optional)</Label>
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setCategoryId(categoryId === category.id ? "" : category.id)
                }
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors",
                  categoryId === category.id
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-muted",
                )}
              >
                <CategoryIcon name={category.icon} color={category.color} />
                <span className="text-xs truncate w-full text-center">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No categories available. Go to Settings to create one.
          </p>
        )}
      </div>

      {/* Next due date */}
      <div className="space-y-2">
        <Label htmlFor="recurring-next-due">Next due date</Label>
        <Input
          id="recurring-next-due"
          type="date"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll surface this in the monthly banner when it&apos;s due.
        </p>
      </div>

      {submitError && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {initialData && onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={isSubmitting}
            aria-label="Delete recurring transaction"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : initialData ? "Update" : "Add Recurring"}
        </Button>
      </div>
    </form>
  );
}
