"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { User } from "@ledger/database/types";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Household } from "@/types/database";

// Extract types from the Supabase client
type SupabaseClient = ReturnType<typeof createClient>;
type AuthChangeEvent = Parameters<
  SupabaseClient["auth"]["onAuthStateChange"]
>[0] extends (event: infer E, session: unknown) => void
  ? E
  : never;
type Session = Awaited<
  ReturnType<SupabaseClient["auth"]["getSession"]>
>["data"]["session"];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  household: Household | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Create ONE shared instance (correct)
const supabase = createClient();

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
  initialHousehold?: Household | null;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
  initialHousehold = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [household, setHousehold] = useState<Household | null>(initialHousehold);
  const [isLoading, setIsLoading] = useState(initialUser === null);

  const isFetching = useRef(false);
  const mounted = useRef(true);
  // Tracks the last user id we've already loaded a profile for. Supabase fires
  // a spurious SIGNED_IN on mount when the server already seeded our session;
  // refetching there races other hooks for the auth lock and triggers the
  // "Lock was released because another request stole it" error.
  const lastFetchedUserId = useRef<string | null>(initialUser?.id ?? null);

  const fetchProfile = async (userId: string) => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!mounted.current) return;
      if (error) throw error;

      setProfile(profileData);

      if (profileData?.household_id) {
        const { data: householdData, error: householdError } = await supabase
          .from("households")
          .select("*")
          .eq("id", profileData.household_id)
          .single();

        if (!mounted.current) return;
        if (householdError) throw householdError;

        setHousehold(householdData);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      isFetching.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Skip client-side fetch when server already seeded state.
    if (initialUser === null) {
      const init = async () => {
        try {
          // 🔥 IMPORTANT: use getUser(), NOT getSession()
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!mounted.current) return;

          if (user) {
            lastFetchedUserId.current = user.id;
            setUser(user);
            await fetchProfile(user.id);
          }
        } catch (err) {
          console.error("Init auth error:", err);
        } finally {
          if (mounted.current) setIsLoading(false);
        }
      };

      init();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted.current) return;

        if (event === "SIGNED_IN" && session?.user) {
          // Skip the spurious SIGNED_IN fired on mount when SSR already seeded
          // the same user — refetching here races other hooks for the auth
          // lock and breaks them.
          if (session.user.id === lastFetchedUserId.current) return;
          lastFetchedUserId.current = session.user.id;
          setUser(session.user);
          await fetchProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          lastFetchedUserId.current = null;
          setUser(null);
          setProfile(null);
          setHousehold(null);
        }
      },
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
    // initialUser is a one-shot hydration seed; intentionally not reactive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      // 🔥 ensure middleware sees it immediately
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        household,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
