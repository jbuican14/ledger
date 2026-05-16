"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Target, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { name: "Groceries", icon: "🛒", color: "#10b981", amount: 547.89, pct: 30 },
  { name: "Eating Out", icon: "🍽️", color: "#f87171", amount: 385.42, pct: 21 },
  { name: "Transport", icon: "🚗", color: "#f97316", amount: 312.5, pct: 17 },
  { name: "Bills", icon: "📄", color: "#3b82f6", amount: 287.23, pct: 16 },
  { name: "Shopping", icon: "🛍️", color: "#ec4899", amount: 314.59, pct: 17 },
];

const TRANSACTIONS = [
  { date: "7 May", desc: "Tesco", category: "Groceries", amount: -45.2 },
  { date: "6 May", desc: "Netflix", category: "Entertainment", amount: -15.99 },
  { date: "5 May", desc: "TfL", category: "Transport", amount: -12.5 },
  { date: "4 May", desc: "Amazon", category: "Shopping", amount: -89.99 },
  { date: "3 May", desc: "Costa Coffee", category: "Eating Out", amount: -5.5 },
];

const GOALS = [
  {
    name: "Gaming PC",
    icon: "🎮",
    current: 890,
    target: 1500,
    color: "#16a34a",
  },
  {
    name: "Holiday 2026",
    icon: "🏖️",
    current: 2340,
    target: 5000,
    color: "#16a34a",
  },
  {
    name: "House Fund",
    icon: "🏠",
    current: 15230,
    target: 50000,
    color: "#16a34a",
  },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(n);
}

function getGoalColor(current: number, target: number) {
  if (current < 0) return "bg-red-500";
  const pct = (current / target) * 100;
  if (pct >= 100) return "bg-blue-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-green-600";
}

export default function DemoDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b p-4 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to demo
          </Link>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

          {/* Quick Stats Grid - 2 columns on md */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            {/* This Month Card */}
            <div className="bg-card border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold mt-1">£1,847.63</p>
              <p className="text-xs text-muted-foreground mt-1">Total spent</p>
            </div>

            {/* Budget Widget */}
            <div className="bg-card border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Budget Remaining</p>
              <p className="text-2xl font-bold text-green-600 mt-1">£800.00</p>
              <p className="text-xs text-muted-foreground mt-1">
                £1,200.00 of £2,000.00 spent
              </p>
              <div
                className="h-2 bg-muted rounded-full mt-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={60}
              >
                <div
                  className="h-full bg-green-600"
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          </div>

          {/* Category Breakdown + Recent + Goals Grid - 3 columns on lg */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 place-items-center">
            {/* Category Breakdown */}
            <div className="bg-card border rounded-lg p-4 w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Where it went</h2>
                <span className="text-xs text-muted-foreground">
                  £1,847.63 total
                </span>
              </div>

              <ul className="space-y-3">
                {CATEGORIES.map((cat) => (
                  <li key={cat.name} className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="font-medium truncate">{cat.name}</span>
                        <span className="text-xs ml-2">
                          {formatCurrency(cat.amount)}
                        </span>
                      </div>
                      <div
                        className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={cat.pct}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cat.pct}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="hidden md:inline text-xs text-muted-foreground w-10 text-right">
                      {cat.pct}%
                    </span>
                  </li>
                ))}
              </ul>

              <button className="mt-4 text-sm text-primary hover:underline flex items-center gap-1">
                Show all 5 <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="bg-card border rounded-lg p-4 w-full">
              <h2 className="font-semibold mb-3">Recent activity</h2>

              <div className="space-y-2">
                {TRANSACTIONS.map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{tx.desc}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.date}, {tx.category}
                      </p>
                    </div>
                    <p className="font-medium text-sm text-destructive">
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>

              <button className="mt-3 text-primary text-sm hover:underline flex items-center gap-1">
                See all transactions <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Savings Goals Widget */}
            <div className="bg-card border rounded-lg w-full">
              <div className="flex items-center justify-between p-4 pb-3">
                <h2 className="font-semibold">Savings goals</h2>
                <span className="text-xs text-muted-foreground">
                  Showing 3 of 4
                </span>
              </div>

              <ul className="divide-y">
                {GOALS.map((goal) => {
                  const pct = (goal.current / goal.target) * 100;
                  return (
                    <li key={goal.name}>
                      <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                        <span className="text-xl shrink-0">{goal.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium truncate">
                              {goal.name}
                            </p>
                            <p className="text-xs text-muted-foreground shrink-0">
                              {formatCurrency(goal.current)} /{" "}
                              {formatCurrency(goal.target)}
                            </p>
                          </div>
                          <div
                            className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={Math.round(pct)}
                          >
                            <div
                              className={`h-full ${getGoalColor(goal.current, goal.target)} rounded-full transition-all`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button className="w-full flex items-center justify-center gap-1 p-3 text-sm text-primary hover:bg-muted/50 border-t transition-colors">
                See all goals
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-muted-foreground">
            <strong>Demo info:</strong> This is the authenticated dashboard view with dummy data. All widgets are responsive: 3 columns on desktop (lg), 2 columns on tablet (md), 1 column on mobile. Tailwind classes are documented in FIGMA_DESIGN_SPEC.md.
          </div>
        </div>
      </div>
    </div>
  );
}
