// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoalForm } from "./goal-form";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

const onSubmit = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit.mockResolvedValue({ error: null });
});

describe("GoalForm (KAN-65)", () => {
  it("pre-fills the name field when initialName is provided", () => {
    render(<GoalForm onSubmit={onSubmit} onClose={onClose} initialName="Holiday" />);
    const name = screen.getByLabelText(/Name/i) as HTMLInputElement;
    expect(name.value).toBe("Holiday");
  });

  it("validates required name on submit", async () => {
    render(<GoalForm onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create goal/i }));
    expect(await screen.findByText(/Name is required/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects target amount of 0 or less", async () => {
    render(<GoalForm onSubmit={onSubmit} onClose={onClose} initialName="x" />);
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create goal/i }));
    expect(await screen.findByText(/Must be greater than 0/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits parsed values and closes on success", async () => {
    render(<GoalForm onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Holiday" },
    });
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "1500.50" },
    });
    fireEvent.change(screen.getByLabelText(/Target date/i), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create goal/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Holiday",
        target_amount: 1500.5,
        target_date: "2026-12-01",
        icon: "piggy-bank",
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the form open and surfaces server error on failure", async () => {
    onSubmit.mockResolvedValueOnce({ error: "DB exploded" });
    render(<GoalForm onSubmit={onSubmit} onClose={onClose} initialName="x" />);
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create goal/i }));
    expect(await screen.findByText(/DB exploded/i)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("lets the user pick an icon", () => {
    render(<GoalForm onSubmit={onSubmit} onClose={onClose} />);
    const planeBtn = screen.getByRole("button", { name: /Choose plane icon/i });
    expect(planeBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(planeBtn);
    expect(planeBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
