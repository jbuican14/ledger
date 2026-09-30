"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { HouseholdInvite } from "@/types/database";

const supabase = createClient();

export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/invite/${token}`;
}

// create_household_invite() raises user-facing messages for its own rules;
// Postgres-level errors need translating.
export function inviteErrorMessage(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === "23505") return "They already have a pending invite";
  return error.message;
}

export function useHouseholdInvites() {
  const { household, profile } = useAuth();
  const isOwner = profile?.role === "owner";
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    // Members never see the list, so don't query it for them.
    if (!household?.id || !isOwner) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Unclaimed only. Once claimed, the person shows up as a member (10.4).
    const { data, error: fetchError } = await supabase
      .from("household_invites")
      .select("*")
      .eq("household_id", household.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setInvites(data || []);
    }

    setIsLoading(false);
  }, [household?.id, isOwner]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const createInvite = async (
    email: string,
  ): Promise<{ invite: HouseholdInvite | null; error: string | null }> => {
    const { data, error: rpcError } = await supabase.rpc(
      "create_household_invite",
      { p_email: email },
    );

    if (rpcError) return { invite: null, error: inviteErrorMessage(rpcError) };

    await fetchInvites();
    return { invite: data as HouseholdInvite, error: null };
  };

  // Revoking is a delete: the token stops resolving, so the link dies with it.
  const revokeInvite = async (id: string): Promise<{ error: string | null }> => {
    // Unclaimed only: if they joined since the list loaded, the invite is now
    // their membership record. RLS refusals also delete zero rows without an
    // error, so check what actually went.
    const { data, error: deleteError } = await supabase
      .from("household_invites")
      .delete()
      .eq("id", id)
      .is("accepted_at", null)
      .select("id");

    if (deleteError) return { error: deleteError.message };
    if (!data?.length) {
      await fetchInvites();
      return { error: "That invite has already been used or removed" };
    }

    setInvites((prev) => prev.filter((i) => i.id !== id));
    return { error: null };
  };

  return {
    invites,
    isOwner,
    createInvite,
    revokeInvite,
    isLoading,
    error,
  };
}
