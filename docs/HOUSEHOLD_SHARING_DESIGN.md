# Epic 10 — Household Sharing: design & refinement

> **Refined:** 2026-09-10
> **Status:** 10.1 shipped; 10.2–10.5 not started
> **Related:** `docs/AUTH_PATTERNS.md`, `supabase/migrations/20260908000001_add_household_invites.sql`

The reasoning behind how sharing works, so a future change starts from the
decisions rather than re-litigating them.

---

## Product framing

Ledger is a budget app for **households**, not individuals. Until now every user
has been alone in a household of one, which makes the core promise — *"know
what's coming, control what goes out"* — only half true. A budget one partner
can't see isn't a household budget.

The moment that matters is **invite acceptance**. It is the highest-friction
point in the entire product: a person who did not choose Ledger, being asked to
create an account because their partner asked them to. Every decision below is
weighted toward making that moment survivable.

---

## Decision 1 — One household per user (keep the single FK)

`profiles.household_id` is a single `NOT NULL` FK. Joining a household **moves**
a user rather than adding a membership row.

**Rejected:** a `household_members` join table (M:N).

| | Single FK | Membership table |
|---|---|---|
| RLS changes needed | none | every policy |
| Multi-household | impossible | supported |
| UI cost | none | household switcher on every screen |

Multi-household serves real people — an adult child managing a parent's budget,
an accountant with clients — but that is a **different product** with a household
switcher in the nav and a "which household?" field on every form. That directly
contradicts *speed over completeness* and *progressive disclosure*.

### Why this is safe rather than merely cheap

Every RLS policy calls `get_user_household_id()` instead of inlining
`profiles.household_id`. Migrating to a membership model later means adding a
table, backfilling from `profiles`, and **rewriting one function** — the policies
never change.

Choose the simple model only when the escape hatch is verified. It is.

---

## Decision 2 — Two roles: `owner` and `member`, both with full edit

- **Data actions are symmetric.** Either person can add, edit or delete
  transactions, budgets and goals. Shared money implies shared agency.
- **Administrative actions are owner-only.** Invite, remove members, rename or
  delete the household.

That split is explicable to a user in one sentence, which is the real test of a
permission model.

### Why no `viewer` role yet

A read-only partner makes an uncomfortable statement about the relationship — the
product telling one person they are a guest in their own finances. The genuinely
compelling read-only cases (a teenager, an aging parent) are speculative for us
today.

Adding a third role later is easy; removing one people depend on is not.
Permission systems only ever grow.

`owner` is still needed with only two roles, because someone must be able to
remove members — and the last owner must never be removable, since
`households.household_id` is `ON DELETE RESTRICT` and an orphaned household
cannot even be cleaned up.

---

## Decision 3 — Invite by shareable link, authorised by email

The owner enters the invitee's email and gets a copyable link to share however
they like — WhatsApp, text, in person.

**Rejected:** sending email ourselves (needs Resend + domain verification before
anything reaches an inbox) and `auth.admin.inviteUserByEmail()` (needs the
service role key, and creates the auth user before acceptance).

### The security model

**The link is navigation. The email is the authorisation.**

A stranger who obtains the link still cannot join, because the join is decided by
matching their signup email against `household_invites.email`. Possession of the
token is not sufficient.

This also sidesteps a problem that killed the token-passing alternative: a token
carried through `options.data` at signup works for email/password but has nowhere
to live in `signInWithOAuth`. Email matching works identically for both.

Invites expire after 7 days and are single-use (`accepted_at`).

---

## Decision 4 — Block invitees who already have an account (v1)

If the invited email already has a Ledger account, the invite is **refused with a
clear message** rather than accepted.

Accepting would overwrite their `household_id`, orphaning their existing data —
not deleted, but invisible and unrecoverable through the UI. That is the one
outcome we must never ship.

Merging two households means reconciling categories, payment methods, budgets and
goals: an epic of its own. The dominant real flow is *"I use Ledger, my partner
has never heard of it"*, so v1 serves that and is honest about the rest.

**Detection is non-negotiable even in v1.** Silent overwriting is not an option.

---

## Known gap

Any signed-in user can reach `/reset-password` without re-authenticating — see
`docs/PASSWORD_RESET_SECURITY.md`. Revisit alongside Settings → Change password.

---

## Stories

### 10.1 — Schema ✅ shipped

`household_invites` table, `profiles.role`, `is_household_owner()`.

Also closed two pre-existing holes found during the work:

- `"Users can update own profile"` constrained the **row** but not the
  **columns**, so any user could set their own `household_id` to an arbitrary
  value and join another household. RLS cannot express column restrictions;
  fixed with column-level `GRANT` limiting client UPDATE to `display_name`,
  `avatar_url`, `onboarding_completed`.
- Profile `SELECT` was limited to your own row, which makes a members list
  impossible. Widened to the household.

### 10.2 — Consume the invite at signup

**Why:** without this the invite does nothing — a new user always lands in a
fresh household of their own.

**What:** `handle_new_user()` checks for a pending, unexpired invite matching
`NEW.email`. If found: join that household, adopt the invite's role, mark the
invite accepted, and **skip the category/payment-method seeding** (the household
already has them) and onboarding (name and currency already exist). Otherwise
behave exactly as today.

**Risk:** this trigger runs inside the auth transaction. A failure here breaks
**all** signups, not just invited ones. Every new branch must be exercised.

**AC**
- Invited email signs up → lands in the inviter's household as `member`
- No duplicate categories or payment methods are created
- Invitee skips onboarding
- Invite is marked accepted and cannot be reused
- Expired invite → normal signup, own household
- No invite → unchanged behaviour
- Works for both email/password and Google

### 10.3 — Create and revoke invites

**Why:** the owner needs a way to produce the link.

**What:** Settings → Household gains an invite form (email in, link out) and a
pending-invites list with revoke. Owner-only, enforced by RLS.

**AC**
- Owner creates an invite and can copy the link
- Email is lowercased before insert (the `CHECK` constraint enforces it)
- Duplicate pending invite for the same email is prevented (partial unique index)
- Non-owner sees no invite UI, and is refused by RLS if they try anyway
- Revoke deletes the invite and the link stops working

### 10.4 — Members list and removal

**Why:** sharing without a way to un-share is a trap.

**What:** list household members with role. Owner can remove a member, which
moves them to a fresh household of their own rather than deleting them.

**AC**
- All household members visible with roles
- Owner can remove a member; member cannot remove anyone
- The last owner cannot be removed or demoted
- A removed member retains their account and lands in a new empty household

### 10.5 — Invite landing page and existing-account block

**Why:** the link has to lead somewhere that explains itself.

**What:** `/invite/<token>` shows who invited them and which household, then
routes to signup. If the email already has an account, explain clearly instead of
proceeding.

**AC**
- Valid token → landing page naming the household, with a signup CTA
- Expired, revoked or already-used token → clear message, no signup path
- Invited email already registered → explicit "this email already has an account"
- Signing up with a *different* email than invited → normal signup, own
  household, and the invite stays pending

---

## Build order

10.2 → 10.3 → 10.5 → 10.4.

10.2 first because nothing is testable without it. 10.4 last because removal only
matters once people can actually join.
