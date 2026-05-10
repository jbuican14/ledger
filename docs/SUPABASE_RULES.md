# Supabase Client Rules

These rules ensure consistent, secure, and bug-free Supabase integration across the codebase.

## The Rules

### 1. ONLY use `@supabase/ssr`

```bash
# CORRECT
pnpm add @supabase/ssr

# WRONG - never use directly in app code
pnpm add @supabase/supabase-js
```

The `@supabase/ssr` package is designed for server-side rendering frameworks like Next.js. It handles cookies automatically.

### 2. Clients ONLY exist in these files

| File | Purpose | Usage |
|------|---------|-------|
| `lib/supabase/client.ts` | Browser client | Client components, hooks |
| `lib/supabase/server.ts` | Server client | Server components, API routes |
| `middleware.ts` | Middleware client | Auth checks, redirects |

**No other files should create Supabase clients.**

### 3. NEVER create Supabase clients elsewhere

```tsx
// WRONG - creating client in a hook
export function useTransactions() {
  const supabase = createBrowserClient(...); // DON'T DO THIS
}

// CORRECT - import from centralized location
import { createClient } from "@/lib/supabase/client";

export function useTransactions() {
  const supabase = createClient();
}
```

### 4. NEVER use `@supabase/supabase-js` directly

```tsx
// WRONG
import { createClient } from "@supabase/supabase-js";

// CORRECT
import { createBrowserClient } from "@supabase/ssr";
// or
import { createClient } from "@/lib/supabase/client";
```

### 5. NEVER put Supabase client logic in shared packages

The `@ledger/database` package should only contain:
- TypeScript types (`database.types.ts`)
- Type definitions
- Schema utilities

**NOT:**
- Supabase client creation
- Auth logic
- API calls

### 6. Auth uses cookies (NOT localStorage)

Supabase SSR stores auth tokens in **HTTP-only cookies**, not localStorage. This means:

- Sessions work across server and client
- Auth state persists on page refresh
- Middleware can check auth status
- More secure (tokens not accessible via JavaScript)

## File Structure

```
apps/web/src/
├── lib/supabase/
│   ├── client.ts      # Browser client (createBrowserClient)
│   └── server.ts      # Server client (createServerClient)
├── middleware.ts      # Auth middleware with its own client
└── hooks/
    ├── use-transactions.ts  # Uses createClient() from lib/supabase/client
    └── use-categories.ts    # Uses createClient() from lib/supabase/client
```

## Client Implementations

### Browser Client (`lib/supabase/client.ts`)

```typescript
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

## Common Mistakes

### Mistake 1: Creating multiple client instances

```tsx
// WRONG - new instance every render
function MyComponent() {
  const supabase = createBrowserClient(...);
}

// CORRECT - single instance via centralized function
function MyComponent() {
  const supabase = createClient();
}
```

### Mistake 2: Using getSession() instead of getUser()

```tsx
// WRONG - getSession() can return stale data
const { data: { session } } = await supabase.auth.getSession();

// CORRECT - getUser() validates with server
const { data: { user } } = await supabase.auth.getUser();
```

### Mistake 3: Handling auth state changes incorrectly

```tsx
// WRONG - re-fetching on every event including TOKEN_REFRESHED
onAuthStateChange(async (event, session) => {
  await fetchProfile(session.user.id); // Called too often!
});

// CORRECT - only handle specific events
onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN") {
    await fetchProfile(session.user.id);
  }
  if (event === "SIGNED_OUT") {
    clearUserState();
  }
});
```

## Why These Rules Matter

1. **Prevents race conditions** - Single client instance avoids auth token lock conflicts
2. **Consistent cookie handling** - SSR package manages cookies correctly across server/client
3. **Easier debugging** - All Supabase logic in known locations
4. **Security** - HTTP-only cookies are more secure than localStorage
5. **SSR compatibility** - Works correctly with Next.js server components
