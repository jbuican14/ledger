# Family Budget App - Product Specification

> **Document Version:** 2.0
> **Last Updated:** 2026-04-07
> **Status:** Draft - Revised after PO Review

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

---

## 3. Core Value Proposition

### 3.1 Unique Angle

**"Smart recurring-aware monthly tracking with user control"**

Not another budget app. Not another tracker. A tool that:
1. Reminds you what's coming (recurring awareness)
2. Lets you approve/skip recurring items (user control)
3. Shows you where you actually are (monthly tracking)

### 3.2 Core Jobs-to-be-Done

| Job | Feature |
|-----|---------|
| "I want to log an expense quickly" | Quick add (2 fields) |
| "I want to know what bills are coming" | Recurring expense list |
| "I want to see this month's spending" | Monthly dashboard view |
| "I want my partner to see too" | Household sharing |

### 3.3 What We're NOT Building (v1)

- Full budgeting system with envelopes
- Bank connection / Open Banking
- Receipt OCR
- Complex analytics
- Subscription billing

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

- Celebrate small wins ("5 days logging streak!")
- Show progress ("20% less than last week")
- Surface insights proactively

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
├── has many → Users
├── has many → Categories
├── has many → Transactions
├── has many → Recurring Transactions
├── has one → Budget (optional)
└── has many → Goals (Phase 2)
```

Row Level Security ensures data isolation.

---

## 6. Database Schema

### 6.1 Core Tables (Phase 1)

```sql
-- Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    household_id UUID REFERENCES households(id),
    display_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Households
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'My Finances',
    currency TEXT DEFAULT 'GBP',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    is_income BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_income BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft delete for undo
);
```

### 6.2 Phase 2 Tables

```sql
-- Recurring Transactions
CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    frequency TEXT NOT NULL, -- 'weekly' | 'monthly' | 'yearly'
    next_due_date DATE,
    is_income BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    target_date DATE,
    icon TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget (simple, one per household)
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE UNIQUE,
    monthly_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Phase 1: Core MVP

> **Goal:** User logs first expense in <60 seconds
> **Scope:** Foundation + Auth + Navigation + Categories + Transactions + Onboarding (light) + Empty States + Polish

---

### Epic 1: Project Foundation

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 1.1 | Monorepo setup | Must | Medium | pnpm + Turborepo working, apps/web created |
| 1.2 | Next.js app | Must | Medium | App Router + Tailwind + shadcn/ui installed |
| 1.3 | Supabase setup | Must | Low | Project created, local dev with `supabase start` |
| 1.4 | Database schema (Phase 1) | Must | Medium | profiles, households, categories, transactions tables |
| 1.5 | RLS policies | Must | Medium | Users only access own household data |
| 1.6 | Environment config | Must | Low | .env.local, .env.example documented |
| 1.7 | CI pipeline | Should | Medium | GitHub Actions: lint, typecheck, build |

**Definition of Done:** Fresh clone → `pnpm install` → `pnpm dev` → app runs with Supabase connected

---

### Epic 2: Authentication

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 2.1 | Email signup | Must | Medium | Form validates, sends verification email |
| 2.2 | Email login | Must | Low | Success → dashboard, failure → error message |
| 2.3 | Google OAuth | Should | Medium | One-click login, creates profile if new |
| 2.4 | Password reset | Must | Medium | Email sent, link works, password updated |
| 2.5 | Household creation | Must | Medium | Created automatically after first login |
| 2.6 | Auth context | Must | Medium | `useAuth()` returns user, household, isLoading |
| 2.7 | Protected routes | Must | Medium | Middleware redirects unauthenticated to /login |
| 2.8 | Logout | Must | Low | Clears session, redirects to login |

**Definition of Done:** User can sign up → verify email → see dashboard

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
- [Goals - Phase 2]

---

### Epic 4: Category Management

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 4.1 | Default categories | Must | Low | Seeded on household creation |
| 4.2 | UK template | Should | Low | One-click applies UK-specific categories |
| 4.3 | Category list (settings) | Must | Low | Grid/list of all categories |
| 4.4 | Add category | Must | Medium | Name, color picker, icon picker |
| 4.5 | Edit category | Must | Low | Update name, color, icon |
| 4.6 | Delete category | Must | Medium | Confirmation, reassign transactions option |
| 4.7 | Icon picker | Should | Medium | Grid of common expense icons |

