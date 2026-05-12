"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTransactions } from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCardSkeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, profile, household } = useAuth();
  const { transactions, isLoading } = useTransactions();

  const isEmpty = !isLoading && transactions.length === 0;

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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Stats */}
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">£0.00</p>
            <p className="text-xs text-muted-foreground mt-1">Total spent</p>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Budget Remaining</p>
            <p className="text-2xl font-bold text-green-600">£0.00</p>
            <p className="text-xs text-muted-foreground mt-1">of £0.00 budget</p>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Goals Progress</p>
            <p className="text-2xl font-bold">0%</p>
            <p className="text-xs text-muted-foreground mt-1">0 active goals</p>
          </div>
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
