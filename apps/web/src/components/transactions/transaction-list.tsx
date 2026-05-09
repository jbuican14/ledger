"use client";

import { format, isToday, isYesterday, parseISO } from "date-fns";
import type { TransactionWithCategory } from "@/types/database";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  groupedTransactions: Record<string, TransactionWithCategory[]>;
  onSelect: (transaction: TransactionWithCategory) => void;
  currency?: string;
}

function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM");
}

function formatAmount(amount: number, currency: string = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

export function TransactionList({
  groupedTransactions,
  onSelect,
  currency = "GBP",
}: TransactionListProps) {
  const dates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (dates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap the + button to add your first one
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            {formatDateHeader(date)}
          </h3>
          <div className="bg-card border rounded-lg divide-y">
            {(groupedTransactions[date] ?? []).map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => onSelect(transaction)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
              >
                {/* Category color dot */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                  style={{
                    backgroundColor: transaction.category?.color || "#6B7280",
                  }}
                >
                  {transaction.category?.name?.charAt(0) || "?"}
                </div>

                {/* Description & category */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {transaction.description || transaction.category?.name || "Transaction"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {transaction.category?.name || "Uncategorized"}
                  </p>
                </div>

                {/* Amount — sign comes from the value itself */}
                <div
                  className={cn(
                    "text-right font-medium",
                    transaction.amount >= 0 ? "text-green-600" : "text-foreground"
                  )}
                >
                  {transaction.amount >= 0 ? "+" : ""}
                  {formatAmount(transaction.amount, currency)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