**Default Categories:**
| Name | Color | Icon | Type |
|------|-------|------|------|
| Groceries | Green | 🛒 | Expense |
| Bills | Blue | 📄 | Expense |
| Transport | Orange | 🚗 | Expense |
| Entertainment | Purple | 🎬 | Expense |
| Eating Out | Red | 🍽 | Expense |
| Shopping | Pink | 🛍 | Expense |
| Health | Teal | 💊 | Expense |
| Other | Grey | 📦 | Expense |
| Salary | Green | 💰 | Income |
| Other Income | Green | 💵 | Income |

**UK Template Additions:**
- Council Tax
- TV Licence
- Childcare

---

### Epic 5: Transaction Management (Core)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 5.1 | Add transaction modal | Must | Medium | Modal opens from FAB, closes on submit/cancel |
| 5.2 | Quick add form | Must | Low | Amount + category only, date defaults to today |
| 5.3 | Expanded form | Must | Medium | "More details" reveals: date picker, description |
| 5.4 | "Add another" checkbox | Must | Low | When checked, form clears but stays open |
| 5.5 | Transaction list | Must | High | Grouped by day with daily subtotals |
| 5.6 | Edit transaction | Must | Medium | Click row → edit modal |
| 5.7 | Delete transaction | Must | Low | Soft delete, shows undo toast |
| 5.8 | Income toggle | Must | Low | Switch between expense/income |
| 5.9 | Optimistic UI | Must | Medium | Show change immediately, sync background |
| 5.10 | Undo delete | Must | Medium | Toast with "Undo" for 5 seconds |

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

### Epic 0: Onboarding (Light)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 0.1 | Onboarding wrapper | Must | Low | 3-step wizard with progress dots |
| 0.2 | Step 1: Household name | Must | Low | Text input, "My Finances" default, skip = default |
| 0.3 | Step 2: Currency | Must | Low | Dropdown, GBP default, 5 common options |
| 0.4 | Step 3: Category template | Must | Low | 3 choices: Default, UK, Custom later |
| 0.5 | Complete → Dashboard | Must | Low | Sets onboarding_completed = true |

**Total onboarding time target: 30-60 seconds**

---

### Epic E: Empty States

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| E.1 | Empty dashboard | Must | Low | Welcome message + "Add first expense" CTA |
| E.2 | Empty transaction list | Must | Low | Illustration + encouraging message + CTA |
| E.3 | Empty category list | Should | Low | Shouldn't happen, but graceful fallback |

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

### Epic P: Polish

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| P.1 | Loading skeletons | Must | Medium | Skeleton UI for all lists and cards |
| P.2 | Error boundaries | Must | Medium | Graceful error UI, retry button |
| P.3 | Offline indicator | Should | Low | Banner when offline |
| P.4 | Success toasts | Must | Low | Subtle confirmation on add/edit |
| P.5 | Form validation | Must | Medium | Inline errors, disabled submit when invalid |

---

### Phase 1 Summary

| Epic | Stories | Must | Should | Could |
|------|---------|------|--------|-------|
| 1: Foundation | 7 | 6 | 1 | 0 |
| 2: Auth | 8 | 7 | 1 | 0 |
| 3: Navigation | 6 | 6 | 0 | 0 |
| 4: Categories | 7 | 5 | 2 | 0 |
| 5: Transactions | 10 | 10 | 0 | 0 |
| 0: Onboarding | 5 | 5 | 0 | 0 |
| E: Empty States | 3 | 2 | 1 | 0 |
| P: Polish | 5 | 4 | 1 | 0 |
| **Total** | **51** | **45** | **6** | **0** |

---

## 8. Phase 2: Engagement

> **Goal:** Build habits with recurring awareness and goal tracking
> **Prerequisite:** Phase 1 complete, users actively logging

---

### Epic 11: Recurring Transactions

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 11.1 | Recurring schema | Must | Medium | Table created with RLS |
| 11.2 | Add recurring | Must | Medium | Form: name, amount, category, frequency |
| 11.3 | Recurring list | Must | Low | View all recurring items in settings |
| 11.4 | Edit recurring | Must | Low | Modify details |
| 11.5 | Delete recurring | Must | Low | With confirmation |
| 11.6 | Monthly banner | Must | High | Dashboard: "3 items due this month - Add?" |
| 11.7 | Quick-add from banner | Must | Medium | One click adds selected items as transactions |

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

