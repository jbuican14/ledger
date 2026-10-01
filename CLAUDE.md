# Claude Code Project Instructions

This file provides context for Claude Code AI assistant when working on this project.

## Project Overview

**Ledger** is a family budget application for UK households. The core value proposition is:

> "Know what's coming, control what goes out, track what happened"

Key differentiator: **Recurring-aware monthly tracking with user control**

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS + shadcn/ui (Default preset)
- **State**: React Query + React Context
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email + Google OAuth)
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
apps/web/           → Next.js app
packages/ui/        → Shared shadcn components
packages/database/  → Supabase client & types
packages/config/    → Shared ESLint & TS configs
supabase/           → Migrations & edge functions
```

## Coding Conventions

### TypeScript

- Strict mode enabled
- Prefer `type` over `interface` unless extending
- Use explicit return types on exported functions
- Avoid `any` - use `unknown` with type guards

### React/Next.js

- Use App Router patterns (not Pages Router)
- Server Components by default, 'use client' only when needed
- Prefer Server Actions for mutations
- Use React Query for client-side data fetching

### Styling

- Use Tailwind utility classes
- Use `cn()` utility for conditional classes (from @ledger/ui)
- Follow shadcn/ui patterns for component styling
- CSS variables for theme colors (defined in globals.css)

### File Naming

- Components: PascalCase (e.g., `TransactionList.tsx`)
- Utilities: camelCase (e.g., `formatCurrency.ts`)
- Types: PascalCase with `.types.ts` suffix when needed

### Imports

- Use path aliases: `@/*` for app, `@ledger/ui` for shared components
- Group imports: React → External → Internal → Styles

## Database

- Multi-tenant via `household_id` on all data tables
- Row Level Security (RLS) enabled
- Soft delete with `deleted_at` column on transactions
- Generate types: `pnpm --filter @ledger/database generate-types` (reads schema from the linked remote Supabase project; no Docker required). Use `generate-types:local` if you're running the full local Supabase stack via Docker.

### Migration template for new tables

**Required.** Supabase is removing automatic Data API exposure for `public` tables (rollout completes Oct 30, 2026 — see [discussion #45329](https://github.com/orgs/supabase/discussions/45329)). Every new table created in a migration MUST include explicit `GRANT` statements or it will be invisible to `supabase-js`.

Use this template for any new table in `public`:

```sql
CREATE TABLE public.your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  -- ...your columns...
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 1. Grants — required for Data API (supabase-js) access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;

-- 2. Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- 3. Policies (household-scoped via get_user_household_id())
CREATE POLICY "Users view own household rows" ON public.your_table
  FOR SELECT TO authenticated
  USING (household_id = get_user_household_id());
-- ...repeat for INSERT / UPDATE / DELETE as needed...
```

Notes:

- This app uses `authenticated` only — never grant to `anon` unless the table is intentionally public.
- Never grant to `service_role` from app migrations; that role bypasses RLS and is reserved for server-only contexts.
- If a Data API call returns `42501 permission denied for table`, the grant is missing.

## Key Files

- `PRODUCT_SPEC.md` - Full product specification
- `apps/web/src/app/` - Next.js App Router pages
- `packages/database/src/database.types.ts` - Supabase generated types
- `docs/DATABASE_BASICS.md` - Beginner's guide to the DB concepts used here (keys, RLS, triggers, NULL, migrations)
- `docs/DATABASE.md` - ER diagram, signup trigger flow, security layers (update when a migration changes the schema)

## JIRA Integration

Stories are tracked in JIRA (project key: KAN).
Script: `./scripts/create-jira-ticket.sh "Title" "Description" "Epic|Story|Task|Bug|Subtask|Feature" [PARENT-KEY]`

Credentials live in `.env.jira` at the repo root (gitignored). `JIRA_URL` must be
the **bare host** — the script prepends `https://` itself.

### ⚠️ Board reset — 2026-09-13

The Atlassian site was deactivated and reactivated, which **lost every issue**
(old KAN-16 … KAN-75). Numbering restarted from KAN-1, so old KAN references in
git history, branch names and PR titles **no longer resolve** — and new tickets
will eventually reuse those numbers with different meanings.

**This file and the git log are the system of record for anything before that
date.** Delivered scope was reconstructed from them into KAN-2 (epic, closed).
If JIRA is ever lost again, rebuild it from here.

## Development Workflow

1. Each epic is refined before building
2. Stories are built one at a time with user review
3. JIRA tickets created for each story
4. PR naming: `[KAN-X] Short description`

### How we work

- Juti builds; Claude explains, hands over the command or code, then checks the result.
- One step at a time. No step is done until the pick-up note below is updated.
- Every story has a JIRA ticket (KAN) before work starts.
- Design docs live in `docs/`; the reviewer summary lives on Confluence (repo wins if they differ).

### Pick up here

- 2026-10-01: e2e + unit tests green on main. README troubleshooting committed on
  `docs/e2e-troubleshooting-readme` (not pushed, no PR yet).
- Next: <your pick>
- Confluence: Epic 10 design summary, linked from the header of
  `docs/HOUSEHOLD_SHARING_DESIGN.md`.

## Current Phase

Ticket numbers below are **post-reset** (see JIRA Integration above).

**Phase 1: Core MVP** — ✅ Complete (Epics 1–8)

**Phase 2: Engagement** — in progress

- ✅ Epic 9: Recurring Transactions
- ✅ Epic 11: Savings Goals
- ✅ Epic 12: Budget (Simple)
- ✅ Epic 13: Dashboard Enhanced
- 🔨 Epic 10: Household Sharing (KAN-17) — in progress
  - ✅ 10.1 Schema (KAN-18)
  - 🔨 10.2 Consume invite at signup (KAN-19) — built, SQL tests pass; migration
    applied to remote 2026-09-27
  - 🔨 10.3 Create and revoke invites (KAN-20) — built, SQL + unit tests pass;
    migration applied to remote 2026-09-27
  - ⏳ 10.5 Invite landing page (KAN-21)
  - ⏳ 10.4 Members list and removal (KAN-22)
  - Design: `docs/HOUSEHOLD_SHARING_DESIGN.md` (reviewer summary on Confluence,
    linked from its header — the repo file wins if they disagree)
- ⏳ Epic 14: Feedback & Insights — not refined

**Maintenance-FY27Q1** (KAN-23) — backlog

- ⏳ Clean up orphaned households with no members (KAN-24)

All Phase 1 and completed Phase 2 work is recorded under **KAN-2** (closed epic).

### Open defects

- **KAN-1** — any signed-in user can reach `/reset-password` without
  re-authenticating. Accepted for MVP; see `docs/PASSWORD_RESET_SECURITY.md`.

### Auth notes

Email + Google OAuth are both live. Identity linking merges a Google sign-in
into an existing password account when the email matches and is verified —
which depends on `mailer_autoconfirm` staying **false**. See
`docs/AUTH_PATTERNS.md` — which is only on the unmerged
`feat/google-oauth-shared-handler` branch (commit `6caed9b`) until that merges.

## UX Principles

1. Speed over completeness - log expense in <60 seconds
2. Progressive disclosure - simple first, complexity when needed
3. Empty states are first impressions
4. Feedback builds habits
5. Polish signals quality (optimistic UI, skeletons, undo)
