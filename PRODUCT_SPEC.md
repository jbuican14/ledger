# Family Budget App - Product Specification

> **Document Version:** 2.2
> **Last Updated:** 2026-05-13
> **Status:** Living document — Phase 1 complete, Phase 2 in progress

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Personas](#2-user-personas)
3. [Core Value Proposition](#3-core-value-proposition)
4. [UX Principles](#4-ux-principles)
5. [Technical Architecture](#5-technical-architecture)
6. [Database Schema](#6-database-schema)
7. [Phase 1: Core MVP](#7-phase-1-core-mvp)
8. [Phase 2: Engagement](#8-phase-2-engagement)
9. [Phase 3: Power Features](#9-phase-3-power-features)
10. [Deferred Features](#10-deferred-features)
11. [Glossary](#11-glossary)

---

## 1. Product Vision

### 1.1 One-Line Vision

> "Know what's coming, control what goes out, track what happened"

### 1.2 The Problem

UK households struggle with:
- Knowing where money actually goes each month
- Forgetting recurring expenses until they hit
- Sharing financial visibility with a partner
- Existing solutions are either too complex (YNAB) or read-only (bank apps)

### 1.3 The Solution

A simple expense tracker with **recurring-awareness** — users see what's expected, control when it's logged, and understand their patterns.

### 1.4 Why This vs Alternatives

| Alternative | Gap We Fill |
|-------------|-------------|
| Bank apps (Monzo, Starling) | Read-only, no control over recurring, no multi-user |
| YNAB | Too complex, steep learning curve |
| Spreadsheets | No recurring intelligence, tedious |
| Copilot/Mint | US-focused, aggregator model (we're manual-first) |

**Positioning:** Manual-first, GBP-native, multi-user via invite.

---

## 2. User Personas

### 2.1 Primary: The Household Manager

- Adults 25-55, UK-based
- Wants to understand and control spending
- Willing to spend 30 seconds logging expenses
- Values simplicity over comprehensive features

### 2.2 Secondary: The Partner

- Less financially engaged
- Wants quick entry, minimal friction
- Needs visibility, not management overhead

> Partner access requires the household invite flow (Epic 10), which lands in Phase 2. In Phase 1 each signup creates a single-user household.

---

## 3. Core Value Proposition

### 3.1 Unique Angle

**"Smart recurring-aware monthly tracking with user control"**

Not another budget app. Not another tracker. A tool that:
1. Reminds you what's coming (recurring awareness)
2. Lets you approve/skip recurring items (user control)
3. Shows you where you actually are (monthly tracking)

### 3.2 Core Jobs-to-be-Done

| Job | Feature | Phase |
|-----|---------|-------|
| "I want to log an expense quickly" | Quick add (2 fields) | 1 |
| "I want to know what bills are coming" | Recurring expense list | 2 |
| "I want to see this month's spending" | Monthly dashboard view | 2 |
| "I want my partner to see too" | Household invite & sharing | 2 |

### 3.3 What We're NOT Building (v1)

Feature exclusions:
- Full budgeting system with envelopes
- Bank connection / Open Banking
- Receipt OCR
- Complex analytics

Business-model exclusions (out of scope until product validation):
- Subscription billing / paid tiers

---

## 4. UX Principles

### 4.1 Speed Over Completeness

- User should log expense in **<60 seconds**
- Quick add form: just amount + category
- Details are optional, expandable

### 4.2 Progressive Disclosure

- Show simple first, reveal complexity only when needed
- Onboarding: 3 steps, not 6
- Advanced features discovered over time

### 4.3 Empty States Are First Impressions

Every empty state should:
- Explain what goes here
- Give a clear action
- Feel encouraging, not broken

### 4.4 Feedback Builds Habits

- Show progress ("20% less than last week")
- Surface insights proactively
- Celebrate milestones (streaks/insights ship in Phase 2 — see Epic 14)

### 4.5 Polish Signals Quality

- Optimistic UI (show changes immediately)
- Loading skeletons (never blank screens)
- Undo for destructive actions
- Graceful error handling

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| State | React Query + React Context |
| Auth | Supabase Auth (Email + Google) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel + Supabase Cloud |
| Monorepo | pnpm workspaces + Turborepo |

### 5.2 Project Structure

```
/family-budget-app
├── apps/
│   └── web/                    # Next.js application
├── packages/
│   ├── ui/                     # Shared components
│   ├── database/               # Supabase types, queries
│   └── config/                 # Shared configs
├── supabase/
│   ├── migrations/             # SQL migrations
│   └── seed.sql                # Seed data
├── turbo.json
└── pnpm-workspace.yaml
```

### 5.3 Multi-tenancy Model

```
Household (tenant)
├── has many → Profiles (users)
├── has many → Categories
├── has many → Transactions
├── has many → Recurring Transactions
├── has many → Invitations (Phase 2)
├── has one  → Budget (optional)
└── has many → Goals (Phase 2)
```

Every signup creates a household. Single-user households are the default; additional users join an existing household via the invite flow (Epic 10). Row Level Security gates all access by `household_id`.

**Standard RLS shape (applied to every tenant table):**

```sql
CREATE POLICY tenant_isolation ON <table>
  USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );
```

The same predicate is reused for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`. Soft-deleted rows (`deleted_at IS NOT NULL`) remain visible to RLS so undo can restore them; the application layer filters them out of normal reads.

---

## 6. Database Schema

> **Conventions:** All amounts use signed `DECIMAL(12, 2)` — negative = expense, positive = income. Every tenant table carries `household_id` (RLS key) and `updated_at` (sync/debug/conflict-detection).

### 6.1 Core Tables (Phase 1)

```sql
-- Households (tenant)
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'My Finances',
    currency TEXT NOT NULL DEFAULT 'GBP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
    display_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    type TEXT NOT NULL DEFAULT 'expense'
        CHECK (type IN ('expense', 'income')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, name)
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount <> 0),
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_household_date
    ON transactions (household_id, transaction_date DESC)
    WHERE deleted_at IS NULL;
```

**Notes on the schema:**

- **Signed amounts.** A £45.20 grocery spend stores as `-45.20`; a £2,000 salary as `2000.00`. `SUM(amount)` over a month gives net cashflow directly. The UI renders the sign + currency formatting; the database stays neutral.
- **`category.type`** drives UI grouping (income picker vs expense picker) and seeding rules. The transaction's sign is the source of truth for reporting — there is no `is_income` column on transactions to drift out of sync.
- **`ON DELETE` semantics:**
  - `category_id` → `SET NULL`: deleting a category preserves the transaction (orphan with NULL category until reassigned).
  - `user_id` → `SET NULL`: a profile leaving the household preserves the household's financial history.
  - `household_id` → `CASCADE`: deleting a household removes all its data (true tenant deletion).
  - `profiles.household_id` → `RESTRICT`: a household cannot be deleted while members remain — they must leave first.
- **Soft delete.** `deleted_at` lets us implement undo. The partial index `WHERE deleted_at IS NULL` keeps active queries fast.

### 6.2 Phase 2 Tables

```sql
-- Recurring Transactions
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount <> 0), -- signed, same convention
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Household Invitations
CREATE TABLE household_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_invitations_pending_email
    ON household_invitations (invited_email)
    WHERE status = 'pending';

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    target_date DATE,
    icon TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Budget (one per household)
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,
    monthly_amount DECIMAL(12, 2) NOT NULL CHECK (monthly_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Phase 1: Core MVP

> **Goal:** User logs first expense in <60 seconds
> **Scope:** Foundation + Auth + Navigation + Categories + Transactions + Onboarding (light) + Empty States + Polish

### Phase 1 Progress (as of 2026-05-13)

| Epic | Status |
|------|--------|
| 1: Project Foundation | ✅ Merged |
| 2: Authentication | ✅ Merged |
| 3: Navigation & Layout | ✅ Merged |
| 4: Category Management | ✅ Merged |
| 5: Transaction Management | ✅ Merged |
| 6: Onboarding (Light) | ✅ Merged |
| 7: Empty States | ✅ Merged |
| 8: Polish | ✅ Merged |

**Phase 1 Complete** ✓ — all 50 stories shipped.

---

### Epic 1: Project Foundation

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 1.1 | Monorepo setup | Must | Medium | pnpm + Turborepo working, apps/web created |
| 1.2 | Next.js app | Must | Medium | App Router + Tailwind + shadcn/ui installed |
| 1.3 | Supabase setup | Must | Low | Project created, local dev with `supabase start` |
| 1.4 | Database schema (Phase 1) | Must | Medium | profiles, households, categories, transactions tables |
| 1.5 | RLS policies | Must | Medium | Users only access own household data (see §5.3 for policy shape) |
| 1.6 | Environment config | Must | Low | .env.local, .env.example documented |
| 1.7 | CI pipeline | Should | Medium | GitHub Actions: lint, typecheck, build |

**Definition of Done:** Fresh clone → `pnpm install` → `pnpm dev` → app runs with Supabase connected.

---

### Epic 2: Authentication

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 2.1 | Email signup | Must | Medium | Form validates, sends verification email |
| 2.2 | Email login | Must | Low | Success → dashboard, failure → error message |
| 2.3 | Google OAuth | Should | Medium | One-click login, creates profile if new |
| 2.4 | Password reset | Must | Medium | Email sent, link works, password updated |
| 2.5 | Household auto-creation on signup | Must | Medium | Household row created with default name "My Finances", profile linked via `profiles.household_id` |
| 2.6 | Auth context | Must | Medium | `useAuth()` returns user, household, isLoading |
| 2.7 | Protected routes | Must | Medium | Middleware redirects unauthenticated to /login |
| 2.8 | Logout | Must | Low | Clears session, redirects to login |

**Definition of Done:** User can sign up → verify email → land in onboarding (Epic 6) with a household pre-created.

---

### Epic 3: Navigation & Layout

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 3.1 | Desktop sidebar | Must | Medium | Fixed left sidebar with nav items |
| 3.2 | Mobile bottom tabs | Must | Medium | 4 tabs at bottom, active state clear |
| 3.3 | Responsive breakpoint | Must | Low | Sidebar ≥768px, tabs <768px |
| 3.4 | Theme toggle | Must | Medium | Light/dark switch, persists in localStorage |
| 3.5 | FAB component | Must | Low | Floating + button, bottom-right, all screens |
| 3.6 | Page layout | Must | Low | Consistent header + content wrapper |

**Navigation Items:**
- Dashboard (home icon)
- Transactions (list icon)
- Settings (gear icon)
- [Goals — Phase 2]

---

### Epic 4: Category Management

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 4.1 | Default categories | Must | Low | Seeded on household creation |
| 4.2 | UK template | Should | Low | One-click applies UK-specific categories |
| 4.3 | Category list (settings) | Must | Low | Grid/list of all categories |
| 4.4 | Add category | Must | Medium | Name, color picker, icon picker, type (expense/income) |
| 4.5 | Edit category | Must | Low | Update name, color, icon |
| 4.6 | Delete category | Must | Medium | Confirmation; transactions are reassigned (FK is `ON DELETE SET NULL`, app prompts to reassign first) |
| 4.7 | Icon picker | Should | Medium | Grid of common expense icons |

**Default Categories:**

| Name | Color | Icon | Type |
|------|-------|------|------|
| Groceries | Green | 🛒 | expense |
| Bills | Blue | 📄 | expense |
| Transport | Orange | 🚗 | expense |
| Entertainment | Purple | 🎬 | expense |
| Eating Out | Red | 🍽️ | expense |
| Shopping | Pink | 🛍️ | expense |
| Health | Teal | 💊 | expense |
| Other | Grey | 📦 | expense |
| Salary | Green | 💰 | income |
| Other Income | Green | 💵 | income |

**UK Template Additions:**
- Council Tax
- TV Licence
- Childcare

---

### Epic 5: Transaction Management (Core)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 5.1 | Add transaction modal | Must | Medium | Modal opens from FAB, closes on submit/cancel |
| 5.2 | Quick add form | Must | Low | Amount + category only, date defaults to today; sign derived from category type |
| 5.3 | Expanded form | Must | Medium | "More details" reveals: date picker, description |
| 5.4 | "Add another" checkbox | Must | Low | When checked, form clears but stays open |
| 5.5 | Transaction list | Must | High | Grouped by day with daily subtotals |
| 5.6 | Edit transaction | Must | Medium | Click row → edit modal |
| 5.7 | Soft delete with undo | Must | Medium | Delete sets `deleted_at`; toast offers Undo for 5 seconds |
| 5.8 | Income/expense toggle | Must | Low | Switch between expense/income (flips amount sign + filters category list by type) |
| 5.9 | Optimistic UI | Deferred | Medium | Deferred to Epic 8 (Polish). Current pessimistic pattern is acceptable; revisit if specific actions feel sluggish. |

**Transaction List Design:**
```
┌─────────────────────────────────────┐
│  Today - 7 Apr                £67.20│
│  ├ Tesco         Groceries   -£45.20│
│  └ Costa         Coffee      -£22.00│
│                                     │
│  Yesterday - 6 Apr           £34.50 │
│  ├ TfL           Transport   -£12.50│
│  └ Amazon        Shopping    -£22.00│
└─────────────────────────────────────┘
```

---

### Epic 6: Onboarding (Light)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 6.1 | Onboarding wrapper | Must | Low | 3-step wizard with progress dots |
| 6.2 | Step 1: Household name | Must | Low | Text input, defaults to "My Finances" (already created in Epic 2.5); skip keeps default |
| 6.3 | Step 2: Currency | Must | Low | Dropdown, GBP default, 5 common options |
| 6.4 | Step 3: Category template | Must | Low | 3 choices: Default, UK, Custom later |
| 6.5 | Complete → Dashboard | Must | Low | Sets `onboarding_completed = true` |

**Total onboarding time target: 30–60 seconds.**

---

### Epic 7: Empty States

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 7.1 | Empty dashboard | Must | Low | Welcome message + "Add first expense" CTA |
| 7.2 | Empty transaction list | Must | Low | Illustration + encouraging message + CTA |
| 7.3 | Empty category list | Should | Low | Shouldn't happen, but graceful fallback |

**Empty Transaction State:**
```
┌─────────────────────────────────────┐
│                                     │
│        [illustration]               │
│                                     │
│    No transactions yet              │
│                                     │
│    Start tracking your spending     │
│    by adding your first expense     │
│                                     │
│    [+ Add Expense]                  │
│                                     │
└─────────────────────────────────────┘
```

---

### Epic 8: Polish

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 8.1 | Loading skeletons | Must | Medium | Skeleton UI for all lists and cards |
| 8.2 | Error boundaries | Must | Medium | Graceful error UI, retry button |
| 8.3 | Offline indicator | Should | Low | Banner when offline |
| 8.4 | Success toasts | Must | Low | Subtle confirmation on add/edit |
| 8.5 | Form validation | Must | Medium | Inline errors, disabled submit when invalid |

---

### Phase 1 Summary

| Epic | Stories | Must | Should | Could |
|------|---------|------|--------|-------|
| 1: Foundation | 7 | 6 | 1 | 0 |
| 2: Auth | 8 | 7 | 1 | 0 |
| 3: Navigation | 6 | 6 | 0 | 0 |
| 4: Categories | 7 | 5 | 2 | 0 |
| 5: Transactions | 9 | 9 | 0 | 0 |
| 6: Onboarding | 5 | 5 | 0 | 0 |
| 7: Empty States | 3 | 2 | 1 | 0 |
| 8: Polish | 5 | 4 | 1 | 0 |
| **Total** | **50** | **44** | **6** | **0** |

> Phase 1 dropped from 51 to 50 stories: Epic 5.7 (delete) and 5.10 (undo) merged into a single "Soft delete with undo" story.

---

## 8. Phase 2: Engagement

> **Goal:** Build habits with recurring awareness, sharing, and goal tracking.
> **Prerequisite:** Phase 1 complete, users actively logging.

### Phase 2 Progress (as of 2026-05-13)

| Epic | Status | Tickets |
|------|--------|---------|
| 9: Recurring Transactions | ✅ Merged | KAN-41–47 |
| 10: Household Invites | ⏳ Pending | — |
| 11: Savings Goals | ⏳ Pending | — |
| 12: Budget (Simple) | ✅ Merged | KAN-59 (settings), KAN-61 (dashboard widget) |
| 13: Dashboard (Enhanced) | 🟡 Partial | KAN-61 (budget), KAN-62 (category breakdown), KAN-63 (recent activity). Goals widget (13.4) blocked on Epic 11. |
| 14: Feedback & Insights | ⏳ Pending | — |

---

### Epic 9: Recurring Transactions

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 9.1 | Recurring schema | Must | Medium | Table created with RLS |
| 9.2 | Add recurring | Must | Medium | Form: name, amount, category, frequency |
| 9.3 | Recurring list | Must | Low | View all recurring items in settings |
| 9.4 | Edit recurring | Must | Low | Modify details |
| 9.5 | Delete recurring | Must | Low | With confirmation |
| 9.6 | Monthly banner | Must | High | Dashboard: "3 items due this month — Add?" |
| 9.7 | Quick-add from banner | Must | Medium | One click adds selected items as transactions |

**Monthly Banner UX:**
```
┌─────────────────────────────────────┐
│ 📅 April recurring expenses         │
│                                     │
│ ☑ Rent             £1,200          │
│ ☑ Netflix          £15.99          │
│ ☑ Council Tax      £156            │
│                                     │
│ [Add Selected (£1,371.99)]  [Skip] │
└─────────────────────────────────────┘
```

---

### Epic 10: Household Invites

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 10.1 | Invitations schema | Must | Low | `household_invitations` table + RLS (only inviter & invitee can see) |
| 10.2 | Send invite | Must | Medium | Settings page: email input → row inserted, magic-link email sent, 7-day expiry |
| 10.3 | Accept invite | Must | High | Token URL → if not signed up, signup flow first; on accept, set invitee's `profiles.household_id` to the host's |
| 10.4 | Decline / expire | Must | Low | Status transitions: pending → accepted / expired / revoked |
| 10.5 | Revoke pending invite | Must | Low | Inviter can cancel before acceptance |
| 10.6 | Member list | Must | Low | Settings: list current household members + pending invites |
| 10.7 | Leave household | Should | Medium | Member can leave; if last member, household + data archived (configurable) |

**Acceptance flow:**
```
A invites b@example.com
  → row in household_invitations (status=pending, token=…)
  → email sent to B with link /invite?token=…

B clicks link
  → if not authed: signup → profile created in a *new* household H_B
  → on accept: profile.household_id reassigned to A's household H_A,
    H_B (now empty) is deleted
  → invitation.status = accepted, accepted_at = now()
```

**Constraints (Phase 2 scope):**
- Invited user sees only the host household's data — RLS enforces this automatically once `household_id` is reassigned.
- One household per user at a time (matches single `profiles.household_id` column).
- Multi-household membership and household-switching are deferred (see §10).

---

### Epic 11: Savings Goals

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 11.1 | Goals schema | Must | Low | Table created |
| 11.2 | Create goal | Must | Medium | Name, target amount, optional date |
| 11.3 | Goals dashboard widget | Must | Medium | Cards with progress bars |
| 11.4 | Goal detail page | Must | Medium | Full info, contribution history |
| 11.5 | Add contribution | Must | Medium | Record amount added to goal |
| 11.6 | Edit goal | Must | Low | Update details |
| 11.7 | Archive goal | Must | Low | Mark complete or abandoned |
| 11.8 | Empty goals state | Must | Low | "What are you saving for?" + suggestions |

---

### Epic 12: Budget (Simple)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 12.1 | Budget schema | Must | Low | Simple monthly_amount per household |
| 12.2 | Set budget | Must | Medium | Settings page, single number |
| 12.3 | Budget widget | Must | Medium | Dashboard: "£800 left of £2,000" with bar |
| 12.4 | Budget nudge | Should | Low | If no budget, prompt to set one |

---

### Epic 13: Dashboard (Enhanced)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 13.1 | Dashboard layout | Must | Medium | Card grid, responsive |
| 13.2 | This month spending | Must | Low | Total spent card |
| 13.3 | Budget status | Must | Medium | Remaining vs total (if budget set) |
| 13.4 | Goals widget | Must | Low | Progress bars for active goals |
| 13.5 | Recurring banner | Must | Low | (sourced from Epic 9) |
| 13.6 | Category breakdown | Should | Medium | Pie chart of spending |
| 13.7 | Recent transactions | Must | Low | Last 5 items |

---

### Epic 14: Feedback & Insights

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 14.1 | Spending comparison | Should | Medium | "20% less than last week" |
| 14.2 | Goal progress | Should | Low | "On track!" / "Falling behind" |
| 14.3 | Logging streak | Could | Low | "5 days in a row!" |
| 14.4 | Category insight | Could | Medium | "Food spending higher than usual" |

---

### Phase 2 Summary

| Epic | Stories |
|------|---------|
| 9: Recurring | 7 |
| 10: Invites | 7 |
| 11: Goals | 8 |
| 12: Budget | 4 |
| 13: Dashboard | 7 |
| 14: Feedback | 4 |
| **Total** | **37** |

---

## 9. Phase 3: Power Features

> **Goal:** Advanced capabilities for engaged users.
> **Prerequisite:** Phase 2 complete, users requesting these features.

---

### Epic 15: CSV Import

| ID | Story | Complexity |
|----|-------|------------|
| 15.1 | File upload | Medium |
| 15.2 | Column mapping | High |
| 15.3 | Preview table | Medium |
| 15.4 | Duplicate detection | High |
| 15.5 | Import confirmation | Medium |

---

### Epic 16: Transaction Enhancements

| ID | Story | Complexity |
|----|-------|------------|
| 16.1 | Filter by category | Medium |
| 16.2 | Filter by date range | Medium |
| 16.3 | Search by description | Medium |
| 16.4 | Bulk delete | High |

---

### Epic 17: Monthly View

| ID | Story | Complexity |
|----|-------|------------|
| 17.1 | Monthly summary page | Medium |
| 17.2 | Recurring vs one-off split | Medium |
| 17.3 | Month selector | Low |
| 17.4 | Export CSV | Medium |

---

### Epic 18: Budget Enhancements

| ID | Story | Complexity |
|----|-------|------------|
| 18.1 | Category-level budgets | High |
| 18.2 | 80% alert notification | High |
| 18.3 | Over-budget alert | Medium |

---

## 10. Deferred Features

These are **not planned** but documented for future consideration:

| Feature | Rationale for Deferral |
|---------|------------------------|
| Multi-household per user | Single-household model is sufficient for MVP; would require a join table |
| Household switcher | Depends on multi-household support |
| PDF statements | Nice-to-have, not core |
| Category merge | Edge case |
| Category drag-sort | Nice-to-have |
| Merchant auto-rules | Complexity |
| Bulk transaction edit | Power feature |
| Bank connection (Open Banking) | Regulatory, complexity |
| Receipt OCR | ML complexity |
| Mobile app (React Native) | After web proven |
| SaaS billing (Stripe) | After user validation |
| Feature flags / limits | When monetizing |

---

## 11. Glossary

| Term | Definition |
|------|------------|
| Household | A tenant grouping users; every signup creates one |
| Profile | A user's row in `profiles`, linked 1:1 to `auth.users` and assigned to one household |
| Transaction | A single expense or income entry; signed amount (negative = expense, positive = income) |
| Category | Classification for transactions, typed as `expense` or `income` |
| Goal | A savings target |
| Budget | Monthly spending limit |
| Recurring | An expected regular expense or income |
| Quick add | The 2-field add-transaction form (amount + category) accessed via the FAB |
| Recurring banner | Dashboard prompt listing this month's recurring items for one-click logging |
| Soft delete | Marking a row deleted via `deleted_at` instead of removing it; supports undo |
| Invite | Time-limited token granting another user access to your household |
| FAB | Floating Action Button |
| RLS | Row Level Security |
| Optimistic UI | Show changes before server confirms |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-07 | Initial draft (too broad) |
| 2.0 | 2026-04-07 | Revised after PO review: leaner MVP, progressive phases, added empty states + polish + feedback |
| 2.1 | 2026-05-09 | Audit pass. Renumbered epics for coherence (Phase 1: 1–8, Phase 2: 9–14, Phase 3: 15–18). Switched to **signed-amount** transaction model — dropped `is_income` from transactions, added `category.type`. Tightened FK `ON DELETE` semantics across all tables. Added `updated_at` to every tenant table. Pinned the standard RLS policy shape in §5.3. Promoted Household Invites from deferred to Phase 2 Epic 10 (with full schema + acceptance flow) to resolve the partner-persona contradiction. Merged Epic 5.7/5.10 into a single "Soft delete with undo" story. Added Phase 1 progress tracker, positioning line in §1.4, and glossary entries (Quick add, Recurring banner, Soft delete, Profile). Fixed emoji variation selectors on 🍽️ and 🛍️. |
| 2.2 | 2026-05-13 | Phase 1 marked complete (all 8 epics merged). Added Phase 2 progress tracker: Epic 9 (Recurring, KAN-41–47) and Epic 12 (Budget, KAN-59/61) complete; Epic 13 (Dashboard Enhanced) partial via KAN-61, KAN-62, KAN-63; Epics 10/11/14 pending. |

---

## Next Steps

1. **Review this spec** — confirm alignment with v2.1 changes.
2. **Refine each upcoming epic** — detailed story review before building.
3. **Build epic by epic** with check-ins.
4. **Update this doc** as phases progress (it's a living document).

---

*"Know what's coming, control what goes out, track what happened"*
