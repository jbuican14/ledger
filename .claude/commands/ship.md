---
description: Ship completed dev work — create JIRA ticket, branch off main, commit staged work, push, open PR.
argument-hint: "<short ticket title>"
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

You are shipping completed dev work. Title argument: **$ARGUMENTS**

Run these steps **in order**. Stop and ask the user only when explicitly told to.

## 1. Snapshot the state
Run these in parallel:
- `git status --short`
- `git branch --show-current`
- `git diff --stat`

If working tree is clean, stop and tell the user there's nothing to ship.
If currently on a `feat/KAN-*` or `bug/KAN-*` branch (not `main`), assume the branch already exists — skip step 3 and reuse it.

## 2. Confirm scope (one question, only if ambiguous)
If `git status` shows files that look unrelated to the title, use `AskUserQuestion` once to confirm which files to include. Otherwise stage everything modified + new files relevant to the title.

## 3. Create JIRA ticket + branch (only if on main)
```bash
./scripts/create-jira-ticket.sh "$ARGUMENTS" "<one-paragraph description derived from the diff>" "Task"
```
Capture the `KAN-XX` from stdout. Then:
```bash
git checkout -b feat/KAN-XX-<kebab-slug-of-title>
```

## 4. Stage and commit
Stage explicit file paths (never `git add -A`). Wrap paths containing `()` in double quotes for zsh.

Commit message format:
```
feat(KAN-XX): <one-line summary>

<why — one short paragraph derived from the diff>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Use a HEREDOC (`git commit -m "$(cat <<'EOF' ... EOF)"`).

## 5. Push + open PR
```bash
git push -u origin <branch-name>
```
Then `gh pr create` with title `[KAN-XX] <summary>` and body:
```
## Summary
- <bullets from the diff>

JIRA: https://jbuican19.atlassian.net/browse/KAN-XX

## Test plan
- [ ] pnpm --filter @ledger/web test
- [ ] pnpm --filter @ledger/web typecheck
- [ ] pnpm --filter @ledger/web lint
- [ ] <manual checks specific to this change>
```

## 6. Report
Output a table:
| Step | Result |
|---|---|
| JIRA | KAN-XX (link) |
| Branch | <name> |
| Commit | <short-sha> — N files |
| PR | #N (link) |

Nothing else. No recap, no preamble.

## Rules
- Never push to `main` directly.
- Never use `--no-verify` or `--force`.
- If a step fails, stop and report — don't retry or work around.
- Don't run typecheck/lint/test as part of this command; assume dev verified them.
