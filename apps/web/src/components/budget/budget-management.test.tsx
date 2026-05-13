// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetManagement } from "./budget-management";
import type { Budget } from "@/types/database";

const setAmount = vi.fn().mockResolvedValue({ error: null });
const clearBudget = vi.fn().mockResolvedValue({ error: null });

let mockBudget: Budget | null = null;
let mockLoading = false;

vi.mock("@/hooks/use-budget", () => ({
  useBudget: () => ({
    budget: mockBudget,
    setAmount,
    clearBudget,
    isLoading: mockLoading,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockBudget = null;
  mockLoading = false;
});

describe("BudgetManagement (KAN-59)", () => {
  it("shows 'Set budget' button when no budget exists", () => {
    render(<BudgetManagement />);
    expect(screen.getByRole("button", { name: /Set budget/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Clear/i })).toBeNull();
  });

  it("pre-fills the input with the existing budget amount", () => {
    mockBudget = {
      id: "b-1",
      household_id: "hh-1",
      year: 2026,
      month: 5,
      amount: 1500,
      created_at: "",
      updated_at: "",
    };
    render(<BudgetManagement />);
    const input = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    expect(input.value).toBe("1500");
    expect(screen.getByRole("button", { name: /Update budget/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Clear/i })).toBeTruthy();
  });

  it("disables save until value changes", () => {
    mockBudget = {
      id: "b-1",
      household_id: "hh-1",
      year: 2026,
      month: 5,
      amount: 1500,
      created_at: "",
      updated_at: "",
    };
    render(<BudgetManagement />);
    const saveBtn = screen.getByRole("button", {
      name: /Update budget/i,
    }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    const input = screen.getByLabelText(/Amount/i);
    fireEvent.change(input, { target: { value: "1800" } });
    expect(saveBtn.disabled).toBe(false);
  });

  it("validates negative amounts on blur", () => {
    render(<BudgetManagement />);
    const input = screen.getByLabelText(/Amount/i);
    fireEvent.change(input, { target: { value: "-50" } });
    fireEvent.blur(input);
    expect(screen.getByText(/cannot be negative/i)).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("calls setAmount with parsed number on save", async () => {
    render(<BudgetManagement />);
    const input = screen.getByLabelText(/Amount/i);
    fireEvent.change(input, { target: { value: "2000.50" } });
    fireEvent.click(screen.getByRole("button", { name: /Set budget/i }));
    await waitFor(() => {
      expect(setAmount).toHaveBeenCalledWith(2000.5);
    });
  });

  it("disables Set budget while input is empty", () => {
    render(<BudgetManagement />);
    const saveBtn = screen.getByRole("button", {
      name: /Set budget/i,
    }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("calls clearBudget when Clear button is clicked", async () => {
    mockBudget = {
      id: "b-1",
      household_id: "hh-1",
      year: 2026,
      month: 5,
      amount: 1500,
      created_at: "",
      updated_at: "",
    };
    render(<BudgetManagement />);
    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    await waitFor(() => {
      expect(clearBudget).toHaveBeenCalled();
    });
  });

  it("shows a skeleton while loading", () => {
    mockLoading = true;
    render(<BudgetManagement />);
    expect(screen.queryByLabelText(/Amount/i)).toBeNull();
  });
});
