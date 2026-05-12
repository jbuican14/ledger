// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useMonthTotal,
  invalidateMonthTotal,
  __clearMonthTotalsCache,
} from "./use-month-total";

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

type DbResult = { data: unknown; error: unknown };

/**
 * Minimal Supabase builder stub that resolves at the end of the chain.
 * The hook only chains select → eq → is → gte → lte, then awaits the result.
 */
function fetchStub(result: DbResult) {
  const calls: { method: string; args: unknown[] }[] = [];
  const track =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return stub;
    };
  const stub: {
    select: (...args: unknown[]) => typeof stub;
    eq: (...args: unknown[]) => typeof stub;
    is: (...args: unknown[]) => typeof stub;
    gte: (...args: unknown[]) => typeof stub;
    lte: (...args: unknown[]) => typeof stub;
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
    then(onfulfilled, onrejected) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };
  return { stub, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
  __clearMonthTotalsCache();
});

describe("useMonthTotal", () => {
  it("computes expenses as the sum of absolute negative amounts", async () => {
    const { stub } = fetchStub({
      data: [{ amount: -10 }, { amount: -20.5 }, { amount: 5 }],
      error: null,
    });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.expenses).toBeCloseTo(30.5);
    expect(result.current.income).toBe(5);
  });

  it("issues a date-range filter for the requested month", async () => {
    const { stub, calls } = fetchStub({ data: [], error: null });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(calls).toContainEqual({
      method: "gte",
      args: ["transaction_date", "2026-04-01"],
    });
    expect(calls).toContainEqual({
      method: "lte",
      args: ["transaction_date", "2026-04-30"],
    });
  });

  it("hits the cache on the second render with the same month", async () => {
    const { stub } = fetchStub({
      data: [{ amount: -10 }],
      error: null,
    });
    mockFrom.mockReturnValue(stub);

    const first = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledTimes(1);

    // Second hook for the same household + month should serve from cache.
    const second = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(second.result.current.expenses).toBe(10);
  });

  it("re-fetches when invalidateMonthTotal is called for its month", async () => {
    const { stub: stubA } = fetchStub({
      data: [{ amount: -10 }],
      error: null,
    });
    mockFrom.mockReturnValue(stubA);

    const { result } = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.expenses).toBe(10);

    // Swap in fresh data, then invalidate.
    const { stub: stubB } = fetchStub({
      data: [{ amount: -30 }],
      error: null,
    });
    mockFrom.mockReturnValue(stubB);

    act(() => {
      invalidateMonthTotal("hh-1", 2026, 4);
    });

    await waitFor(() => expect(result.current.expenses).toBe(30));
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("does NOT re-fetch when a different month is invalidated", async () => {
    const { stub } = fetchStub({
      data: [{ amount: -10 }],
      error: null,
    });
    mockFrom.mockReturnValue(stub);

    const { result } = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      invalidateMonthTotal("hh-1", 2026, 5);
    });

    // Give any erroneous re-fetch a tick to land.
    await new Promise((r) => setTimeout(r, 10));
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("caches per (household, year, month) — different months fetch separately", async () => {
    const { stub } = fetchStub({ data: [], error: null });
    mockFrom.mockReturnValue(stub);

    const { result: r1 } = renderHook(() => useMonthTotal(2026, 3));
    await waitFor(() => expect(r1.current.isLoading).toBe(false));

    const { result: r2 } = renderHook(() => useMonthTotal(2026, 4));
    await waitFor(() => expect(r2.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
