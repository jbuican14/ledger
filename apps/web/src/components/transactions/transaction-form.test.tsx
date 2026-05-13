// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { format, endOfMonth, addDays } from "date-fns";
import { TransactionForm } from "./transaction-form";
import type { TransactionWithCategory } from "@/types/database";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    household: { id: "hh-1", currency: "GBP" },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TransactionForm — future-date blocking (KAN-35)", () => {
  const todayEom = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const nextMonthDay = format(
    addDays(endOfMonth(new Date()), 1),
    "yyyy-MM-dd",
  );
  const FUTURE_MSG = /Future months are managed by Recurring/i;

  function renderForm(
    overrides: Partial<React.ComponentProps<typeof TransactionForm>> = {},
  ) {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const props = {
      categories: [],
      paymentMethods: [],
      onSubmit,
      onClose,
      ...overrides,
    };
    const utils = render(<TransactionForm {...props} />);
    return { ...utils, onSubmit, onClose };
  }

  it("sets the date input max to the last day of current month", () => {
    renderForm();
    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    expect(dateInput.max).toBe(todayEom);
  });

  it("shows inline error after blurring with a future-month date", () => {
    renderForm();
    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: nextMonthDay } });
    fireEvent.blur(dateInput);
    expect(screen.getByText(FUTURE_MSG)).toBeTruthy();
    expect(dateInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("blocks submit when date is in a future month", async () => {
    const { onSubmit } = renderForm();
    const amountInput = screen.getByLabelText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: "10" } });

    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: nextMonthDay } });

    const submitButton = screen.getByRole("button", {
      name: /Add Transaction/i,
    });
    fireEvent.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(FUTURE_MSG)).toBeTruthy();
  });

  it("submits when date is in current month and amount is valid", async () => {
    const { onSubmit } = renderForm();
    const amountInput = screen.getByLabelText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: "10" } });

    const submitButton = screen.getByRole("button", {
      name: /Add Transaction/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("blocks edit submit when date is moved into a future month", () => {
    const initialData: TransactionWithCategory = {
      id: "tx-1",
      household_id: "hh-1",
      user_id: "user-1",
      category_id: null,
      payment_method_id: null,
      amount: -10,
      description: "test",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      created_at: "",
      updated_at: "",
      deleted_at: null,
      category: null,
      payment_method: null,
    } as TransactionWithCategory;
    const { onSubmit } = renderForm({ initialData });

    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: nextMonthDay } });

    const submitButton = screen.getByRole("button", { name: /^Update$/i });
    fireEvent.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(FUTURE_MSG)).toBeTruthy();
  });

  it("clears the error when a future date is corrected back to current month", () => {
    renderForm();
    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: nextMonthDay } });
    fireEvent.blur(dateInput);
    expect(screen.queryByText(FUTURE_MSG)).toBeTruthy();

    fireEvent.change(dateInput, { target: { value: todayEom } });
    fireEvent.blur(dateInput);
    expect(screen.queryByText(FUTURE_MSG)).toBeNull();
  });
});

describe("TransactionForm — amount validation (KAN-55)", () => {
  function renderForm(
    overrides: Partial<React.ComponentProps<typeof TransactionForm>> = {},
  ) {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const props = {
      categories: [],
      paymentMethods: [],
      onSubmit,
      onClose,
      ...overrides,
    };
    const utils = render(<TransactionForm {...props} />);
    return { ...utils, onSubmit, onClose };
  }

  it("shows inline error after blurring with empty amount", () => {
    renderForm();
    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    fireEvent.blur(amountInput);
    expect(screen.getByText(/Amount is required/i)).toBeTruthy();
    expect(amountInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("shows inline error after blurring with zero", () => {
    renderForm();
    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: "0" } });
    fireEvent.blur(amountInput);
    expect(screen.getByText(/greater than 0/i)).toBeTruthy();
    expect(amountInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("blocks submit when amount is invalid", () => {
    const { onSubmit } = renderForm();
    const submitButton = screen.getByRole("button", {
      name: /Add Transaction/i,
    });
    fireEvent.click(submitButton);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Amount is required/i)).toBeTruthy();
  });

  it("clears amount error when a valid value is typed", () => {
    renderForm();
    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    fireEvent.blur(amountInput);
    expect(screen.queryByText(/Amount is required/i)).toBeTruthy();

    fireEvent.change(amountInput, { target: { value: "10" } });
    expect(screen.queryByText(/Amount is required/i)).toBeNull();
    expect(amountInput.getAttribute("aria-invalid")).toBe("false");
  });
});
