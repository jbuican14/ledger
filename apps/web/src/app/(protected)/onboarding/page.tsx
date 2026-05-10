"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

const supabase = createClient();

export default function OnboardingPage() {
  const router = useRouter();
  const { user, household, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [householdName, setHouseholdName] = useState(
    household?.name ?? "My Finances",
  );
  const [currency, setCurrency] = useState(household?.currency ?? "GBP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !household) {
      setError("Session not ready — please refresh");
      return;
    }

    setLoading(true);

    try {
      // Household + profile + default categories already exist from the
      // signup trigger. Onboarding just personalises the household and
      // marks the user as done.
      const { error: householdError } = await supabase
        .from("households")
        .update({ name: householdName, currency })
        .eq("id", household.id);

      if (householdError) {
        setError(householdError.message);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      await refreshProfile();
      showToast("Welcome to Ledger!", "success");
      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome to Ledger</h1>
          <p className="text-muted-foreground mt-2">
            Let&apos;s set up your household
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="householdName">Household Name</Label>
            <Input
              id="householdName"
              type="text"
              placeholder="My Finances"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              This is how your household will be named in the app
            </p>
          </div>

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

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
