import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@ledger/database/types";

type SupabaseClient = ReturnType<typeof createClient>;

function safeNext(next: string | null): string | null {
  if (!next) return null;

  // Same origin path rejexts "https://evil.com" and 
  // protocol-relative "//evil.com", both of which browsers treat as external
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

async function redirectAfterAuth(supabase: SupabaseClient, origin: string, next: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
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
  const next = safeNext(searchParams.get("next"));
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
    return redirectAfterAuth(supabase, origin, next);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession failed:", error);
      return authError(origin, error.message);
    }
    return redirectAfterAuth(supabase, origin, next);
  }

  // Implicit flow: Supabase's verify endpoint already set the cookie before
  // redirecting here, so the session is in the request. Just resolve from it.
  return redirectAfterAuth(createClient(), origin, next);
}
