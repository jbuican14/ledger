"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { CategoryManagement } from "@/components/categories/category-management";
import { PaymentMethodManagement } from "@/components/payment-methods/payment-method-management";
import { RecurringTransactionManagement } from "@/components/recurring-transactions/recurring-transaction-management";

export default function SettingsPage() {
  const { user, profile, household, signOut } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    showToast("You've been logged out", "success");
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Profile</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Display Name</dt>
                <dd>{profile?.display_name || "Not set"}</dd>
              </div>
            </dl>
          </div>

          {/* Household Section */}
          <div className="bg-card border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Household</h2>
            {household ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{household.name}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd>{household.currency}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">No household configured</p>
            )}
          </div>

          {/* Categories */}
          <div className="bg-card border rounded-lg p-4">
            <CategoryManagement />
          </div>

          {/* Payment Methods */}
          <div className="bg-card border rounded-lg p-4">
            <PaymentMethodManagement />
          </div>

          {/* Recurring */}
          <div className="bg-card border rounded-lg p-4">
            <RecurringTransactionManagement />
          </div>

          {/* Danger Zone */}
          <div className="bg-card border border-destructive/20 rounded-lg p-4">
            <h2 className="font-semibold mb-4 text-destructive">Account</h2>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
