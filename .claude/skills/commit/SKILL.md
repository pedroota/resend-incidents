---
name: commit
description: Stage and commit changes with a concise conventional commit message. Use when the user asks to commit, create a commit, or save changes.
---

Create a git commit for the current changes. No body, no description, no co-author trailer — just a clean one-line conventional commit message in English.

The user may provide a short description or the context is inferred from the diff.

## Steps

1. Run `git diff --staged` and `git status` in parallel to understand what's changed.
2. Commit only what is already staged. Never stage additional files unless the user explicitly says to.
3. Pick the right prefix based on the change:
   - `feat:` — new feature or behavior
   - `fix:` — bug fix
   - `refactor:` — code change with no behavior change
   - `chore:` — tooling, deps, config, build
   - `docs:` — documentation only
   - `style:` — formatting, whitespace
   - `test:` — tests only
   - `perf:` — performance improvement
4. Write a short imperative message, lowercase after the prefix. No period. Max ~60 chars.
5. Commit with: `git commit -m "type: message"` — one line only, no body, no trailers.

## Rules

- One-liner commit always: `git commit -m "type: message"`. No `-m` body, no blank lines, no trailers.
- Message always in English.
- Never stage extra files unless explicitly asked.
- Never use `--no-verify`.
- If pre-commit hook fails, fix the issue and retry — do NOT amend the previous commit.
- If the user provides a description, use it (cleaned up). Otherwise infer from the diff.
