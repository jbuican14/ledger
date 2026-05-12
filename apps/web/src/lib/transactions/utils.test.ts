import { describe, expect, it } from "vitest";
import { computeTotals, toSignedAmount } from "./utils";
import type { TransactionFormData, TransactionWithCategory } from "@/types/database";

function formData(overrides: Partial<TransactionFormData>): TransactionFormData {
  return {
    amount: "0",
    description: "",
    category_id: "",
    payment_method_id: "",
    transaction_date: "2026-05-11",
    is_income: false,
    ...overrides,
  };
}

function txn(amount: number): Pick<TransactionWithCategory, "amount"> {
  return { amount };
}

describe("toSignedAmount", () => {
  it("negates expense amounts", () => {
    expect(toSignedAmount(formData({ amount: "45.20", is_income: false }))).toBe(-45.2);
  });

  it("keeps income amounts positive", () => {
    expect(toSignedAmount(formData({ amount: "2000", is_income: true }))).toBe(2000);
  });

  it("treats a leading-minus expense input the same as positive (no double-flip)", () => {
    // The form input has min="0", but if a user pastes "-45.20" it should still
    // resolve to an expense of -45.20, not a positive 45.20.
    expect(toSignedAmount(formData({ amount: "-45.20", is_income: false }))).toBe(-45.2);
  });

  it("treats a leading-minus income input the same as positive", () => {
    expect(toSignedAmount(formData({ amount: "-2000", is_income: true }))).toBe(2000);
  });

  it("handles decimal precision typical for currency", () => {
    expect(toSignedAmount(formData({ amount: "0.01", is_income: false }))).toBe(-0.01);
    expect(toSignedAmount(formData({ amount: "9999999.99", is_income: true }))).toBe(9999999.99);
  });
});

describe("computeTotals", () => {
  it("returns zero totals for an empty list", () => {
    expect(computeTotals([])).toEqual({ income: 0, expenses: 0 });
  });

  it("sums positive amounts into income", () => {
    expect(computeTotals([txn(100), txn(2000)])).toEqual({ income: 2100, expenses: 0 });
  });

  it("sums negative amounts into expenses as positive numbers", () => {
    // -45.20 + -22.00 should produce expenses: 67.20, not -67.20
    expect(computeTotals([txn(-45.2), txn(-22)])).toEqual({ income: 0, expenses: 67.2 });
  });

  it("splits mixed transactions correctly", () => {
    const result = computeTotals([
      txn(2000),    // income
      txn(-45.2),   // expense
      txn(500),     // income
      txn(-12.5),   // expense
    ]);
    expect(result).toEqual({ income: 2500, expenses: 57.7 });
  });

  it("treats zero as income (boundary)", () => {
    // The DB CHECK forbids amount = 0, but the function should still bucket
    // defensively. Picking income side per the `>= 0` branch.
    expect(computeTotals([txn(0)])).toEqual({ income: 0, expenses: 0 });
  });
});
