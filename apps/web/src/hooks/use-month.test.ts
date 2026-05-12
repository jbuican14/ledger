// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMonth, getMonthRange } from "./use-month";

// Mocks for next/navigation — capture push calls and let tests drive search params.
const { mockPush, searchParamsHolder, mockPathname } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  // Holder lets each test set the URLSearchParams instance the hook reads.
  searchParamsHolder: { current: new URLSearchParams() },
  mockPathname: "/transactions",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => searchParamsHolder.current,
  usePathname: () => mockPathname,
}));

function setMonthParam(value: string | null) {
  searchParamsHolder.current = new URLSearchParams(
    value === null ? "" : `month=${value}`,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Freeze "today" at 2026-05-15 so canGoNext / clamping is deterministic.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 15)); // month index 4 = May
  setMonthParam(null);
});

describe("getMonthRange", () => {
  it("returns first and last day of a 31-day month", () => {
    expect(getMonthRange(2026, 5)).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });
  });

  it("handles February in a leap year", () => {
    expect(getMonthRange(2024, 2)).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });

  it("handles February in a non-leap year", () => {
    expect(getMonthRange(2026, 2)).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });
});

describe("useMonth — defaults", () => {
  it("defaults to current real-world month when no URL param", () => {
    const { result } = renderHook(() => useMonth());
    expect(result.current.year).toBe(2026);
    expect(result.current.month).toBe(5);
    expect(result.current.isCurrent).toBe(true);
    expect(result.current.canGoNext).toBe(false);
  });

  it("exposes the current month range", () => {
    const { result } = renderHook(() => useMonth());
    expect(result.current.range).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });
  });
});

describe("useMonth — URL param", () => {
  it("parses ?month=2026-04 to April 2026", () => {
    setMonthParam("2026-04");
    const { result } = renderHook(() => useMonth());
    expect(result.current.year).toBe(2026);
    expect(result.current.month).toBe(4);
    expect(result.current.isCurrent).toBe(false);
    expect(result.current.canGoNext).toBe(true);
  });

  it("ignores malformed ?month and falls back to current", () => {
    setMonthParam("not-a-month");
    const { result } = renderHook(() => useMonth());
    expect(result.current.year).toBe(2026);
    expect(result.current.month).toBe(5);
  });

  it("clamps future ?month back to current real-world month", () => {
    setMonthParam("2027-01");
    const { result } = renderHook(() => useMonth());
    expect(result.current.year).toBe(2026);
    expect(result.current.month).toBe(5);
    expect(result.current.isCurrent).toBe(true);
  });
});

describe("useMonth — navigation", () => {
  it("prev() pushes URL with previous month", () => {
    const { result } = renderHook(() => useMonth());
    act(() => result.current.prev());
    expect(mockPush).toHaveBeenCalledWith("/transactions?month=2026-04");
  });

  it("prev() across a year boundary goes from Jan to Dec of prev year", () => {
    setMonthParam("2026-01");
    const { result } = renderHook(() => useMonth());
    act(() => result.current.prev());
    expect(mockPush).toHaveBeenCalledWith("/transactions?month=2025-12");
  });

  it("next() pushes URL with following month when not at current", () => {
    setMonthParam("2026-03");
    const { result } = renderHook(() => useMonth());
    act(() => result.current.next());
    expect(mockPush).toHaveBeenCalledWith("/transactions?month=2026-04");
  });

  it("next() is a no-op when already at current month", () => {
    const { result } = renderHook(() => useMonth());
    act(() => result.current.next());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("next() drops ?month param when arriving at current month", () => {
    setMonthParam("2026-04");
    const { result } = renderHook(() => useMonth());
    act(() => result.current.next());
    expect(mockPush).toHaveBeenCalledWith("/transactions");
  });
});

describe("useMonth — goTo and today", () => {
  it("goTo() pushes URL with target month", () => {
    const { result } = renderHook(() => useMonth());
    act(() => result.current.goTo(2025, 7));
    expect(mockPush).toHaveBeenCalledWith("/transactions?month=2025-07");
  });

  it("goTo() ignores future months", () => {
    const { result } = renderHook(() => useMonth());
    act(() => result.current.goTo(2026, 6));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("goTo(currentYear, currentMonth) drops ?month param", () => {
    setMonthParam("2026-02");
    const { result } = renderHook(() => useMonth());
    act(() => result.current.goTo(2026, 5));
    expect(mockPush).toHaveBeenCalledWith("/transactions");
  });

  it("today() clears ?month param", () => {
    setMonthParam("2026-02");
    const { result } = renderHook(() => useMonth());
    act(() => result.current.today());
    expect(mockPush).toHaveBeenCalledWith("/transactions");
  });
});
