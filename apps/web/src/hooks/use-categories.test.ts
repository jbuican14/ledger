// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCategories } from "./use-categories";
import type { Category } from "@/types/database";

// ── Mocks ──────────────────────────────────────────────────────────────────

// vi.hoisted ensures mockFrom exists before vi.mock factories execute.
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: { id: "hh-1" } }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    household_id: "hh-1",
    name: "Groceries",
    color: "#22C55E",
    icon: "shopping-cart",
    type: "expense",
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

type DbResult = { data: unknown; error: unknown };

/**
 * Builds a Supabase query builder stub that is itself a thenable so that
 *   await supabase.from().select().eq().order().order()
 * resolves correctly regardless of how many chainable methods are called.
 */
function queryStub(result: DbResult) {
  const insertFn = vi.fn().mockResolvedValue(result);
  const deleteEqFn = vi.fn().mockResolvedValue(result);
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEqFn });

  // Duck-typed thenable — `await` only needs a `.then` method, not a full
  // PromiseLike implementation. Avoids the strict generic variance checks
  // TypeScript enforces when the object is annotated as PromiseLike<T>.
  const stub = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: insertFn,
    delete: deleteFn,
    then(
      onfulfilled?: ((v: DbResult) => unknown) | null,
      onrejected?: ((e: unknown) => unknown) | null,
    ) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };

  return { stub, insertFn, deleteFn, deleteEqFn };
}

// ── beforeEach ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useCategories — initial fetch", () => {
  it("fetches and exposes categories on mount", async () => {
    const cats = [
      makeCategory({ id: "c1", type: "expense" }),
      makeCategory({ id: "c2", type: "income", name: "Salary" }),
    ];
    const { stub } = queryStub({ data: cats, error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toHaveLength(2);
  });

  it("splits categories into expenseCategories and incomeCategories", async () => {
    const cats = [
      makeCategory({ id: "c1", type: "expense", name: "Bills" }),
      makeCategory({ id: "c2", type: "income", name: "Salary" }),
      makeCategory({ id: "c3", type: "expense", name: "Food" }),
    ];
    const { stub } = queryStub({ data: cats, error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.expenseCategories).toHaveLength(2);
    expect(result.current.incomeCategories).toHaveLength(1);
    expect(result.current.incomeCategories[0]?.name).toBe("Salary");
  });

  it("sets error when fetch fails", async () => {
    const { stub } = queryStub({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("DB error");
    expect(result.current.categories).toHaveLength(0);
  });
});

describe("useCategories — addCategory", () => {
  it("inserts with sort_order one above the current max for that type", async () => {
    const existing = [
      makeCategory({ id: "c1", type: "expense", sort_order: 1 }),
      makeCategory({ id: "c2", type: "expense", sort_order: 3 }),
    ];

    const { stub: fetchStub, insertFn } = queryStub({ data: existing, error: null });
    insertFn.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(fetchStub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addCategory({ name: "Gym", type: "expense", color: "#3B82F6" });
    });

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 4 }) // max(1,3) + 1
    );
  });

  it("starts sort_order at 1 when no categories of that type exist yet", async () => {
    const incomeOnly = [makeCategory({ id: "c1", type: "income", sort_order: 5 })];
    const { stub, insertFn } = queryStub({ data: incomeOnly, error: null });
    insertFn.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addCategory({ name: "Freelance", type: "expense", color: "#22C55E" });
    });

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 1 })
    );
  });

  it("returns the Supabase error message when insert fails", async () => {
    const { stub, insertFn } = queryStub({ data: [], error: null });
    insertFn.mockResolvedValue({ data: null, error: { message: "duplicate key" } });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response!: { error: string | null };
    await act(async () => {
      response = await result.current.addCategory({ name: "Gym", type: "expense", color: "#3B82F6" });
    });

    expect(response.error).toBe("duplicate key");
  });

  it("passes household_id and trimmed name to the insert", async () => {
    const { stub, insertFn } = queryStub({ data: [], error: null });
    insertFn.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addCategory({ name: "  Gym  ", type: "expense", color: "#3B82F6" });
    });

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ household_id: "hh-1", name: "Gym", type: "expense", color: "#3B82F6" })
    );
  });
});

describe("useCategories — deleteCategory", () => {
  it("removes the category from local state immediately (optimistic)", async () => {
    const cats = [
      makeCategory({ id: "c1", name: "Bills" }),
      makeCategory({ id: "c2", name: "Food" }),
    ];
    const { stub } = queryStub({ data: cats, error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(2));

    await act(async () => {
      await result.current.deleteCategory("c1");
    });

    expect(result.current.categories).toHaveLength(1);
    expect(result.current.categories[0]?.name).toBe("Food");
  });

  it("calls delete with the correct category id", async () => {
    const { stub, deleteEqFn } = queryStub({ data: [makeCategory()], error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteCategory("cat-1");
    });

    expect(deleteEqFn).toHaveBeenCalledWith("id", "cat-1");
  });

  it("returns the Supabase error message when delete fails", async () => {
    const { stub, deleteEqFn } = queryStub({ data: [makeCategory()], error: null });
    deleteEqFn.mockResolvedValue({ data: null, error: { message: "RLS violation" } });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response!: { error: string | null };
    await act(async () => {
      response = await result.current.deleteCategory("cat-1");
    });

    expect(response.error).toBe("RLS violation");
  });

  it("does not alter local state when delete fails", async () => {
    const cats = [makeCategory({ id: "c1" })];
    const { stub, deleteEqFn } = queryStub({ data: cats, error: null });
    deleteEqFn.mockResolvedValue({ data: null, error: { message: "oops" } });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(1));

    await act(async () => {
      await result.current.deleteCategory("c1");
    });

    expect(result.current.categories).toHaveLength(1);
  });
});
