// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentMethodManagement } from "./payment-method-management";

const addPaymentMethod = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/hooks/use-payment-methods", () => ({
  usePaymentMethods: () => ({
    paymentMethods: [],
    addPaymentMethod,
    deletePaymentMethod: vi.fn().mockResolvedValue({ error: null }),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PaymentMethodManagement — name validation (KAN-55)", () => {
  function openAddSheet() {
    render(<PaymentMethodManagement />);
    const addBtn = screen.getAllByRole("button", { name: /Add/i })[0];
    fireEvent.click(addBtn!);
  }

  it("shows inline error after blurring with a blank name", () => {
    openAddSheet();
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    fireEvent.blur(nameInput);
    expect(screen.getByText(/Name is required/i)).toBeTruthy();
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("disables save button when name is blank", () => {
    openAddSheet();
    const saveBtn = screen.getByRole("button", {
      name: /Save payment method/i,
    }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("clears error once a value is typed", () => {
    openAddSheet();
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    fireEvent.blur(nameInput);
    expect(screen.queryByText(/Name is required/i)).toBeTruthy();

    fireEvent.change(nameInput, { target: { value: "Cash" } });
    expect(screen.queryByText(/Name is required/i)).toBeNull();
    expect(nameInput.getAttribute("aria-invalid")).toBe("false");
  });
});
