// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryBreakdown } from "./category-breakdown";
import type { TransactionWithCategory, Category } from "@/types/database";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

const cat = (id: string, name: string): Category => ({
  id,
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
  category: Category | null,
): TransactionWithCategory => ({
  id,
  household_id: "hh-1",
  user_id: null,
  category_id: category?.id ?? null,
  payment_method_id: null,
  amount,
  description: null,
  transaction_date: "2026-05-01",
  created_at: "",
  updated_at: "",
  deleted_at: null,
  category,
  payment_method: null,
});

describe("CategoryBreakdown (KAN dashboard)", () => {
  it("returns null when there are no expense transactions", () => {
    const { container } = render(<CategoryBreakdown transactions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("ignores income (positive amounts)", () => {
    const salary = cat("c1", "Salary");
    const { container } = render(
      <CategoryBreakdown transactions={[tx("t1", 2000, salary)]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("aggregates expenses by category and sorts by total spend", () => {
    const groceries = cat("c1", "Groceries");
    const bills = cat("c2", "Bills");
    render(
      <CategoryBreakdown
        transactions={[
          tx("t1", -50, groceries),
          tx("t2", -25, groceries),
          tx("t3", -200, bills),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.textContent).toContain("Bills");
    expect(items[0]!.textContent).toContain("£200");
    expect(items[1]!.textContent).toContain("Groceries");
    expect(items[1]!.textContent).toContain("£75");
  });

  it("buckets transactions without a category as Uncategorized", () => {
    render(
      <CategoryBreakdown transactions={[tx("t1", -10, null), tx("t2", -5, null)]} />,
    );
    expect(screen.getByText("Uncategorized")).toBeTruthy();
  });

  it("collapses to 5 rows and expands on Show all", () => {
    const txs = Array.from({ length: 7 }, (_, i) =>
      tx(`t${i}`, -(i + 1) * 10, cat(`c${i}`, `Cat ${i}`)),
    );
    render(<CategoryBreakdown transactions={txs} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: /Show all 7/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: /Show less/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("does not show toggle when categories <= 5", () => {
    const txs = Array.from({ length: 3 }, (_, i) =>
      tx(`t${i}`, -10, cat(`c${i}`, `Cat ${i}`)),
    );
    render(<CategoryBreakdown transactions={txs} />);
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });

  it("renders accessible progress bars summing the right percentages", () => {
    const a = cat("c1", "A");
    const b = cat("c2", "B");
    render(
      <CategoryBreakdown transactions={[tx("t1", -75, a), tx("t2", -25, b)]} />,
    );
    const bars = screen.getAllByRole("progressbar");
    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("75");
    expect(bars[1]!.getAttribute("aria-valuenow")).toBe("25");
  });
});
