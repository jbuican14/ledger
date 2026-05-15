// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContributionForm } from "./contribution-form";
import type { GoalContribution } from "@/types/database";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1", currency: "GBP" } }),
}));

const onSubmit = vi.fn();
const onDelete = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit.mockResolvedValue({ error: null });
  onDelete.mockResolvedValue({ error: null });
});

const existingDeposit: GoalContribution = {
  id: "c-1",
  goal_id: "g-1",
  household_id: "hh-1",
  amount: 200,
  note: "Bonus",
  contributed_at: "2026-05-01",
  created_at: "",
  updated_at: "",
};

const existingWithdrawal: GoalContribution = {
  ...existingDeposit,
  id: "c-2",
  amount: -50,
  note: "Vet bill",
};

describe("ContributionForm (KAN-68)", () => {
  it("defaults to Deposit direction for a new entry", () => {
    render(<ContributionForm onSubmit={onSubmit} onClose={onClose} />);
    const deposit = screen.getByRole("button", { name: /^Deposit$/ });
    const withdraw = screen.getByRole("button", { name: /^Withdraw$/ });
    expect(deposit.getAttribute("aria-pressed")).toBe("true");
    expect(withdraw.getAttribute("aria-pressed")).toBe("false");
  });

  it("opens on the Withdraw tab when defaultDirection='withdraw'", () => {
    render(
      <ContributionForm
        defaultDirection="withdraw"
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^Withdraw$/ }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    // Still a NEW entry — submit verb is "Record withdrawal", not "Save changes"
    expect(
      screen.getByRole("button", { name: /Record withdrawal/i }),
    ).toBeTruthy();
    // Amount and note are blank, not pre-filled from a fake initialData
    expect((screen.getByLabelText(/Amount/i) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/Note/i) as HTMLInputElement).value).toBe("");
  });

  it("submits a positive signed amount for a deposit", async () => {
    render(<ContributionForm onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Date/i), {
      target: { value: "2026-05-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add deposit/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        amount: 100,
        note: null,
        contributed_at: "2026-05-15",
      });
    });
  });

  it("submits a negative signed amount when Withdraw is selected", async () => {
    render(<ContributionForm onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^Withdraw$/ }));
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: "50" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Record withdrawal/i }),
    );
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: -50 }),
      );
    });
  });

  it("rejects amount of 0 or less", async () => {
    render(<ContributionForm onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add deposit/i }));
    expect(await screen.findByText(/Must be greater than 0/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pre-fills as Withdraw when editing a negative-amount entry", () => {
    render(
      <ContributionForm
        initialData={existingWithdrawal}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /^Withdraw$/ })).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    const amount = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    expect(amount.value).toBe("50");
  });

  it("pre-fills as Deposit when editing a positive-amount entry", () => {
    render(
      <ContributionForm
        initialData={existingDeposit}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /^Deposit$/ })).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    const note = screen.getByLabelText(/Note/i) as HTMLInputElement;
    expect(note.value).toBe("Bonus");
  });

  it("renders the Delete button only in edit mode with onDelete", async () => {
    const { rerender } = render(
      <ContributionForm onSubmit={onSubmit} onClose={onClose} />,
    );
    expect(screen.queryByRole("button", { name: /Delete this entry/i })).toBeNull();

    rerender(
      <ContributionForm
        initialData={existingDeposit}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete this entry/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("converts an empty note to null on submit", async () => {
    render(<ContributionForm onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Note/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add deposit/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ note: null }),
      );
    });
  });
});
