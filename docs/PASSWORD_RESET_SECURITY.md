# Known Gap: `/reset-password` is reachable by any signed-in user

> **Logged:** 2026-08-28
> **Severity:** Low for MVP — requires an already-compromised session
> **Status:** Accepted, not yet mitigated
> **Affected:** `apps/web/src/app/(auth)/reset-password/page.tsx`, `apps/web/src/middleware.ts`

---

## The gap

`/reset-password` changes a password **without asking for the current one**. The only
thing authorising that is the presence of a valid session.

The page cannot tell *which kind* of session it has:

```ts
supabase.auth.getUser().then(({ data: { user } }) => {
  setLinkState(user ? 'valid' : 'invalid');
});
```

A session created by clicking a recovery email link and a session created by signing in
normally an hour ago are indistinguishable here — both are just valid sessions.

Middleware deliberately exempts the route so recovery links can reach it:

```ts
// middleware.ts
const authExemptRoutes = ["/auth/callback", "/reset-password"];
```

Combined: **any signed-in user can navigate to `/reset-password` and set a new password
without proving they know the old one.**

## Why the exemption exists

A recovery link *creates a real session* — that session is how `updateUser({ password })`
is authorised. Without the exemption, middleware sees an authenticated user on an auth
page and redirects them to `/dashboard`, so the reset form can never render.

The exemption is correct. The gap is that it admits more than recovery sessions.

## Attack scenario

1. Attacker reaches an unlocked laptop / borrowed phone with an active session
2. Navigates directly to `/reset-password`
3. Sets a new password — no current password required
4. Legitimate owner is locked out; attacker holds the account

A "change password" flow in Settings would normally require the current password
specifically to prevent this. We have no such flow yet, so this page is the only
password-change surface — and it has no such check.

## What does *not* mitigate it

- The `linkState` check is **UX, not security**. It exists so users get an honest
  message instead of a form that dies on submit. Deleting it changes nothing about
  who can actually reset.
- The server-side guard (`updateUser` requires a valid JWT) is real, but a normal
  logged-in session satisfies it. It stops strangers, not session holders.

## Remediation options

**Option A — recovery-only cookie (in-app)**

Have `/auth/callback` set a short-lived, single-use cookie when `type=recovery`, and
require it on `/reset-password`. Self-contained and explicit; the page then admits
recovery sessions only.

**Option B — Supabase "Secure password change" (preferred)**

Authentication → Providers → Email → *Secure password change*. Makes
`updateUser({ password })` require recent authentication, enforced server-side.

Server-side enforcement is the stronger place for this, so Option B is preferred if
it composes cleanly with the recovery flow — worth verifying that a fresh recovery
session counts as "recent authentication" before enabling it in production.

## Decision

Accepted for MVP. Revisit when either:

- a Settings → Change password flow is built (it needs a current-password check
  regardless, and the two should share an approach), or
- the app handles data where account takeover from a borrowed device is a real
  threat model.

## Related

- `docs/SUPABASE_RULES.md`
- Password reset flow: `(auth)/forgot-password` → `/auth/callback?next=/reset-password`
  → `(auth)/reset-password`
