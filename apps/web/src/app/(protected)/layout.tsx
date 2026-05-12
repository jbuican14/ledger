import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppShell, OfflineBanner } from "@/components/layout";
import type { Profile, Household } from "@/types/database";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth: middleware should already redirect, but never trust a single layer.
  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = (profileData as Profile | null) ?? null;

  let household: Household | null = null;
  if (profile?.household_id) {
    const { data: householdData } = await supabase
      .from("households")
      .select("*")
      .eq("id", profile.household_id)
      .single();
    household = (householdData as Household | null) ?? null;
  }

  return (
    <AuthProvider
      initialUser={user}
      initialProfile={profile}
      initialHousehold={household}
    >
      <OfflineBanner />
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
