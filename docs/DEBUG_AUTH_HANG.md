# Debugging: Refresh Hang on Vercel (Supabase Auth Lock)

> **Incident date:** 2026-05-12
> **Severity:** Production-blocking (protected pages unusable on refresh)
> **Affected:** All authenticated users on Vercel; not reproducible on local dev

---

## Symptoms

After deploying to Vercel:

- **First login works** — sign-in flow completes, protected pages render with data.
- **Refresh hangs** — the page shell renders (sidebar, header, user avatar) but the data area (transactions list, totals, etc.) stays empty.
- **No Supabase network requests** fire after the HTML doc loads.
- **No red console errors** at first glance.
- **Vercel function logs are clean** — every request returns 200.
- Could not be reproduced locally.

A deeper console scan eventually revealed the smoking gun:

```
Profile fetch error: {
  message: 'Error: Lock "lock:sb-<project>-auth-token" was released because another request stole it'
}
Uncaught (in promise) a: Lock "lock:sb-<project>-auth-token" was released because another request stole it
    at tO.o [as lock]
    at async tO._acquireLock
```

---

## Root Cause

Supabase auth uses the browser's [`navigator.locks` API](https://developer.mozilla.org/docs/Web/API/LockManager) to coordinate token refresh across concurrent calls. When multiple requests race for the same lock, one will "steal" it from another, rejecting the loser with the error above.

On Vercel, every protected page refresh triggers this race:

```
Page refresh
  ↓
SSR seeds user/profile/household via AuthProvider props ✓
  ↓
React hydrates → multiple hooks fire useEffect simultaneously
  - AuthProvider's onAuthStateChange listener catches a spurious SIGNED_IN
    that Supabase emits on mount (even when nothing changed)
    → calls fetchProfile() → makes a supabase.from("profiles") query
  - useTransactions → makes a supabase.from("transactions") query
  - useMonthTotal (×2) → makes supabase queries
  ↓
All these queries hit Supabase auth's navigator.locks coordination
  ↓
One request "steals" the lock from another
  ↓
Profile fetch throws → cascading failure → page sits half-loaded
```

The bug only surfaced in production because:
- Local dev is fast enough that requests don't overlap as tightly.
- Vercel + browser cold start widens the window for concurrent requests.
- The lock is browser-only (`navigator.locks`); server-side queries aren't affected, which is why the SSR seed itself worked fine.

---

## The Fix

`apps/web/src/lib/auth/auth-context.tsx` — track the last user id we've already loaded a profile for, and bail out of the `SIGNED_IN` handler when it matches. This filters the spurious mount-time event while keeping real sign-in/sign-out responsive.

```tsx
// Tracks the last user id we've already loaded a profile for. Supabase fires
// a spurious SIGNED_IN on mount when the server already seeded our session;
// refetching there races other hooks for the auth lock and triggers the
// "Lock was released because another request stole it" error.
const lastFetchedUserId = useRef<string | null>(initialUser?.id ?? null);

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    if (session.user.id === lastFetchedUserId.current) return; // ← bail
    lastFetchedUserId.current = session.user.id;
    setUser(session.user);
    await fetchProfile(session.user.id);
  }
  if (event === "SIGNED_OUT") {
    lastFetchedUserId.current = null;
    setUser(null);
    setProfile(null);
    setHousehold(null);
  }
});
```

The init path (used when there's no SSR seed) also updates the ref so subsequent SIGNED_IN events don't redundantly refetch.

---

## Debugging Walkthrough (for future you)

When a protected page renders shell but no data on production:

1. **DevTools → Network tab** → refresh → filter "supabase":
   - **No requests** → client-side bailout (likely a hook guard like `if (!household?.id) return`)
   - **Pending forever** → lock contention or timeout
   - **401 / 403** → auth or RLS issue
2. **DevTools → Console** → look past source-map noise for any red error, especially anything mentioning `Lock` or `acquireLock`.
3. **View Page Source** → search for IDs (e.g. `household_id`) to confirm SSR seeded correctly.
4. **React DevTools → Components** → find the auth `Context.Provider` (search by name or look for a `value` shaped like `{ user, profile, household, isLoading, signOut, refreshProfile }`) and inspect state.
5. **Vercel → Deployments → Functions tab** → look for server-side errors.

### Red herrings to ignore

- `?_rsc=cr1` URLs — normal Next.js client navigation payloads
- `Content Security Policy ... blocks 'eval'` — almost always React DevTools extension
- `installHook.js` warnings — React DevTools
- `extension://fmkadm...` source-map warnings — browser extension noise

---

## Prevention Checklist

When adding new hooks that call Supabase from a protected route:

- [ ] Make sure the hook respects an `enabled` guard (don't fire until auth state is hydrated)
- [ ] Don't add a parallel `onAuthStateChange` listener — use the existing `AuthProvider`
- [ ] If you create new Supabase clients, ensure they share the singleton from `lib/supabase/client.ts` to avoid multiple lock owners
- [ ] When adding SSR-seeded providers, mirror this `lastFetched` pattern to suppress spurious mount-time events

---

## Related Files

- `apps/web/src/lib/auth/auth-context.tsx` — the fix
- `apps/web/src/lib/supabase/client.ts` — browser client singleton
- `apps/web/src/middleware.ts` — server-side session refresh
- `apps/web/src/app/(protected)/layout.tsx` — SSR seed of user/profile/household
