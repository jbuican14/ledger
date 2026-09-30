import { describe, expect, test, vi } from "vitest";

// The hook module creates a Supabase client at import time. Stub it (and
// auth-context) so the pure helpers can be imported without env vars.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ household: null, profile: null }),
}));

import { buildInviteLink, inviteErrorMessage } from "./use-household-invites";

describe("buildInviteLink", () => {
  test("puts the token under /invite on the given origin", () => {
    expect(buildInviteLink("https://ledger.app", "abc-123")).toBe(
      "https://ledger.app/invite/abc-123",
    );
  });
});

describe("inviteErrorMessage", () => {
  test("translates a unique violation into a pending-invite message", () => {
    expect(
      inviteErrorMessage({ code: "23505", message: "duplicate key value" }),
    ).toBe("They already have a pending invite");
  });

  test("passes the function's own messages through", () => {
    expect(
      inviteErrorMessage({
        code: "P0001",
        message: "Waiting for them to confirm their email",
      }),
    ).toBe("Waiting for them to confirm their email");
  });
});
