// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetWidget } from "./budget-widget";
import type { Budget } from "@/types/database";

let mockBudget: Budget | null = null;
let mockLoading = false;

vi.mock("@/hooks/use-budget", () => ({
  useBudget: () => ({
    budget: mockBudget,
    setAmount: vi.fn(),
    clearBudget: vi.fn(),
    isLoading: mockLoading,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

beforeEach(() => {
  mockBudget = null;
  mockLoading = false;
});

const makeBudget = (amount: number): Budget => ({
  id: "b-1",
  household_id: "hh-1",
  year: 2026,
  month: 5,
  amount,
  created_at: "",
  updated_at: "",
});

describe("BudgetWidget (KAN-60)", () => {
  it("renders 'Set a budget' CTA when no budget exists", () => {
    render(<BudgetWidget year={2026} month={5} spent={0} />);
    expect(screen.getByText(/Not set/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Set a budget/i })).toBeTruthy();
  });

  it("shows remaining amount and progress bar when under budget", () => {
    mockBudget = makeBudget(1000);
    render(<BudgetWidget year={2026} month={5} spent={250} />);
    expect(screen.getByText(/Budget remaining/i)).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
  });

  it("uses amber bar when 80%+ spent but not over", () => {
    mockBudget = makeBudget(1000);
    render(<BudgetWidget year={2026} month={5} spent={850} />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-amber-500");
  });

  it("shows 'Over budget' state when spent exceeds amount", () => {
    mockBudget = makeBudget(1000);
    render(<BudgetWidget year={2026} month={5} spent={1200} />);
    expect(screen.getByText(/Over budget/i)).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-destructive");
    // Bar fill is clamped to 100%
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("renders skeleton while loading", () => {
    mockLoading = true;
    const { container } = render(
      <BudgetWidget year={2026} month={5} spent={0} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
