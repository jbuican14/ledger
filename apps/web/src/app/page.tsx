import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check onboarding status
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, household_id")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_completed && profile?.household_id) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  } else {
    redirect("/login");
  }
}
