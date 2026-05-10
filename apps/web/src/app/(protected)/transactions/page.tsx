"use client";

import { useState } from "react";
import { FAB } from "@/components/layout";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionForm } from "@/components/transactions/transaction-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TransactionWithCategory } from "@/types/database";

export default function TransactionsPage() {
  const { household } = useAuth();
  const {
    groupedTransactions,
    totals,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { categories } = useCategories();

  const { showToast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithCategory | null>(null);

  const handleOpenAdd = () => {
    setSelectedTransaction(null);
    setIsSheetOpen(true);
  };

  const handleSelect = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction);
    setIsSheetOpen(true);
  };

  const handleSubmit = async (data: Parameters<typeof addTransaction>[0]) => {
    try {
      if (selectedTransaction) {
        await updateTransaction(selectedTransaction.id, data);
        showToast("Transaction updated", "success");
      } else {
        await addTransaction(data);
        showToast("Transaction added", "success");
      }
    } catch (error) {
      showToast("Failed to save transaction", "error");
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedTransaction) {
        await deleteTransaction(selectedTransaction.id);
        showToast("Transaction deleted", "success");
      }
    } catch (error) {
      showToast("Failed to delete transaction", "error");
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: household?.currency || "GBP",
    }).format(amount);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl">
        {/* Header with totals */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Transactions</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Income</p>
            <p className="text-xl font-bold text-green-600">
              +{formatCurrency(totals.income)}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-xl font-bold">
              -{formatCurrency(totals.expenses)}
            </p>
          </div>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground animate-pulse">Loading...</p>
          </div>
        ) : (
          <TransactionList
            groupedTransactions={groupedTransactions}
            onSelect={handleSelect}
            currency={household?.currency}
          />
        )}
      </div>

      {/* FAB */}
      <FAB onClick={handleOpenAdd} />

      {/* Transaction Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedTransaction ? "Edit Transaction" : "Add Transaction"}
            </SheetTitle>
          </SheetHeader>
          <TransactionForm
            categories={categories}
            initialData={selectedTransaction}
            onSubmit={handleSubmit}
            onDelete={selectedTransaction ? handleDelete : undefined}
            onClose={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
