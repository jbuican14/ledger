import type {
  TransactionFormData,
  TransactionWithCategory,
} from "@/types/database";

export type TransactionTotals = {
  income: number;
  expenses: number;
};

// Convert form input (positive amount + is_income flag) to a signed amount.
// Negative = expense, positive = income (matches the DB convention).
export function toSignedAmount(formData: TransactionFormData): number {
  const value = Math.abs(parseFloat(formData.amount));
  return formData.is_income ? value : -value;
}

// Sum signed transaction amounts into income/expense buckets. Expenses are
// returned as positive numbers so the UI can render "-£X" without inverting
// the sign at display time.
export function computeTotals(
  transactions: Pick<TransactionWithCategory, "amount">[],
): TransactionTotals {
  return transactions.reduce<TransactionTotals>(
    (acc, t) => {
      if (t.amount >= 0) {
        acc.income += t.amount;
      } else {
        acc.expenses += Math.abs(t.amount);
      }
      return acc;
    },
    { income: 0, expenses: 0 },
  );
}
