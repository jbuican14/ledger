"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DemoOnboardingPage() {
  const [householdName, setHouseholdName] = useState("My Finances");
  const [currency, setCurrency] = useState("GBP");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert(`✓ Setup complete!\n\nHousehold: ${householdName}\nCurrency: ${currency}\n\n→ Would redirect to dashboard`);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to demo menu
        </Link>

        {/* Form container */}
        <div className="bg-card border rounded-lg p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Welcome to Ledger</h1>
            <p className="text-muted-foreground mt-2">
              Let&apos;s set up your household
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="w-2 h-2 rounded-full bg-muted" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Household Name */}
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input
                id="householdName"
                type="text"
                placeholder="My Finances"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                This is how your household will be named in the app
              </p>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="GBP">£ GBP - British Pound</option>
                <option value="EUR">€ EUR - Euro</option>
                <option value="USD">$ USD - US Dollar</option>
              </select>
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>

            {/* Skip link */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Skip this step
              </button>
            </div>
          </form>
        </div>

        {/* Demo info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-muted-foreground">
          <strong>Demo tip:</strong> This shows Step 1 of 3. In the real app, currency selection happens here. Complete setup takes ~30 seconds.
        </div>
      </div>
    </div>
  );
}
