"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  Category,
  TransactionWithCategory,
  TransactionFormData,
} from "@/types/database";
import { Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";

interface TransactionFormProps {
  categories: Category[];
  initialData?: TransactionWithCategory | null;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function TransactionForm({
  categories,
  initialData,
  onSubmit,
  onDelete,
  onClose,
}: TransactionFormProps) {
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
  const [date, setDate] = useState(
    initialData?.transaction_date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter(
    (c) => c.type === (isIncome ? "income" : "expense"),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        amount,
        description,
        category_id: categoryId,
        transaction_date: date,
        is_income: isIncome,
      });
      onClose();
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
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
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
              ? "bg-background shadow-sm"
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
            £
          </span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7 text-lg"
            autoFocus
          />
        </div>
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
        <div className="grid grid-cols-4 gap-2">
          {filteredCategories?.map((category) => (
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
              <CategoryIcon
                name={category.icon}
                color={category.color}
              />
              <span className="text-xs truncate w-full text-center">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

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
