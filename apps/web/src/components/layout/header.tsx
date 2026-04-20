"use client";

import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <h1 className="text-lg font-semibold lg:hidden">{title || "Ledger"}</h1>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
