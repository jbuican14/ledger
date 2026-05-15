// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalsWidget } from "./goals-widget";
import type { Goal } from "@/types/database";

let mockActive: Goal[] = [];
let mockLoading = false;

vi.mock("@/hooks/use-goals", () => ({
  useGoals: () => ({
    goals: mockActive,
    activeGoals: mockActive,
    archivedGoals: [],
    completedGoals: [],
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    isLoading: mockLoading,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

beforeEach(() => {
  mockActive = [];
  mockLoading = false;
});

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "g-1",
  household_id: "hh-1",
  name: "Holiday",
  target_amount: 1000,
  current_amount: 250,
  target_date: null,
  icon: "plane",
  status: "active",
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("GoalsWidget (KAN-66)", () => {
  it("renders empty-state CTA when there are no active goals", () => {
    render(<GoalsWidget />);
    expect(screen.getByText(/Savings goals/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Create your first goal/i }),
    ).toBeTruthy();
  });

  it("renders up to 3 active goals and a See all link", () => {
    mockActive = [
      makeGoal({ id: "g1", name: "Holiday" }),
      makeGoal({ id: "g2", name: "Car" }),
      makeGoal({ id: "g3", name: "Emergency" }),
      makeGoal({ id: "g4", name: "Wedding" }),
      makeGoal({ id: "g5", name: "Laptop" }),
    ];
    render(<GoalsWidget />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/Showing 3 of 5/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /See all goals/i })).toBeTruthy();
  });

  it("omits the count label when total is <= 3", () => {
    mockActive = [makeGoal({ id: "g1" }), makeGoal({ id: "g2" })];
    render(<GoalsWidget />);
    expect(screen.queryByText(/Showing/i)).toBeNull();
  });

  it("renders a progress bar with the correct percentage", () => {
    mockActive = [makeGoal({ current_amount: 750, target_amount: 1000 })];
    render(<GoalsWidget />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
  });

  it("clamps the bar at 100 when current exceeds target", () => {
    mockActive = [makeGoal({ current_amount: 1500, target_amount: 1000 })];
    render(<GoalsWidget />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("renders a skeleton while loading", () => {
    mockLoading = true;
    const { container } = render(<GoalsWidget />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /See all goals/i })).toBeNull();
  });
});
