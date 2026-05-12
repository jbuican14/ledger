"use client";

import { useState } from "react";
import { endOfMonth, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  Category,
  PaymentMethod,
  TransactionWithCategory,
  TransactionFormData,
} from "@/types/database";
import { Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { getCurrencySymbol } from "@/lib/currency";
import { useAuth } from "@/lib/auth/auth-context";

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  initialData?: TransactionWithCategory | null;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function TransactionForm({
  categories,
  paymentMethods,
  initialData,
  onSubmit,
  onDelete,
  onClose,
}: TransactionFormProps) {
  const { household } = useAuth();
  const currencySymbol = getCurrencySymbol(household?.currency ?? "GBP");

  // Derive income/expense from the signed amount on the existing record.
  const [isIncome, setIsIncome] = useState(
    initialData ? initialData.amount > 0 : false,
  );
  // Show absolute value in the input; the hook re-applies the sign on submit.
  const [amount, setAmount] = useState(
    initialData?.amount !== undefined
      ? Math.abs(initialData.amount).toString()
      : "",
  );
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(
    initialData?.payment_method_id ?? "",
  );
  const [date, setDate] = useState(
    initialData?.transaction_date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Last day of the current month (local time, same view the user sees in
  // the native date picker). Used both as the input's `max` attribute and
  // for the manual-entry guard below.
  const maxDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const FUTURE_DATE_MSG = "Future months are managed by Recurring (coming soon)";

  const validateAmount = (value: string): string | null => {
    if (!value) return "Amount is required";
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed) || parsed <= 0)
      return "Amount must be greater than 0";
    return null;
  };

  const validateDate = (value: string): string | null => {
    if (value > maxDate) return FUTURE_DATE_MSG;
    return null;
  };
  // When true, successful submit clears the form but keeps the Sheet open
  // for rapid bulk entry. Only relevant on the Add form (not Edit).
  const [addAnother, setAddAnother] = useState(false);

  const filteredCategories = categories.filter(
    (c) => c.type === (isIncome ? "income" : "expense"),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountValidation = validateAmount(amount);
    const dateValidation = validateDate(date);
    if (amountValidation || dateValidation) {
      setAmountError(amountValidation);
      setDateError(dateValidation);
      return;
    }
    setAmountError(null);
    setDateError(null);

    setIsSubmitting(true);

    try {
      await onSubmit({
        amount,
        description,
        category_id: categoryId,
        payment_method_id: paymentMethodId,
        transaction_date: date,
        is_income: isIncome,
      });
      if (addAnother && !initialData) {
        // Bulk-entry mode: clear input fields but keep date + type so the
        // user can keep adding similar transactions.
        setAmount("");
        setDescription("");
        setCategoryId("");
        setPaymentMethodId("");
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
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
              : "text-muted-foreground hover:text-foreground ",
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => {
            setIsIncome(true);
            setCategoryId("");
            // Payment method is expense-only; drop it when switching to income.
            setPaymentMethodId("");
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

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {currencySymbol}
          </span>
          <Input
            id="amount"
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
            aria-describedby={amountError ? "amount-error" : undefined}
            autoFocus
          />
        </div>
        {amountError && (
          <p id="amount-error" className="text-sm text-destructive">
            {amountError}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          type="text"
          placeholder="What was this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        {filteredCategories && filteredCategories.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
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

      {/* Payment method — expense only */}
      {!isIncome && (
        <div className="space-y-2">
          <Label>Payment method (optional)</Label>
          {paymentMethods.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() =>
                    setPaymentMethodId(paymentMethodId === pm.id ? "" : pm.id)
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-sm transition-colors",
                    paymentMethodId === pm.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {pm.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment methods yet. Add some in Settings.
            </p>
          )}
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          max={maxDate}
          onChange={(e) => {
            setDate(e.target.value);
            if (dateError) setDateError(null);
          }}
          onBlur={() => setDateError(validateDate(date))}
          aria-invalid={!!dateError}
          aria-describedby={dateError ? "date-error" : undefined}
        />
        {dateError && (
          <p id="date-error" className="text-sm text-destructive">
            {dateError}
          </p>
        )}
      </div>

      {/* Add another — only on Add form, not Edit */}
      {!initialData && (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={addAnother}
            onChange={(e) => setAddAnother(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
          />
          <span>Add another after saving</span>
        </label>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
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
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Update"
              : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}
