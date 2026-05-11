# Ship workflow

How to take completed dev work → JIRA ticket → branch → commit → PR with **minimum tokens**.

## TL;DR

```text
/model haiku            # cheap model for the boring git/JIRA mechanics
/ship "Short title"     # runs the whole sequence
/model sonnet           # back to coding
```

`/ship` is defined in `.claude/commands/ship.md`. Read that file to see exactly what it runs.

---

## When to switch models

| Phase | Model | Why |
|---|---|---|
| Designing / writing code | **Sonnet 4.6** or **Opus 4.7** | Needs to reason about architecture, types, edge cases. |
| Reviewing / refactoring big diffs | **Sonnet 4.6** | Balanced reasoning + speed. |
| Shipping (commits, PRs, JIRA, branch ops) | **Haiku 4.5** | Pure mechanics. ~5× cheaper than Sonnet, ~25× cheaper than Opus. |
| Anything destructive (rebase, force push, history rewrite) | **Sonnet 4.6** | Don't trust a cheap model with irreversible ops. |

Switch with `/model haiku`, `/model sonnet`, `/model opus`.

---

## The full daily loop

```text
1.  /model sonnet                          ← start of dev
    "build me X" → review code → tests pass

2.  /model haiku                           ← work is done, dev verified
    /ship "Category management UI"

3.  /model sonnet                          ← next task
```

That's it. Steps 1 and 3 are the same model; step 2 is where you save tokens.

---

## What `/ship` actually does

Defined in `.claude/commands/ship.md`. In order:

1. `git status` + `git diff --stat` to see what's changed.
2. (Only if on `main`) creates a JIRA ticket via `scripts/create-jira-ticket.sh` and captures the KAN-XX number.
3. (Only if on `main`) `git checkout -b feat/KAN-XX-<slug>`.
4. Stages **explicit file paths only** (never `git add -A` — see [rules](#rules)).
5. Commits with `feat(KAN-XX): …` + `Co-Authored-By` trailer.
6. `git push -u origin <branch>`.
7. `gh pr create` with summary + test plan + JIRA link.
8. Prints a 4-row results table — no other output.

If the branch already exists (you're already on a `feat/KAN-*` branch), `/ship` skips steps 2 and 3 and just adds a commit + push. Useful for follow-up commits on an open PR.

---

## Prerequisites

| Thing | Where | Set up? |
|---|---|---|
| `.env.jira` with `JIRA_URL`, `JIRA_PROJECT_KEY`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | repo root | ✅ |
| `gh` authenticated | `gh auth status` | ✅ |
| `scripts/create-jira-ticket.sh` executable | `ls -l scripts/` | ✅ |
| `.github/workflows/jira-transition.yml` (auto-moves ticket to *In Progress* on push) | `.github/workflows/` | ✅ |

If any of these are missing, `/ship` will fail at that step and report — fix and re-run.

---

## When NOT to use `/ship`

- **Hotfixes to main** — different branch convention, do it manually.
- **Multi-commit features** — `/ship` makes one commit. For a multi-commit branch, commit manually as you go, then use `/ship` for the final push + PR (it skips steps 2/3 if a branch already exists).
- **Anything needing a Bug or Epic JIRA type** — script defaults to `Task`. Edit the slash command or run the script manually for `Bug` / `Epic`.

---

## Tweaking it

The slash command file (`.claude/commands/ship.md`) is plain markdown. Edit it directly:

- Want a different branch prefix? Change the `feat/KAN-` template.
- Want a different commit format? Change the `feat(KAN-XX):` template.
- Want to run lint/typecheck/tests as part of ship? Add a step before commit. (Currently off — the assumption is dev already verified locally.)

---

## Rules

These are enforced inside `/ship` and should hold for manual shipping too:

- **Never** `git add -A` or `git add .` — stage explicit paths so secrets / build artifacts / unrelated WIP can't sneak in.
- **Never** push to `main` directly.
- **Never** `--no-verify`, `--force`, `--amend` on shared commits.
- If a step fails, stop and surface the error — don't retry blindly.
- Paths containing `()` (Next.js route groups like `(protected)`) need double quotes under zsh.

---

## Cost estimate

For the KAN-23 ship (9 files, ~1100 LOC diff):

| Model | Approx cost |
|---|---|
| Opus 4.7 doing it | ~$0.30 |
| Sonnet 4.6 doing it | ~$0.06 |
| Haiku 4.5 doing it | ~$0.012 |

Numbers are rough — actual depends on conversation length. The shape is what matters: **haiku for ship, sonnet/opus for code**.
