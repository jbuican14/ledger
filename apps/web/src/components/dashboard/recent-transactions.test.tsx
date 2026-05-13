// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentTransactions } from "./recent-transactions";
import type { TransactionWithCategory, Category } from "@/types/database";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

const cat = (name: string): Category => ({
  id: `c-${name}`,
  household_id: "hh-1",
  name,
  color: "#22c55e",
  icon: "shopping-cart",
  type: "expense",
  sort_order: 0,
  created_at: "",
  updated_at: "",
});

const tx = (
  id: string,
  amount: number,
  date: string,
  description: string | null,
  category: Category | null,
): TransactionWithCategory => ({
  id,
  household_id: "hh-1",
  user_id: null,
  category_id: category?.id ?? null,
  payment_method_id: null,
  amount,
  description,
  transaction_date: date,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  category,
  payment_method: null,
});

describe("RecentTransactions (KAN-63)", () => {
  it("returns null when there are no transactions", () => {
    const { container } = render(<RecentTransactions transactions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders up to 5 transactions and the See all link", () => {
    const txs = Array.from({ length: 8 }, (_, i) =>
      tx(`t${i}`, -10, "2026-05-01", `Item ${i}`, cat("Groceries")),
    );
    render(<RecentTransactions transactions={txs} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(
      screen.getByText(/Showing 5 of 8/i),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /See all transactions/i })).toBeTruthy();
  });

  it("falls back to category name when description is null", () => {
    render(
      <RecentTransactions
        transactions={[tx("t1", -45.2, "2026-05-01", null, cat("Groceries"))]}
      />,
    );
    // Description position uses the category name when description is null.
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.textContent).toContain("Groceries");
  });

  it("renders income with a + sign and green colour", () => {
    render(
      <RecentTransactions
        transactions={[tx("t1", 2000, "2026-05-01", "Salary", cat("Salary"))]}
      />,
    );
    const amount = screen.getByText(/\+£2,000\.00/);
    expect(amount.className).toContain("text-green-600");
  });

  it("omits the count when there are fewer than 5 transactions", () => {
    render(
      <RecentTransactions
        transactions={[tx("t1", -10, "2026-05-01", "Item", cat("Groceries"))]}
      />,
    );
    expect(screen.queryByText(/Showing/i)).toBeNull();
  });
});
