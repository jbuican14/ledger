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
- Generate types: `pnpm --filter @ledger/database generate-types`

## Key Files

- `PRODUCT_SPEC.md` - Full product specification
- `apps/web/src/app/` - Next.js App Router pages
- `packages/database/src/database.types.ts` - Supabase generated types

## JIRA Integration

Stories are tracked in JIRA (project key: KAN).
Script: `./scripts/create-jira-ticket.sh "Title" "Description" "Task|Epic|Subtask"`

## Development Workflow

1. Each epic is refined before building
2. Stories are built one at a time with user review
3. JIRA tickets created for each story
4. PR naming: `[KAN-X] Short description`

## Current Phase

**Phase 1: Core MVP** - Foundation, Auth, Navigation, Categories, Transactions

## UX Principles

1. Speed over completeness - log expense in <60 seconds
2. Progressive disclosure - simple first, complexity when needed
3. Empty states are first impressions
4. Feedback builds habits
5. Polish signals quality (optimistic UI, skeletons, undo)
