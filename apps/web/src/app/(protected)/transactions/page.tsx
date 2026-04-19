"use client";

import { FAB } from "@/components/layout";

export default function TransactionsPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Transactions</h1>

        <div className="bg-card border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No transactions yet. Add your first one!
          </p>
        </div>
      </div>

      <FAB onClick={() => console.log("Add transaction")} />
    </div>
  );
}
