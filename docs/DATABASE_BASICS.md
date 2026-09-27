# Database basics — a guide for this project

> For anyone new to databases. Every example comes from Ledger's real schema.
> For the actual schema diagram see [DATABASE.md](./DATABASE.md).

Read top to bottom the first time — each section builds on the one before.

---

## 1. Tables, rows, columns

A **table** is like a spreadsheet tab. A **column** is a field every row has. A
**row** is one record.

`households`

| id | name | currency |
|---|---|---|
| `a1…` | Smith Family | GBP |
| `b2…` | My Finances | GBP |

`profiles` (one row per user)

| id | household_id | role | display_name |
|---|---|---|---|
| `u1…` | `a1…` | owner | Jo |
| `u2…` | `a1…` | member | Sam |

Jo and Sam share a household because both rows say `household_id = a1…`.

---

## 2. Keys — how tables point at each other

**Primary key (PK):** the column that uniquely identifies a row. Here it's
always `id`, a random UUID like `3f2a9c1e-…`.

**Foreign key (FK):** a column holding *another table's* primary key.
`profiles.household_id` is a foreign key to `households.id`. The database
refuses a value that doesn't exist in `households` — you can't point at
nothing.

### What happens on delete

Every foreign key says what to do when the row it points at is deleted:

| Rule | Meaning | Example in Ledger |
|---|---|---|
| `CASCADE` | Delete me too | Delete a household → its transactions go with it |
| `RESTRICT` | Refuse the delete | Can't delete a household while profiles still point at it |
| `SET NULL` | Keep me, blank the pointer | Delete a category → its transactions stay, `category_id` becomes empty |

Choosing these is a product decision: *"if X disappears, what should happen to
Y?"*

---

## 3. Constraints — rules the database enforces

Constraints make bad data **impossible**, not just unlikely.

| Constraint | Example | Stops |
|---|---|---|
| `NOT NULL` | `profiles.household_id` | A user with no household |
| `CHECK` | `role IN ('owner','member')` | `role = 'admin'` or a typo |
| `CHECK` | `email = lower(email)` | `Jo@Example.com` stored with capitals |
| `UNIQUE` | `(household_id, name)` on categories | Two "Groceries" in one household |

**Partial unique index** — unique only among some rows:

```sql
CREATE UNIQUE INDEX … ON household_invites(household_id, email)
    WHERE accepted_at IS NULL;
```

"One *pending* invite per email per household." Once an invite is accepted it
drops out of the rule, so the same person can be invited again later.

**Why enforce rules in the database and not just the UI?** The UI is one way
in. The API is another, and anyone can call it directly. Rules in the database
hold no matter how the data arrives.

---

## 4. NULL — "unknown", not "zero"

`NULL` means *no value / unknown*. It is not `0`, not `''`, not `false`.

The trap: **any comparison with NULL gives NULL (unknown), not true or false.**

```sql
NULL > '2026-09-01'   -- NULL, not true, not false
NULL = NULL           -- NULL! use  IS NULL  instead
```

And `IF <unknown> THEN` behaves like false — it falls to `ELSE`.

**Real bug from 10.3:** the invite function asked *"did they sign up less than
7 days ago?"* using `auth.users.created_at`, which was NULL in the test. The
answer was *unknown*, so the code fell into the `ELSE` branch — which **deletes
the user**. Fix: read the time from a column declared `NOT NULL`.

**Habit:** whenever you compare a column, ask *"can this be NULL, and what
happens if it is?"*

---

## 5. Migrations — how the schema changes

A **migration** is a SQL file that changes the database structure. They live in
`supabase/migrations/` and are named with a timestamp so they run in order:

```
20240407000001_initial_schema.sql
20260908000001_add_household_invites.sql
20260926000002_create_household_invite.sql
```

Rules:

1. **Never edit a migration that has already run.** The database won't re-run
   it, so your edit does nothing — and the file now lies about what the
   database contains. Write a new migration instead.
2. **Explain why in comments.** A migration runs once and lives forever.
3. **Test before applying** (see section 9).

In this project migrations are applied by pasting them into the Supabase SQL
Editor.

---

## 6. Roles — who is asking

The database knows *who* is running each query:

| Role | Who | Can do |
|---|---|---|
| `postgres` | Admin — the SQL Editor, migrations | Everything |
| `authenticated` | A signed-in app user | Only what's granted, filtered by RLS |
| `anon` | A visitor who isn't signed in | Nothing in this app |

**GRANT** decides which *tables and columns* a role may touch at all:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON household_invites TO authenticated;
GRANT UPDATE (display_name, avatar_url, onboarding_completed) ON profiles TO authenticated;
```

The second line is a **column-level grant**: users may edit their name but not
their `household_id` or `role` — otherwise anyone could move themselves into
another household or promote themselves to owner.

---

## 7. Row Level Security (RLS) — which rows

GRANT says *"you may read `transactions`"*. RLS says *"…but only these rows"*.

```sql
CREATE POLICY "Users view own household rows" ON transactions
    FOR SELECT
    USING (household_id = get_user_household_id());
