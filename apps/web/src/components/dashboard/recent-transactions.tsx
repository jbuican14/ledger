"use client";

import Link from "next/link";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import type { TransactionWithCategory } from "@/types/database";

type Props = {
  transactions: TransactionWithCategory[];
};

const LIMIT = 5;

function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMM");
}

// Dashboard "Recent activity" card showing the 5 latest transactions for
// the active month with a link to the full list. Hidden when the period
// has no transactions — the rest of the dashboard already handles the
// empty state.
export function RecentTransactions({ transactions }: Props) {
  const { household } = useAuth();
  const currency = household?.currency ?? "GBP";

  if (transactions.length === 0) return null;

  const recent = transactions.slice(0, LIMIT);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
      amount,
    );

  return (
    <div className="bg-card border rounded-lg">
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="font-semibold">Recent activity</h2>
        {transactions.length > LIMIT && (
          <span className="text-xs text-muted-foreground">
            Showing {LIMIT} of {transactions.length}
          </span>
        )}
      </div>
      <ul className="divide-y">
        {recent.map((t) => (
          <li key={t.id}>
            <Link
              href="/transactions"
              className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
            >
              <CategoryIcon
                name={t.category?.icon ?? null}
                color={t.category?.color || "#6B7280"}
                size={18}
                className="w-9 h-9 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">
                  {t.description || t.category?.name || "Transaction"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.category?.name || "Uncategorized"} ·{" "}
                  {formatDate(t.transaction_date)}
                </p>
              </div>
              <div
                className={cn(
                  "text-right font-medium text-sm tabular-nums",
                  t.amount >= 0 ? "text-green-600" : "text-foreground",
                )}
              >
                {t.amount >= 0 ? "+" : ""}
                {formatAmount(t.amount)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/transactions"
        className="flex items-center justify-center gap-1 p-3 text-sm text-primary hover:bg-muted/50 border-t transition-colors rounded-b-lg"
      >
        See all transactions
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
