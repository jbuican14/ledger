"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header title={title} />
        <main className="pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
