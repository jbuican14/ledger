import { describe, it, expect } from "vitest";
import { toCSV, toJSON } from "./export";
import type { TransactionWithCategory } from "@/types/database";

function row(overrides: Partial<TransactionWithCategory>): TransactionWithCategory {
  return {
    id: "t1",
    household_id: "h1",
    user_id: "u1",
    category_id: "c1",
    payment_method_id: "p1",
    amount: -10,
    description: "Test",
    transaction_date: "2026-04-15",
    created_at: "2026-04-15T10:00:00Z",
    updated_at: "2026-04-15T10:00:00Z",
    deleted_at: null,
    category: {
      id: "c1",
      household_id: "h1",
      name: "Groceries",
      color: "#22c55e",
      icon: "🛒",
      type: "expense",
      sort_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    payment_method: {
      id: "p1",
      household_id: "h1",
      name: "Visa Debit",
      sort_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  } as TransactionWithCategory;
}

describe("toCSV", () => {
  it("emits a header row even for an empty list", () => {
    const csv = toCSV([]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,Amount,Type,Category,Payment Method,Description",
    );
    expect(lines).toHaveLength(1);
  });

  it("serializes a basic expense row", () => {
    const csv = toCSV([row({ amount: -45.2, description: "Tesco" })]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-04-15,45.20,expense,Groceries,Visa Debit,Tesco");
  });

  it("serializes income as type=income with positive amount", () => {
    const csv = toCSV([
      row({
        amount: 2000,
        description: "Salary",
        category: {
          ...row({}).category!,
          name: "Salary",
          type: "income" as const,
        },
        payment_method_id: null,
        payment_method: null,
      }),
    ]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-04-15,2000.00,income,Salary,,Salary");
  });

  it("escapes fields containing commas with double quotes", () => {
    const csv = toCSV([row({ description: "Lunch, dinner, snacks" })]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain('"Lunch, dinner, snacks"');
  });

  it("escapes fields containing double quotes by doubling them", () => {
    const csv = toCSV([row({ description: 'She said "hi"' })]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain('"She said ""hi"""');
  });

  it("escapes fields containing newlines", () => {
    const csv = toCSV([row({ description: "Line1\nLine2" })]);
    const lines = csv.split(/\r?\n/);
    // The newline-containing description will produce a multi-line cell.
    // We just assert the field is wrapped in quotes.
    expect(csv).toContain('"Line1\nLine2"');
    // Header + content (which spans multiple lines)
    expect(lines.length).toBeGreaterThan(1);
  });

  it("handles null description and payment method gracefully", () => {
    const csv = toCSV([
      row({ description: null, payment_method: null, payment_method_id: null }),
    ]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-04-15,10.00,expense,Groceries,,");
  });

  it("handles missing category (deleted)", () => {
    const csv = toCSV([row({ category: null, category_id: null })]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-04-15,10.00,expense,,Visa Debit,Test");
  });

  it("emits one row per transaction in input order", () => {
    const csv = toCSV([
      row({ id: "a", description: "A" }),
      row({ id: "b", description: "B" }),
      row({ id: "c", description: "C" }),
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(4); // header + 3 rows
    expect(lines[1]).toContain(",A");
    expect(lines[2]).toContain(",B");
    expect(lines[3]).toContain(",C");
  });
});

describe("toJSON", () => {
  it("produces an empty array for no transactions", () => {
    expect(toJSON([])).toBe("[]");
  });

  it("produces an array of transaction objects with the expected shape", () => {
    const json = toJSON([row({ amount: -45.2, description: "Tesco" })]);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual([
      {
        date: "2026-04-15",
        amount: 45.2,
        type: "expense",
        category: "Groceries",
        payment_method: "Visa Debit",
        description: "Tesco",
      },
    ]);
  });

  it("represents income with type=income", () => {
    const json = toJSON([
      row({
        amount: 1500,
        category: { ...row({}).category!, name: "Salary", type: "income" as const },
        payment_method: null,
      }),
    ]);
    const parsed = JSON.parse(json);
    expect(parsed[0].type).toBe("income");
    expect(parsed[0].amount).toBe(1500);
  });

  it("preserves order", () => {
    const json = toJSON([
      row({ id: "1", description: "first" }),
      row({ id: "2", description: "second" }),
    ]);
    const parsed = JSON.parse(json);
    expect(parsed.map((t: { description: string }) => t.description)).toEqual([
      "first",
      "second",
    ]);
  });

  it("is pretty-printed with 2-space indentation", () => {
    const json = toJSON([row({})]);
    expect(json).toContain("\n  ");
  });
});
