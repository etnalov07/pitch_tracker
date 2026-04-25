---
name: dev-workflow
description: Full development workflow — classifies a request as bug or feature, creates a numbered branch, builds a plan, writes tests, iterates until green, then commits and opens a PR.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git *), Bash(gh *), Bash(npx jest *), Bash(npx tsc *), Bash(npx prettier *), Bash(npx eslint *), Bash(npm run *), Bash(cd packages/* && *), AskUserQuestion
argument-hint: <description of the change you want>
user-invocable: true
---

# Dev Workflow

End-to-end flow from request to merged PR. Covers classification, branch creation, planning, test-driven implementation, and PR creation.

## Invocation

`/dev-workflow <description of the change you want>`

## Procedure

---

### Step 1: Classify — Bug or Feature?

Use `AskUserQuestion` to ask:

> "Is this a **bug** (something broken that needs fixing) or a **new feature** (new capability to build)?"

Options: "Bug", "Feature"

Store the answer as `TYPE` (`bug` or `feature`).

---

### Step 2: Determine Branch Number

Run:

```bash
git branch -a | grep -E "(B|F)-[0-9]+" | grep -oE "(B|F)-[0-9]+" | sort -t- -k2 -n | tail -1
```

Take the highest existing number and increment by 1. If no branches exist yet, start at 001. Zero-pad to 3 digits (e.g., `007`, `012`).

Sanitize the description from `$ARGUMENTS` into a short slug (lowercase, hyphens, max 6 words).

Branch name format:
- Bug: `B-###/slug-of-description`
- Feature: `F-###/slug-of-description`

Create and check out the branch:

```bash
git checkout -b <branch-name>
```

Confirm the branch was created and report it to the user.

---

### Step 3: Build a Plan

#### For Bugs:
Run `/preflight <bug description>` to enumerate every file that needs to change. Then write a concise fix plan:

1. **Root cause** — what is broken and why
2. **Files to change** — from the preflight manifest
3. **Fix approach** — the specific change(s) needed

#### For Features:
Run `/preflight <feature description>` to enumerate every file that needs to change. Then write a full design:

1. **Goal** — what the feature does and why
2. **Files to change** — from the preflight manifest (shared → backend → web → mobile)
3. **Data model** — any new tables, columns, or types
4. **API contract** — new endpoints (method, path, request, response)
5. **UI design** — screens/components affected, what the user sees
6. **Acceptance criteria** — bulleted list of behaviors that must be true when done

Present the plan to the user using `AskUserQuestion`:

> "Here is the plan. Does this look right, or should anything change?"

Options: "Looks good, proceed", "I have changes" (if user selects this, collect feedback and revise the plan before continuing)

---

### Step 4: Write Tests

Before writing any production code, write tests that will fail until the implementation is correct.

#### Unit tests
Use `/test <file-path>` for each service or utility being changed. Write tests that:
- Cover the happy path of the fix or new behavior
- Cover the primary error/edge case

#### Integration / E2E tests (when applicable)
If the change touches an API endpoint or spans multiple layers, add a test to `packages/api/src/__tests__/` using the integration test pattern (real DB, supertest). Reference `scoutingFlow.integration.test.ts` for the pattern.

Run the tests to confirm they fail before the implementation:

```bash
cd packages/api && npx jest --testPathPattern="<test-file>" --no-coverage
```

Report the failing output to the user. If tests unexpectedly pass before the fix, revisit the test — it may not be testing the right thing.

---

### Step 5: Implement → Test Loop

Implement the changes described in the plan (Step 3), following the file manifest from preflight.

After each implementation attempt, run the full test suite:

```bash
# Unit tests for changed package(s)
cd packages/<pkg> && npx jest --no-coverage

# Integration tests (if any were written)
npm run test:integration
```

**If tests pass**: proceed to Step 6.

**If tests fail**: diagnose the failure, update the implementation or the plan, and re-run. Repeat up to 3 times. After 3 failures, stop and present the error to the user with a diagnosis before continuing.

After tests go green, run TypeScript checks on all affected packages:

```bash
cd packages/api && npx tsc --noEmit
cd packages/web && npx tsc --noEmit
cd packages/mobile && npx tsc --noEmit
```

Fix all type errors before proceeding.

---

### Step 6: Commit and Open PR

#### Pre-commit checks (mandatory, in order):
1. **Rebuild shared** (if `packages/shared` changed): `cd packages/shared && npm run build`
2. **Prettier**: `npx prettier --write` on all changed `.ts`/`.tsx` files
3. **ESLint** (if any `packages/web/src/` files changed): `cd packages/web && npx eslint src/ --ext .ts,.tsx`
4. **TypeScript**: `npx tsc --noEmit` in each affected package

Fix any failures and re-run all checks from the top.

#### Version bump:
Increment the **minor** version in:
- `packages/web/package.json`
- `packages/mobile/package.json`
- `packages/mobile/app.json` (`expo.version` field)

#### Commit:
Stage all changed files (excluding `.claude/`, `.env`, `.expo/`, and other non-code artifacts).

Commit message format:
- Bug: `fix: <short description of what was broken>`
- Feature: `feat: <short description of what was added>`

```
<type>: <short description>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Push the branch:

```bash
git push -u origin <branch-name>
```

#### Open the PR:
PR title format:
- Bug: `[BUG]: <what the issue was>`
- Feature: `[FEATURE]: <new feature name>`

PR body template:

```markdown
## Summary

<!-- 2-4 bullet points describing what changed and why -->

## Changes

<!-- File-by-file summary of what was modified -->

## Test Plan

- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Manually verified on [web / mobile / both]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Create the PR targeting `main`:

```bash
gh pr create --base main --title "[BUG|FEATURE]: ..." --body "..."
```

Report the PR URL to the user.

---

## Notes

- Always run preflight before writing any code — it surfaces missing touchpoints before they become bugs
- Tests come before production code — a failing test that accurately describes the problem is the north star for the fix
- The loop in Step 5 is bounded to 3 attempts; on the 4th failure, pause and diagnose rather than grinding
- For features, both web and mobile must be covered unless explicitly scoped to one platform
- Branch numbers are global across bugs and features (B-007 and F-008 can coexist — they share the same counter)
