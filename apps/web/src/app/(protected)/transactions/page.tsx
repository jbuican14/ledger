"use client";

import { useState } from "react";
import { FAB } from "@/components/layout";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { useMonth } from "@/hooks/use-month";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { MonthNavigator } from "@/components/transactions/month-navigator";
import { DownloadMenu } from "@/components/transactions/download-menu";
import {
  TransactionListSkeleton,
  StatCardSkeleton,
} from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TransactionWithCategory } from "@/types/database";

export default function TransactionsPage() {
  const { household } = useAuth();
  const { year, month, range } = useMonth();
  const {
    transactions,
    groupedTransactions,
    totals,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    undoDelete,
  } = useTransactions(range);
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();

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
    if (!selectedTransaction) return;
    // Capture the id in the closure; selectedTransaction may change before
    // the user clicks Undo (they could open another row).
    const deletedId = selectedTransaction.id;
    try {
      await deleteTransaction(deletedId);
      showToast("Transaction deleted", "default", 5000, {
        label: "Undo",
        onClick: async () => {
          try {
            await undoDelete(deletedId);
          } catch {
            showToast("Failed to undo", "error");
          }
        },
      });
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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <DownloadMenu
            transactions={transactions}
            year={year}
            month={month}
          />
        </div>

        {/* Month Navigator */}
        <div className="mb-6">
          <MonthNavigator />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <TransactionListSkeleton />
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
            paymentMethods={paymentMethods}
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
