# Epic Progress Tracker

> Reference: [PRODUCT_SPEC.md](../PRODUCT_SPEC.md) for full details

## Phase 1: Core MVP

| Epic | Name | Status | Notes |
|------|------|--------|-------|
| 0 | Onboarding (Light) | Done | 3-step wizard: household name, currency, categories |
| 1 | Project Foundation | Done | Monorepo, Next.js, Supabase, RLS, CI |
| 2 | Authentication | Done | Email/password, Google OAuth, password reset |
| 3 | Navigation & Layout | Done | Sidebar, bottom tabs, theme toggle, FAB |
| 4 | Category Management | Done | All Must stories (4.1, 4.3–4.6) shipped in KAN-23 |
| 5 | Transaction Management | In Progress | Add/edit/delete working |
| E | Empty States | Pending | |
| P | Polish | Partial | Toast system added |

### Epic 4 Details (All Must Done)

| Story | Status | Notes |
|-------|--------|-------|
| 4.1 Default categories | ✅ | Seeded via `handle_new_user()` trigger on signup |
| 4.3 Category list | ✅ | Settings page, grouped by expense/income |
| 4.4 Add category | ✅ | Bottom sheet with name, type, color; auto-increments sort_order |
| 4.5 Edit category | ✅ | Shipped with KAN-23 (was accidental, not separate ticket) |
| 4.6 Delete category | ✅ | Inline confirmation; optimistic local removal |
| 4.2 UK template | ⏳ | Should — deferred |
| 4.7 Icon picker | ⏳ | Should — deferred |

### Epic 5 Remaining Items
- [ ] 5.3 Expanded form ("More details" reveals date picker, description)
- [ ] 5.4 "Add another" checkbox
- [ ] 5.10 Undo delete (toast with "Undo" for 5 seconds)

---

## Phase 2: Engagement

| Epic | Name | Status | Notes |
|------|------|--------|-------|
| 7 | Savings Goals | Pending | |
| 8 | Dashboard (Enhanced) | Pending | |
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
| 13 | Monthly View | Pending | |

---

## Key Documentation

- [PRODUCT_SPEC.md](../PRODUCT_SPEC.md) - Full product requirements
- [SUPABASE_RULES.md](./SUPABASE_RULES.md) - Supabase integration patterns

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Done | All stories complete |
| In Progress | Currently being worked on |
| Partial | Some stories complete |
| Pending | Not started |
