// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTransactions } from "./use-transactions";
import type { TransactionWithCategory } from "@/types/database";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    household: { id: "hh-1" },
  }),
}));

function makeTx(
  overrides: Partial<TransactionWithCategory> = {},
): TransactionWithCategory {
  return {
    id: "tx-1",
    household_id: "hh-1",
    user_id: "user-1",
    category_id: null,
    payment_method_id: null,
    amount: -10,
    description: null,
    transaction_date: "2026-05-15",
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
    deleted_at: null,
    category: null,
    payment_method: null,
    ...overrides,
  } as TransactionWithCategory;
}

type DbResult = { data: unknown; error: unknown };

/**
 * Builds a Supabase query builder stub. Captures every chainable call so
 * tests can assert .gte("transaction_date", ...) was issued.
 */
function queryStub(result: DbResult) {
  const calls: { method: string; args: unknown[] }[] = [];
  const track =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return stub;
    };

  const singleFn = vi.fn().mockResolvedValue(result);
  const insertSelect = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelect });

  const stub: {
    select: (...args: unknown[]) => typeof stub;
    eq: (...args: unknown[]) => typeof stub;
    is: (...args: unknown[]) => typeof stub;
    gte: (...args: unknown[]) => typeof stub;
    lte: (...args: unknown[]) => typeof stub;
    order: (...args: unknown[]) => typeof stub;
    insert: typeof insertFn;
    update: ReturnType<typeof vi.fn>;
    then(
      onfulfilled?: ((v: DbResult) => unknown) | null,
      onrejected?: ((e: unknown) => unknown) | null,
    ): Promise<unknown>;
  } = {
    select: track("select"),
    eq: track("eq"),
    is: track("is"),
    gte: track("gte"),
    lte: track("lte"),
    order: track("order"),
    insert: insertFn,
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: singleFn }),
      }),
    }),
    then(onfulfilled, onrejected) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };

  return { stub, calls, insertFn, singleFn };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTransactions — range filtering", () => {
  it("does not call gte/lte when no range is provided", async () => {
    const { stub, calls } = queryStub({ data: [], error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(calls.find((c) => c.method === "gte")).toBeUndefined();
    expect(calls.find((c) => c.method === "lte")).toBeUndefined();
  });

  it("issues gte and lte on transaction_date when range is provided", async () => {
    const { stub, calls } = queryStub({ data: [], error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() =>
      useTransactions({ from: "2026-05-01", to: "2026-05-31" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(calls).toContainEqual({
      method: "gte",
      args: ["transaction_date", "2026-05-01"],
    });
    expect(calls).toContainEqual({
      method: "lte",
      args: ["transaction_date", "2026-05-31"],
    });
  });

  it("re-fetches when the range changes", async () => {
    const { stub } = queryStub({ data: [], error: null });
    mockFrom.mockReturnValue(stub);

    const { rerender } = renderHook(
      ({ from, to }) => useTransactions({ from, to }),
      { initialProps: { from: "2026-05-01", to: "2026-05-31" } },
    );
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(1));

    rerender({ from: "2026-04-01", to: "2026-04-30" });
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2));
  });
});

describe("useTransactions — mutations respect range", () => {
  it("does not add a new transaction to state if its date is outside the range", async () => {
    const fetchStub = queryStub({ data: [], error: null });
    const insertResult = makeTx({ id: "tx-new", transaction_date: "2026-04-10" });
    fetchStub.singleFn.mockResolvedValue({ data: insertResult, error: null });
    mockFrom.mockReturnValue(fetchStub.stub);

    const { result } = renderHook(() =>
      // Viewing May, adding a row dated April
      useTransactions({ from: "2026-05-01", to: "2026-05-31" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTransaction({
        amount: "10",
        description: "out-of-range",
        category_id: "",
        payment_method_id: "",
        transaction_date: "2026-04-10",
        is_income: false,
      });
    });

    expect(result.current.transactions).toHaveLength(0);
  });

  it("adds an in-range new transaction to state optimistically", async () => {
    const fetchStub = queryStub({ data: [], error: null });
    const insertResult = makeTx({ id: "tx-new", transaction_date: "2026-05-20" });
    fetchStub.singleFn.mockResolvedValue({ data: insertResult, error: null });
    mockFrom.mockReturnValue(fetchStub.stub);

    const { result } = renderHook(() =>
      useTransactions({ from: "2026-05-01", to: "2026-05-31" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTransaction({
        amount: "10",
        description: "in-range",
        category_id: "",
        payment_method_id: "",
        transaction_date: "2026-05-20",
        is_income: false,
      });
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0]?.id).toBe("tx-new");
  });
});
