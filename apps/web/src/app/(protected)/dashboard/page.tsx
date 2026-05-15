"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTransactions } from "@/hooks/use-transactions";
import { useMonth } from "@/hooks/use-month";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { RecurringBanner } from "@/components/recurring-transactions/recurring-banner";
import { BudgetWidget } from "@/components/budget/budget-widget";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { GoalsWidget } from "@/components/dashboard/goals-widget";

export default function DashboardPage() {
  const { user, profile, household } = useAuth();
  // Dashboard always reflects the same month range as the transactions page,
  // so "This Month" stays in sync with the user's currently-selected month.
  const { range, year, month } = useMonth();
  const { transactions, totals, isLoading, refetch } = useTransactions(range);

  const isEmpty = !isLoading && transactions.length === 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: household?.currency || "GBP",
    }).format(amount);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          {/* Banner can populate the empty list in one click for users who
              set up recurring rules before logging any transactions. */}
          <RecurringBanner year={year} month={month} onAdded={refetch} />
          <EmptyState
            icon={Wallet}
            title={`Welcome${profile?.display_name ? `, ${profile.display_name}` : ""}!`}
            description="Start tracking your spending by adding your first expense. We'll help you see where your money goes each month."
            action={
              <Button asChild>
                <Link href="/transactions">Add your first expense</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <RecurringBanner year={year} month={month} onAdded={refetch} />

        <div className="grid gap-4 md:grid-cols-2">
          {/* Quick Stats */}
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totals.expenses)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total spent</p>
          </div>

          <BudgetWidget year={year} month={month} spent={totals.expenses} />
        </div>

        {/* Category breakdown + Recent activity + Goals */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          <CategoryBreakdown transactions={transactions} />
          <RecentTransactions transactions={transactions} />
          <GoalsWidget />
        </div>

        {/* User & Household Info */}
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3">Your Profile</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Display Name</dt>
                <dd className="font-medium">{profile?.display_name || "Not set"}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3">Household</h2>
            {household ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{household.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd className="font-medium">{household.currency}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">No household set up yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
