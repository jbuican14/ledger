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

  // ── edit mode (KAN-69) ──
  const editGoal = {
    id: "g-1",
    household_id: "hh-1",
    name: "Holiday",
    target_amount: 2000,
    current_amount: 500,
    target_date: "2026-12-01",
    icon: "plane",
    status: "active" as const,
    created_at: "",
    updated_at: "",
  };

  it("pre-fills all fields and shows Save changes label in edit mode", () => {
    render(
      <GoalForm initialData={editGoal} onSubmit={onSubmit} onClose={onClose} />,
    );
    expect((screen.getByLabelText(/Name/i) as HTMLInputElement).value).toBe(
      "Holiday",
    );
    expect((screen.getByLabelText(/Target amount/i) as HTMLInputElement).value).toBe(
      "2000",
    );
    expect((screen.getByLabelText(/Target date/i) as HTMLInputElement).value).toBe(
      "2026-12-01",
    );
    expect(
      screen
        .getByRole("button", { name: /Choose plane icon/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeTruthy();
  });

  it("blocks lowering target_amount below current_amount", async () => {
    render(
      <GoalForm initialData={editGoal} onSubmit={onSubmit} onClose={onClose} />,
    );
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "300" }, // below current_amount of 500
    });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(await screen.findByText(/Can't go below £500/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("permits raising target above current_amount", async () => {
    render(
      <GoalForm initialData={editGoal} onSubmit={onSubmit} onClose={onClose} />,
    );
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "3000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ target_amount: 3000 }),
      );
    });
  });
});
