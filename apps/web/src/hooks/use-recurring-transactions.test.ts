import { describe, expect, test, vi } from "vitest";

// `use-recurring-transactions` imports the Supabase client at module scope
// (via auth-context). Stub both so the import succeeds in the test env where
// NEXT_PUBLIC_* env vars aren't set.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: vi.fn() }),
}));
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: null, household: null }),
}));

import { advanceDueDate } from "./use-recurring-transactions";

describe("advanceDueDate", () => {
  test("advances weekly by 7 days", () => {
    expect(advanceDueDate("2026-05-01", "weekly")).toBe("2026-05-08");
  });

  test("advances monthly to the same day next month", () => {
    expect(advanceDueDate("2026-05-15", "monthly")).toBe("2026-06-15");
  });

  test("advances monthly across year boundary", () => {
    expect(advanceDueDate("2026-12-15", "monthly")).toBe("2027-01-15");
  });

  test("advances monthly clamps to last day when target month is shorter", () => {
    // Jan 31 → Feb 28 (2026 is not a leap year). date-fns clamps to the
    // last valid day of the target month rather than overflowing to March.
    expect(advanceDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  test("advances yearly to same day next year", () => {
    expect(advanceDueDate("2026-12-25", "yearly")).toBe("2027-12-25");
  });

  test("advances yearly clamps Feb 29 to Feb 28 in non-leap years", () => {
    expect(advanceDueDate("2024-02-29", "yearly")).toBe("2025-02-28");
  });
});
