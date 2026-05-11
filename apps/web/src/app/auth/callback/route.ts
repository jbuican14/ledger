import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@ledger/database/types";

type SupabaseClient = ReturnType<typeof createClient>;

async function redirectAfterAuth(supabase: SupabaseClient, origin: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, household_id")
    .eq("id", user.id)
    .single();

  const done = Boolean(profile?.onboarding_completed && profile?.household_id);
  return NextResponse.redirect(`${origin}/${done ? "dashboard" : "onboarding"}`);
}

function authError(origin: string, message?: string) {
  const url = `${origin}/login?error=auth_callback_error`;
  return NextResponse.redirect(
    message ? `${url}&message=${encodeURIComponent(message)}` : url,
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const errorDesc = searchParams.get("error_description");

  if (errorDesc) {
    console.error("Authentication error:", errorDesc);
    return authError(origin, errorDesc);
  }

  if (token_hash) {
    if (!type) {
      return authError(origin, "Missing 'type' parameter for token_hash flow");
    }
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (error) {
      console.error("verifyOtp failed:", error);
      return authError(origin, error.message);
    }
    return redirectAfterAuth(supabase, origin);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession failed:", error);
      return authError(origin, error.message);
    }
    return redirectAfterAuth(supabase, origin);
  }

  // Implicit flow: Supabase's verify endpoint already set the cookie before
  // redirecting here, so the session is in the request. Just resolve from it.
  return redirectAfterAuth(createClient(), origin);
}
