# Epic Progress Tracker

> Reference: [PRODUCT_SPEC.md](../PRODUCT_SPEC.md) for full details
> Last updated: 2026-05-12

## Phase 1: Core MVP

| Epic | Name | Status | Notes |
|------|------|--------|-------|
| 0 | Onboarding (Light) | Done | 3-step wizard: household name, currency, categories |
| 1 | Project Foundation | Done | Monorepo, Next.js, Supabase, RLS, CI |
| 2 | Authentication | Done | Email/password, Google OAuth, password reset (KAN-16, KAN-21) |
| 3 | Navigation & Layout | Done | Sidebar, bottom tabs, theme toggle, FAB |
| 4 | Category Management | Done | Default categories seeded; UI in settings (KAN-23) |
| 5 | Transaction Management | Done | Add/edit/delete, undo delete (KAN-19), payment methods (KAN-24), currency symbol (KAN-26), soft-delete RLS fix (KAN-25) |
| E | Empty States | Done | Dashboard, transactions, categories (KAN-27) |
| P | Polish | Done | Skeletons, error boundaries, validation, offline banner (KAN-28) |
| M | Month Navigation | In Progress | See breakdown below |

### Epic M: Month Navigation — Status

| Story | Description | Status |
|-------|-------------|--------|
| KAN-29 | Server-side month-range filter on `useTransactions` | Done |
| KAN-30 | `useMonth` hook with URL state | Done |
| KAN-31 | Three-pill month navigator anchored to current month | Done |
| KAN-32 | Month/year picker modal | Done |
| KAN-33 | Summary cards scope to selected month | In Review (PR #21) |
| KAN-34 | "Today" / jump-to-current shortcut | Pending |
| KAN-35 | Block future-dated transactions in form | Pending |
| KAN-36 | Preview subtotals on pill hover (stretch) | Pending |
| KAN-37 | Persistence rules (URL vs session) | Pending |

---

## Phase 2: Engagement

| Epic | Name | Status | Notes |
|------|------|--------|-------|
| 7 | Savings Goals | Pending | |
| 8 | Dashboard (Enhanced) | Pending | Budget remaining + goals cards still placeholder |
| 11 | Recurring Transactions | Pending | Monthly banner for due items |
| 12 | Budget (Simple) | Pending | |
| F | Feedback & Insights | Pending | |

---

## Phase 3: Power Features

| Epic | Name | Status | Notes |
|------|------|--------|-------|
| 5.x | Transaction Enhancements | Pending | Filters, search, bulk delete |
| 6 | CSV Import | Pending | |
| 12.x | Budget Enhancements | Pending | Category budgets, alerts |
| 13 | Monthly View | Pending | Distinct from Epic M (per-month summary page) |

---

## Key Documentation

- [PRODUCT_SPEC.md](../PRODUCT_SPEC.md) - Full product requirements
- [SUPABASE_RULES.md](./SUPABASE_RULES.md) - Supabase integration patterns
- [ship-workflow.md](./ship-workflow.md) - Branch + PR automation guide

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Done | All stories complete and merged |
| In Review | PR open, awaiting merge |
| In Progress | Currently being worked on |
| Partial | Some stories complete |
| Pending | Not started |
