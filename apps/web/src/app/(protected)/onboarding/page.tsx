"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [householdName, setHouseholdName] = useState("My Finances");
  const [currency, setCurrency] = useState("GBP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // Create household
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({
          name: householdName,
          currency: currency,
        })
        .select()
        .single();

      if (householdError) {
        setError(householdError.message);
        return;
      }

      // Update profile with household_id and mark onboarding complete
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          household_id: household.id,
          onboarding_completed: true,
        })
        .eq("id", user?.id);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      // Create default categories
      const { error: categoryError } = await supabase.rpc(
        "create_default_categories",
        { p_household_id: household.id }
      );

      if (categoryError) {
        console.error("Failed to create default categories:", categoryError);
        // Don't block onboarding if categories fail
      }

      // Refresh profile and redirect
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
