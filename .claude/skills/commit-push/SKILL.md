---
name: commit-push
description: Commit and push all coding changes to git. Use this after making code changes to prompt the user for approval, then commit and push.
allowed-tools: Bash(git *), Bash(npx prettier *), Bash(npx tsc *), Bash(npx eslint *), Bash(npx react-scripts build), AskUserQuestion
argument-hint: [commit message]
user-invocable: true
auto-invoke: true
---

# Commit & Push

Commit and push code changes after the user approves them.

## When to Auto-Invoke

After completing any coding task that modifies files (bug fixes, features, refactors, style changes), automatically invoke this skill to prompt the user for approval before committing and pushing.

**Do NOT invoke** if:
- No files were changed
- The user explicitly said not to commit
- The changes are exploratory / draft / WIP that the user hasn't reviewed yet

## Procedure

### Step 1: Show Changes Summary

Run `git status` and `git diff --stat` to build a short summary of what changed. Present a concise list of modified files and what was done.

### Step 2: Prompt for Approval

Use `AskUserQuestion` to ask the user to approve the changes:

- **Question**: "Ready to commit and push these changes?"
- **Options**:
  - "Approve & Push" — commit and push immediately
  - "Approve (no push)" — commit only, do not push
  - "Skip" — do not commit

### Step 3: Pre-Commit Checks

If approved, run the following checks on changed files:

1. **Prettier**: `npx prettier --write` on all changed `.ts` / `.tsx` files
2. **TypeScript**: `npx tsc --noEmit` in each affected package
3. If `packages/shared` was modified, rebuild it first: `cd packages/shared && npm run build`

If any check fails, fix the issue and re-run. Do not commit with failing checks.

### Step 4: Commit

1. Run `git status` to see all changes (including any prettier formatting fixes).
2. Stage only the relevant files (not `.claude/`, `.expo/`, `.env`, `*.zip`, `nul`, or other non-code artifacts).
3. Generate a commit message following the project convention:
   - If `$ARGUMENTS` was provided, use it as the commit message.
   - Otherwise, infer a message from the changes: `<type>: <short description>`
   - Types: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`
4. Commit with:
   ```
   <type>: <short description>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   ```

### Step 5: Push (if approved)

If the user selected "Approve & Push":

```bash
git push
```

Report the commit SHA and push status to the user.

### Step 6: Confirm

Display:
- Commit SHA
- Files committed
- Push status (pushed / local only / skipped)
