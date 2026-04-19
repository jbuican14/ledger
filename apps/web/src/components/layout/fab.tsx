"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  onClick?: () => void;
  className?: string;
}

export function FAB({ onClick, className }: FABProps) {
  return (
    <Button
      size="icon"
      className={cn(
        "fixed bottom-20 right-4 lg:bottom-6 lg:right-6 h-14 w-14 rounded-full shadow-lg z-40",
        className
      )}
      onClick={onClick}
    >
      <Plus className="h-6 w-6" />
      <span className="sr-only">Add transaction</span>
    </Button>
  );
}
