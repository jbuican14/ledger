"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, profile, household, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">User Info</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Display Name</dt>
                <dd>{profile?.display_name || "Not set"}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Household</h2>
            {household ? (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{household.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd>{household.currency}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">No household set up yet</p>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              🎉 Authentication is working! This is a placeholder dashboard.
              <br />
              Next steps: Build the full dashboard with transactions and goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
