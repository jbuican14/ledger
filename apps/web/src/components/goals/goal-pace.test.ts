import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { computeGoalPace } from "./goal-pace";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-13T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("computeGoalPace (KAN-67)", () => {
  it("returns reached when current meets or exceeds target", () => {
    expect(computeGoalPace(1000, 1000, null)).toEqual({ kind: "reached" });
    expect(computeGoalPace(1500, 1000, null)).toEqual({ kind: "reached" });
  });

  it("returns no-date when target_date is null", () => {
    expect(computeGoalPace(200, 1000, null)).toEqual({
      kind: "no-date",
      remaining: 800,
    });
  });

  it("returns overdue when target date is in the past", () => {
    const result = computeGoalPace(200, 1000, "2026-01-01");
    expect(result.kind).toBe("overdue");
    if (result.kind === "overdue") {
      expect(result.remaining).toBe(800);
    }
  });

  it("returns on-pace with per-month figure when target date is in the future", () => {
    // 3 calendar months away (May → Aug). £900 / 3 = £300/mo.
    const result = computeGoalPace(100, 1000, "2026-08-13");
    expect(result.kind).toBe("on-pace");
    if (result.kind === "on-pace") {
      expect(result.remaining).toBe(900);
      expect(result.monthsLeft).toBe(3);
      expect(result.perMonth).toBe(300);
    }
  });

  it("floors months-left to 1 when target is less than a month away", () => {
    // Target later this month — calendar months = 0; clamped to 1 so the
    // per-month figure stays meaningful instead of dividing by zero.
    const result = computeGoalPace(500, 1000, "2026-05-30");
    expect(result.kind).toBe("on-pace");
    if (result.kind === "on-pace") {
      expect(result.monthsLeft).toBe(1);
      expect(result.perMonth).toBe(500);
    }
  });
});
