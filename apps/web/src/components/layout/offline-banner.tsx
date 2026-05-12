"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";

export function OfflineBanner() {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>No internet connection</span>
    </div>
  );
}