### Epic 7: Savings Goals

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 7.1 | Goals schema | Must | Low | Table created |
| 7.2 | Create goal | Must | Medium | Name, target amount, optional date |
| 7.3 | Goals dashboard widget | Must | Medium | Cards with progress bars |
| 7.4 | Goal detail page | Must | Medium | Full info, contribution history |
| 7.5 | Add contribution | Must | Medium | Record amount added to goal |
| 7.6 | Edit goal | Must | Low | Update details |
| 7.7 | Archive goal | Must | Low | Mark complete or abandoned |
| 7.8 | Empty goals state | Must | Low | "What are you saving for?" + suggestions |

---

### Epic 12: Budget (Simple)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 12.1 | Budget schema | Must | Low | Simple monthly_amount per household |
| 12.2 | Set budget | Must | Medium | Settings page, single number |
| 12.3 | Budget widget | Must | Medium | Dashboard: "£800 left of £2,000" with bar |
| 12.4 | Budget nudge | Should | Low | If no budget, prompt to set one |

---

### Epic 8: Dashboard (Enhanced)

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| 8.1 | Dashboard layout | Must | Medium | Card grid, responsive |
| 8.2 | This month spending | Must | Low | Total spent card |
| 8.3 | Budget status | Must | Medium | Remaining vs total (if budget set) |
| 8.4 | Goals widget | Must | Low | Progress bars for active goals |
| 8.5 | Recurring banner | Must | Low | (from Epic 11) |
| 8.6 | Category breakdown | Should | Medium | Pie chart of spending |
| 8.7 | Recent transactions | Must | Low | Last 5 items |

---

### Epic F: Feedback & Insights

| ID | Story | Priority | Complexity | Acceptance Criteria |
|----|-------|----------|------------|---------------------|
| F.1 | Spending comparison | Should | Medium | "20% less than last week" |
| F.2 | Goal progress | Should | Low | "On track!" / "Falling behind" |
| F.3 | Logging streak | Could | Low | "5 days in a row!" |
| F.4 | Category insight | Could | Medium | "Food spending higher than usual" |

---

### Phase 2 Summary

| Epic | Stories |
|------|---------|
| 11: Recurring | 7 |
| 7: Goals | 8 |
| 12: Budget | 4 |
| 8: Dashboard | 7 |
| F: Feedback | 4 |
| **Total** | **30** |

---

## 9. Phase 3: Power Features

> **Goal:** Advanced capabilities for engaged users
> **Prerequisite:** Phase 2 complete, users requesting these features

---

### Epic 6: CSV Import

| ID | Story | Complexity |
|----|-------|------------|
| 6.1 | File upload | Medium |
| 6.2 | Column mapping | High |
| 6.3 | Preview table | Medium |
| 6.4 | Duplicate detection | High |
| 6.5 | Import confirmation | Medium |

---

### Epic 5.x: Transaction Enhancements

| ID | Story | Complexity |
|----|-------|------------|
| 5.11 | Filter by category | Medium |
| 5.12 | Filter by date range | Medium |
| 5.13 | Search by description | Medium |
| 5.14 | Bulk delete | High |

---

### Epic 13: Monthly View

| ID | Story | Complexity |
|----|-------|------------|
| 13.1 | Monthly summary page | Medium |
| 13.2 | Recurring vs one-off split | Medium |
| 13.3 | Month selector | Low |
| 13.4 | Export CSV | Medium |

---

### Epic 12.x: Budget Enhancements

| ID | Story | Complexity |
|----|-------|------------|
| 12.5 | Category-level budgets | High |
| 12.6 | 80% alert notification | High |
| 12.7 | Over-budget alert | Medium |

---

## 10. Deferred Features

These are **not planned** but documented for future consideration:

| Feature | Rationale for Deferral |
|---------|------------------------|
| Household invite | Complexity, low early need |
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
| Household | A tenant/account grouping users |
| Transaction | A single expense or income entry |
| Category | Classification for transactions |
| Goal | A savings target |
| Budget | Monthly spending limit |
| Recurring | An expected regular expense |
| FAB | Floating Action Button |
| RLS | Row Level Security |
| Optimistic UI | Show changes before server confirms |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-07 | Initial draft (too broad) |
| 2.0 | 2026-04-07 | Revised after PO review: leaner MVP, progressive phases, added empty states + polish + feedback |

---

## Next Steps

1. **Review this spec** - confirm alignment
2. **Refine Epic 1** - detailed story review before building
3. **Build Epic 1** - story by story with check-ins
4. **Repeat** for each epic

---

*"Know what's coming, control what goes out, track what happened"*