```

Postgres silently adds that condition to every query. The app runs
`SELECT * FROM transactions` and gets only its own household's rows — even if
the frontend has a bug.

| Clause | Applies to | Question it answers |
|---|---|---|
| `USING` | SELECT, UPDATE, DELETE | Which existing rows can you see/touch? |
| `WITH CHECK` | INSERT, UPDATE | Is the new/changed row allowed? |

`get_user_household_id()` looks up the signed-in user's household. **Every**
policy uses it, so the rule lives in one place.

> **The frontend is not security.** Hiding a button stops honest users seeing
> an action that would fail. RLS and grants stop everyone else.

---

## 8. Functions and triggers

A **function** is a named piece of SQL you can call:

```ts
supabase.rpc("create_household_invite", { p_email: "sam@example.com" })
```

Use one when the logic needs several steps, or needs to read something the user
can't see directly (like `auth.users`).

A **trigger** runs a function *automatically* when something happens:

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

"Whenever someone signs up, run `handle_new_user()`" — that's what creates
their household, or joins them to an invited one. Inside a trigger, `NEW` is
the row just inserted (`NEW.email`, `NEW.id`).

### SECURITY DEFINER — use with care

Normally a function runs with the **caller's** permissions. `SECURITY DEFINER`
runs it with the **creator's** (admin) permissions, bypassing RLS.

Needed when a user must do something they otherwise can't — e.g. the invite
function reads `auth.users`. Dangerous because it bypasses the protections
above, so every such function in Ledger:

1. **Checks permission itself first** — e.g. `IF NOT is_household_owner()`
2. **Pins `search_path`** — `SET search_path = public, auth` — so nobody can
   plant a fake table with the same name to trick it
3. **Derives the household from the signed-in user**, never from input

---

## 9. Transactions — all or nothing

A **transaction** groups statements so they either *all* happen or *none* do.

```sql
BEGIN;
  -- changes…
ROLLBACK;   -- undo everything
-- or COMMIT; to keep it
```

Our SQL tests use this: `BEGIN`, apply the migration, run the checks,
`ROLLBACK`. The real database ends up unchanged — a free rehearsal. If anything
errors midway, the whole transaction is abandoned, so a failed test leaves no
trace either.

The signup trigger runs **inside** Supabase's signup transaction. If it errors,
the signup is rolled back — which is why a bug there breaks *every* signup.

---

## 10. Derived vs stored state

Invite claims can be ACTIVE, PENDING or EXPIRED. We **don't** store that in a
`status` column — we work it out from facts:

| State | Facts |
|---|---|
| ACTIVE | email confirmed |
| PENDING | not confirmed, joined < 7 days ago |
| EXPIRED | not confirmed, joined ≥ 7 days ago |

A stored `status` would need something to flip PENDING → EXPIRED at exactly the
right moment. Forget once, and it disagrees with reality. Derived state is
always correct.

**Rule of thumb:** store facts (*when* did they join, *when* did they confirm);
compute conclusions.

---

## 11. Reading errors

Postgres errors carry a 5-character **SQLSTATE** code. Code checks the code,
humans read the message.

| Code | Name | Where you'll see it |
|---|---|---|
| `23505` | unique_violation | Duplicate pending invite |
| `23503` | foreign_key_violation | Pointing at a row that doesn't exist |
| `23502` | not_null_violation | Missing a required column |
| `23514` | check_violation | `role = 'admin'` |
| `42501` | insufficient_privilege | Missing GRANT, RLS refused, or not the owner |
| `22023` | invalid_parameter_value | Bad email passed to the invite function |
| `P0001` | raise_exception | Our own `RAISE EXCEPTION` messages |
| `P0004` | assert_failure | A failed `ASSERT` in our SQL tests |

`42501 permission denied for table` on a **new** table almost always means the
`GRANT` is missing (see CLAUDE.md migration template).

---

## Glossary

| Term | Meaning |
|---|---|
| Schema | The structure — which tables and columns exist |
| Migration | A SQL file that changes the schema |
| PK / FK | Primary key / foreign key |
| Constraint | A rule the database enforces on data |
| Index | A lookup structure that makes searches fast (and can enforce uniqueness) |
| RLS | Row Level Security — per-row access rules |
| Policy | One RLS rule |
| Role | Who is running a query (`postgres`, `authenticated`, `anon`) |
| GRANT | Permission for a role on a table/column/function |
| Trigger | A function that runs automatically on INSERT/UPDATE/DELETE |
| RPC | Calling a database function from the app (`supabase.rpc`) |
| SECURITY DEFINER | Function runs with its creator's permissions |
| Transaction | Group of statements that succeed or fail together |
| NULL | Unknown / no value — comparisons with it are unknown too |
| Tenant | The unit data is isolated by — here, a household |
