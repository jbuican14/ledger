import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/transactions",
  "/goals",
  "/settings",
  "/onboarding",
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  console.log("[MIDDLEWARE] Request path:", pathname, "User:", user?.email || "GUEST", user);

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  console.log("[MIDDLEWARE] isProtectedRoute:", isProtectedRoute, "isPublicRoute:", isPublicRoute);

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    console.log("[MIDDLEWARE] ❌ Protected route without auth - redirecting to /login");
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle onboarding route specifically
  if (pathname === "/onboarding" && user) {
    console.log("[MIDDLEWARE] 📝 User accessing /onboarding - checking if already completed");
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, household_id")
      .eq("id", user.id)
      .single();

    console.log("[MIDDLEWARE] Onboarding status:", profile?.onboarding_completed);
    // Already onboarded? Redirect to dashboard
    if (profile?.onboarding_completed && profile?.household_id) {
      console.log("[MIDDLEWARE] ✅ Already onboarded - redirecting to /dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    console.log("[MIDDLEWARE] ✏️ Onboarding not completed - allowing /onboarding");
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if (isPublicRoute && user && pathname !== "/auth/callback") {
    console.log("[MIDDLEWARE] 🔓 User logged in but on public auth page:", pathname);
    // Check onboarding status
    console.log("[MIDDLEWARE] Checking onboarding status for user:", user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, household_id")
      .eq("id", user.id)
      .single();

    console.log("[MIDDLEWARE] Profile data:", {
      onboarding_completed: profile?.onboarding_completed,
      household_id: profile?.household_id,
    });
    if (profile?.onboarding_completed && profile?.household_id) {
      console.log("[MIDDLEWARE] ✅ Onboarding complete - redirecting to /dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else if (pathname !== "/onboarding") {
      console.log("[MIDDLEWARE] ❌ Onboarding not complete - redirecting to /onboarding");
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  console.log("[MIDDLEWARE] ✓ Allowing request through");
  return supabaseResponse;

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
