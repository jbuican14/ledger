// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryManagement } from "./category-management";

const addCategory = vi.fn().mockResolvedValue({ error: null });
const deleteCategory = vi.fn().mockResolvedValue({ error: null });
const getCategoryUsage = vi.fn().mockResolvedValue({
  transactions: 0,
  recurring: 0,
  error: null,
});

const mockCategories: Array<{
  id: string;
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string | null;
}> = [];

vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({
    categories: mockCategories,
    expenseCategories: mockCategories.filter((c) => c.type === "expense"),
    incomeCategories: mockCategories.filter((c) => c.type === "income"),
    addCategory,
    deleteCategory,
    getCategoryUsage,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockCategories.length = 0;
  getCategoryUsage.mockResolvedValue({
    transactions: 0,
    recurring: 0,
    error: null,
  });
});

describe("CategoryManagement — name validation (KAN-55)", () => {
  function openAddSheet() {
    render(<CategoryManagement />);
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
      name: /Save Category/i,
    }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("clears error once a value is typed", () => {
    openAddSheet();
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    fireEvent.blur(nameInput);
    expect(screen.queryByText(/Name is required/i)).toBeTruthy();

    fireEvent.change(nameInput, { target: { value: "Gym" } });
    expect(screen.queryByText(/Name is required/i)).toBeNull();
    expect(nameInput.getAttribute("aria-invalid")).toBe("false");
  });
});

describe("CategoryManagement — icon picker (KAN-56)", () => {
  function openAddSheet() {
    render(<CategoryManagement />);
    const addBtn = screen.getAllByRole("button", { name: /Add/i })[0];
    fireEvent.click(addBtn!);
  }

  it("renders 20 preset icons as radio buttons", () => {
    openAddSheet();
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(20);
  });

  it("defaults to the first icon (home) selected", () => {
    openAddSheet();
    const homeIcon = screen.getByRole("radio", { name: "home" });
    expect(homeIcon.getAttribute("aria-checked")).toBe("true");
  });

  it("selects a different icon on click", () => {
    openAddSheet();
    const carIcon = screen.getByRole("radio", { name: "car" });
    fireEvent.click(carIcon);
    expect(carIcon.getAttribute("aria-checked")).toBe("true");
    const homeIcon = screen.getByRole("radio", { name: "home" });
    expect(homeIcon.getAttribute("aria-checked")).toBe("false");
  });

  it("passes the selected icon when saving", async () => {
    openAddSheet();
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Petrol" } });
    fireEvent.click(screen.getByRole("radio", { name: "fuel" }));
    fireEvent.click(screen.getByRole("button", { name: /Save Category/i }));
    expect(addCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Petrol", icon: "fuel" }),
    );
  });
});

describe("CategoryManagement — delete confirmation (KAN-56)", () => {
  it("deletes silently when category has zero references", async () => {
    mockCategories.push({
      id: "cat-1",
      name: "Empty",
      type: "expense",
      color: "#000",
      icon: null,
    });
    getCategoryUsage.mockResolvedValueOnce({
      transactions: 0,
      recurring: 0,
      error: null,
    });
    render(<CategoryManagement />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Empty/i }));

    await vi.waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith("cat-1");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows confirm dialog with transaction count when category is referenced", async () => {
    mockCategories.push({
      id: "cat-2",
      name: "Tuition",
      type: "expense",
      color: "#000",
      icon: null,
    });
    getCategoryUsage.mockResolvedValueOnce({
      transactions: 23,
      recurring: 1,
      error: null,
    });
    render(<CategoryManagement />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Tuition/i }));

    await vi.waitFor(() => {
      expect(screen.getByText(/Delete "Tuition"\?/i)).toBeTruthy();
    });
    expect(screen.getByText(/23/)).toBeTruthy();
    expect(screen.getByText(/past transactions/i)).toBeTruthy();
    expect(screen.getByText(/recurring rule/i)).toBeTruthy();
    expect(deleteCategory).not.toHaveBeenCalled();
  });

  it("deletes when user confirms in dialog", async () => {
    mockCategories.push({
      id: "cat-3",
      name: "Tuition",
      type: "expense",
      color: "#000",
      icon: null,
    });
    getCategoryUsage.mockResolvedValueOnce({
      transactions: 5,
      recurring: 0,
      error: null,
    });
    render(<CategoryManagement />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Tuition/i }));

    await vi.waitFor(() => {
      expect(screen.getByText(/Delete "Tuition"\?/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete category/i }));

    await vi.waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith("cat-3");
    });
  });

  it("does not delete when user cancels", async () => {
    mockCategories.push({
      id: "cat-4",
      name: "Tuition",
      type: "expense",
      color: "#000",
      icon: null,
    });
    getCategoryUsage.mockResolvedValueOnce({
      transactions: 5,
      recurring: 0,
      error: null,
    });
    render(<CategoryManagement />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Tuition/i }));

    await vi.waitFor(() => {
      expect(screen.getByText(/Delete "Tuition"\?/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(deleteCategory).not.toHaveBeenCalled();
  });
});
