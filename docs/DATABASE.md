# Database

> **Last updated:** 2026-09-26 (through migration `20260926000002_create_household_invite.sql`)
> **New to databases?** Start with [DATABASE_BASICS.md](./DATABASE_BASICS.md).
> **Source of truth:** `supabase/migrations/`. If this diagram and a migration disagree, the migration wins — update this file.

## Entity-relationship diagram

`created_at` / `updated_at` exist on every table and are omitted for readability.

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 (delete cascades)"
    households ||--|{ profiles : "members (RESTRICT)"
    households ||--o{ household_invites : "pending invites"
    profiles |o--o{ household_invites : "invited_by"

    households ||--o{ categories : ""
    households ||--o{ payment_methods : ""
    households ||--o{ transactions : ""
    households ||--o{ recurring_transactions : ""
    households ||--o{ budgets : ""
    households ||--o{ goals : ""
    households ||--o{ goal_contributions : ""

    profiles |o--o{ transactions : "user_id (who logged it)"
    categories |o--o{ transactions : ""
    payment_methods |o--o{ transactions : ""
    categories |o--o{ recurring_transactions : ""
    goals ||--o{ goal_contributions : ""

    auth_users {
        uuid id PK
        text email "unique, lowercase"
        jsonb raw_user_meta_data "full_name from Google"
    }
    households {
        uuid id PK
        text name "default 'My Finances'"
        text currency "default 'GBP'"
    }
    profiles {
        uuid id PK, FK "= auth.users.id"
        uuid household_id FK "exactly one household"
        text role "owner | member"
        text display_name
        text avatar_url
        bool onboarding_completed
    }
    household_invites {
        uuid id PK
        uuid household_id FK
        text email "lowercase; the authorisation"
        text role "owner | member"
        uuid token UK "in the share link; navigation only"
        uuid invited_by FK
        timestamptz expires_at "default now + 7 days"
        timestamptz accepted_at "NULL = pending"
    }
    categories {
        uuid id PK
        uuid household_id FK
        text name "unique per household"
        text color
        text icon
        text type "expense | income"
        int sort_order
    }
    payment_methods {
        uuid id PK
        uuid household_id FK
        text name "unique per household"
        int sort_order
    }
    transactions {
        uuid id PK
        uuid household_id FK
        uuid user_id FK
        uuid category_id FK
        uuid payment_method_id FK
        decimal amount "negative = expense"
        text description
        date transaction_date
        timestamptz deleted_at "soft delete"
    }
    recurring_transactions {
        uuid id PK
        uuid household_id FK
        uuid category_id FK
        text name
        decimal amount
        text frequency "weekly | monthly | yearly"
        date next_due_date
    }
    budgets {
        uuid id PK
        uuid household_id FK
        int year
        int month "unique (household, year, month)"
        decimal amount
    }
    goals {
        uuid id PK
        uuid household_id FK
        text name
        decimal target_amount
        decimal current_amount
        date target_date
        text icon
        text status "active | completed | archived"
    }
    goal_contributions {
        uuid id PK
        uuid goal_id FK
        uuid household_id FK "denormalised for RLS"
        decimal amount
        text note
        date contributed_at
    }
```

## How to read it

- **Everything hangs off `households`.** It is the tenant. Every data table
  carries `household_id`, and deleting a household cascades to all of them.
- **A user belongs to exactly one household** (`profiles.household_id`, single
  FK). Joining a household *moves* the user. See
  [HOUSEHOLD_SHARING_DESIGN.md](./HOUSEHOLD_SHARING_DESIGN.md) Decision 1.
- **`profiles` → `households` is `ON DELETE RESTRICT`**: a household can't be
  deleted while it has members. The reverse isn't enforced, so households can
  be left with no members (KAN-24).

## Signup: `handle_new_user()`

A trigger on `auth.users` INSERT. It runs inside the auth transaction, so an
error here fails **every** signup.

```mermaid
flowchart TD
    A[Row inserted into auth.users] --> B{Pending, unexpired invite<br/>for this email?}
    B -- yes --> C[Create profile in inviter's household<br/>role from invite, onboarding_completed = true]
    C --> D[Mark invite accepted_at = now]
    D --> E[Middleware → /dashboard]
    B -- no --> F[Create household 'My Finances']
    F --> G[Create profile, role = owner]
    G --> H[Seed categories + payment methods]
    H --> I[Middleware → /onboarding]
```

Tests: `supabase/tests/consume_invite_at_signup.sql` (runs in a rolled-back
transaction).

## Security model

| Layer | What it does |
|---|---|
| `GRANT … TO authenticated` | Table visible to supabase-js at all (required for new tables — see CLAUDE.md) |
| RLS policies | Row access: `household_id = get_user_household_id()` |
| `is_household_owner()` | Gates admin actions (invites) |
| `create_household_invite()` | The only way the UI creates invites. Owner-only; applies the ACTIVE/PENDING/EXPIRED claim rules (tests: `supabase/tests/create_household_invite.sql`) |
| Column-level `GRANT UPDATE` on `profiles` | Clients may only update `display_name`, `avatar_url`, `onboarding_completed`. `household_id` and `role` are writable only by `SECURITY DEFINER` functions |

Policies call `get_user_household_id()` rather than inlining the lookup, so a
future move to multi-household means rewriting one function, not every policy.
