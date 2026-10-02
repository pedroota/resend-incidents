---
name: pr-create
description: Create a pull request with a clear title and short summary. Use when the user asks to open a PR, create a pull request, or push and PR.
---

Create a GitHub pull request for the current branch. Title must be clear and descriptive. Body is a short bullet-point summary only — no test plan, no checklist, no "generated with" footer.

The user may provide context or a description. Otherwise infer from commits and diff.

## Steps

1. Run these in parallel:
   - `git status` — check for uncommitted changes
   - `git log main..HEAD --oneline` — see commits on this branch
   - `git diff main...HEAD --stat` — files changed
   - `gh pr list --head $(git branch --show-current)` — check if PR already exists
2. If there are uncommitted changes, commit them first using the commit skill rules (conventional commit, no body).
3. Push the branch if not already pushed: `git push -u origin HEAD`
4. Draft the PR:
   - **Title**: clear, imperative, English, ~60 chars max. Describes what the PR does, not the task ID.
   - **Body**: 2–5 bullet points summarizing what changed and why. No test plan. No checklist. No footer. No "Generated with Claude Code" or similar.
5. Run: `gh pr create --title "..." --body "..."`
6. Return the PR URL.

## Rules

- Title and body always in English.
- Body is bullets only — short, factual, no fluff.
- No test plan section, no checklist, no footer, no co-author lines.
- Never force-push to main/master.
- Base branch defaults to `main` unless the user specifies otherwise.
