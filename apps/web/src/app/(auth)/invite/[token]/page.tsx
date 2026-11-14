import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: {
    token: string;
  };
};

export default async function InvitePage({ params } : InvitePageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: params.token });
  const invite = error ? null : data?.[0];
  const status = invite?.status ?? "not_found";

  if (status === "not_found") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          This invite link isn&apos;t valid
        </h2>
        <p className="text-muted-foreground">
          It may have been cancelled, or copied incompletely. Ask the person who invited you for a new link.
        </p>
      </div>
    );
  }
  if (status === "used" || status === "expired") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          {status === "used" ? "This invite link has already been used" : "This invite link has expired"}
        </h2>
        <p className="text-muted-foreground">
          Ask the person who invited you to send you a new link.
        </p>
      </div>
    );
  }

  if (status === "account_exists") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          This email already has a Ledger account
        </h2>
        <p className="text-muted-foreground">
          This invite was sent to {invite?.email_hint}. Joining another household from an existing account isn&apos;t possible yet, so your own data stays safe. Ask the person who invited you to use a different email.
        </p>
      </div>
    );
  }

  const inviter = invite?.inviter_name ?? "Someone";
  const expires = new Date(invite?.expires_at ?? "").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        {inviter} invited you to join {invite?.household_name} on Ledger
      </h2>
      <p className="text-muted-foreground">
        Sign up with {invite?.email_hint} to join. This invite expires on {expires}.
      </p>
      <Button asChild className="w-full">
        <Link href="/signup">Create your account</Link>
      </Button>
    </div>
  );
}
