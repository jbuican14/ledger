"use client";

import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardPage() {
  const { user, profile, household } = useAuth();

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

        {/* Getting Started */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
          <h3 className="font-semibold mb-2">Getting Started</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Add your first transaction using the + button</li>
            <li>2. Set up your monthly budget in Settings</li>
            <li>3. Create savings goals to track your progress</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
