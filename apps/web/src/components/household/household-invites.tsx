"use client";

import { useState } from "react";
import { Copy, Mail, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  buildInviteLink,
  useHouseholdInvites,
} from "@/hooks/use-household-invites";

function expiryLabel(expiresAt: string): string {
  const days = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "Expired";
  return days === 1 ? "Expires in 1 day" : `Expires in ${days} days`;
}

// Owner-only. Renders nothing for members — RLS and the RPC refuse them
// anyway, this just keeps the UI honest.
export function HouseholdInvites() {
  const {
    invites,
    isOwner,
    createInvite,
    revokeInvite,
    isLoading,
    error: fetchError,
  } = useHouseholdInvites();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  if (!isOwner) return null;

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Invite link copied", "success");
    } catch {
      showToast("Couldn't copy — select the link and copy it manually", "error");
    }
  };

  const handleInvite = async () => {
    // Enter bypasses the disabled button, so guard here too.
    if (!email.trim() || isSaving) return;
    setIsSaving(true);
    const { invite, error } = await createInvite(email);
    setIsSaving(false);
    if (error || !invite) {
      showToast(error ?? "Couldn't create invite", "error");
      return;
    }
    setNewLink(buildInviteLink(window.location.origin, invite.token));
    setEmail("");
  };

  const handleRevoke = async (
    id: string,
    inviteEmail: string,
    token: string,
  ) => {
    if (confirmRevokeId !== id) {
      setConfirmRevokeId(id);
      return;
    }
    const { error } = await revokeInvite(id);
    setConfirmRevokeId(null);
    if (error) {
      showToast(error, "error");
    } else {
      // Don't leave a dead link on screen to be copied.
      if (newLink?.endsWith(`/${token}`)) setNewLink(null);
      showToast(`Invite for ${inviteEmail} revoked`, "success");
    }
  };

  return (
    <div className="mt-6 pt-4 border-t">
      <h3 className="font-medium mb-1">Invite someone</h3>
      <p className="text-sm text-muted-foreground mb-3">
        They&apos;ll get full access to this household&apos;s budget. Share the
        link however you like — only this email can use it.
      </p>

      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="invite-email" className="sr-only">
            Email
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="partner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
        </div>
        <Button onClick={handleInvite} disabled={!email.trim() || isSaving}>
          <UserPlus className="h-4 w-4 mr-1" />
          {isSaving ? "Inviting…" : "Invite"}
        </Button>
      </div>

      {newLink && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium mb-2">Invite created — share this link</p>
          <div className="flex gap-2">
            <Input readOnly value={newLink} onFocus={(e) => e.target.select()} />
            <Button variant="outline" onClick={() => copyLink(newLink)}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>
      )}

      <h3 className="font-medium mt-6 mb-2">Pending invites</h3>
      {isLoading ? (
        <div className="space-y-1">
          <ListItemSkeleton />
        </div>
      ) : fetchError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive font-medium mb-1">
            Couldn&apos;t load invites
          </p>
          <p className="text-muted-foreground">{fetchError}</p>
        </div>
      ) : invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invites.</p>
      ) : (
        <ul className="space-y-1">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {expiryLabel(invite.expires_at)}
                  </p>
                </div>
              </div>

              {confirmRevokeId === invite.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    className="text-destructive font-medium hover:underline"
                    onClick={() => handleRevoke(invite.id, invite.email, invite.token)}
                  >
                    Revoke
                  </button>
                  <button
                    className="text-muted-foreground hover:underline"
                    onClick={() => setConfirmRevokeId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    aria-label={`Copy invite link for ${invite.email}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() =>
                      copyLink(buildInviteLink(window.location.origin, invite.token))
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Revoke invite for ${invite.email}`}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleRevoke(invite.id, invite.email, invite.token)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
