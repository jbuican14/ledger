"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/layout";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
