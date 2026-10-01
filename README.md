# Ledger

> Know what's coming, control what goes out, track what happened

A family budget application for UK households to track expenses, manage budgets, and achieve savings goals.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email + Google OAuth)
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
/ledger
├── apps/
│   └── web/                    # Next.js application
├── packages/
│   ├── ui/                     # Shared UI components (shadcn/ui)
│   ├── database/               # Supabase client & types
│   └── config/                 # Shared ESLint & TypeScript configs
├── supabase/                   # Supabase migrations & functions
└── scripts/                    # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase CLI (for local development)
- Docker Desktop (local Supabase runs in Docker containers)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ledger

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase credentials

# Start Supabase locally
supabase start

# Start the development server
pnpm dev
```

### Development Commands

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm typecheck    # Type-check all apps
pnpm clean        # Clean all build artifacts
```

### E2E tests (Playwright)

Requires local Supabase running (`supabase status` should list URLs). Playwright starts its own dev server on `localhost:3000`.

```bash
cd apps/web
pnpm exec playwright test           # run all e2e tests
pnpm exec playwright test signup    # run one spec
pnpm exec playwright show-trace test-results/<test-folder>/trace.zip   # inspect a failure
```

- Local Supabase ports are `553xx` (API `55321`, Inbucket `55324`), not the default `543xx`.
- Email confirmation is ON locally to match production — confirmation emails land in Inbucket at http://127.0.0.1:55324.
- `baseURL` must stay `localhost` — see the comment in `apps/web/playwright.config.ts`.

## Troubleshooting

### Next.js cache issues

If you encounter webpack errors or stale builds after switching branches or making significant changes, clear the Next.js cache:

```bash
cd apps/web
rm -rf .next
pnpm dev
```

### Common issues

- **"**webpack_modules**[moduleId] is not a function"** - Clear `.next` cache (see above)
- **"Loading..." stuck forever** - Check browser console for RLS/Supabase errors
- **Auth errors after schema changes** - Run `supabase db reset` to apply migrations

### Docker / local Supabase won't start

Symptoms: e2e signup test fails at "Check your email" while the smoke test passes; the `/auth/v1/signup` request shows as **cancelled** in the trace; `supabase status` says "Restart Docker Desktop"; Docker Desktop is stuck on "retry".

Nothing is answering on port `55321`, because Docker isn't running the Supabase containers. Check in this order:

1. **Disk space.** Docker can't start with a nearly full disk. Keep 20 GB+ free (`df -h /System/Volumes/Data`).
2. **A frozen engine from an earlier session.** Quitting the app can leave the engine process behind, and new launches get stuck behind it:
   ```bash
   pgrep -fl com.docker.backend   # note the PID
   kill -9 <PID>                  # force-stop it (data in Docker.raw is not affected)
   open -a Docker                 # wait for "Engine running"
   supabase start
   ```
3. Only if both are fine and it still fails, update or reinstall Docker Desktop. A reinstall deletes your local Supabase data.

### Playwright: "Executable doesn't exist"

Every e2e test (including the smoke test) fails instantly with `browserType.launch: Executable doesn't exist at ~/Library/Caches/ms-playwright/...`. The browser Playwright drives is missing — it lives in a cache outside the repo, so `pnpm install` doesn't restore it, and clearing `~/Library/Caches` to free disk space deletes it.

```bash
cd apps/web
pnpm exec playwright install chromium
```

### when update new node do

```bash
rm -rf node_modules
pnpm install
pnpm store prune  # Optional: clean pnpm cache
```

## Documentation

- [Product Specification](./PRODUCT_SPEC.md) - Full product requirements and epic breakdown
- [Epic Progress](./docs/EPIC_PROGRESS.md) - Current status of all epics
- [Supabase Rules](./docs/SUPABASE_RULES.md) - Required patterns for Supabase integration

## License

Private - All rights reserved
