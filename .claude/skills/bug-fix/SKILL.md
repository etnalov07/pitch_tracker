---
name: bug-fix
description: Test-driven bug fix loop. Write a failing test that reproduces the bug, fix the code, verify all tests pass, then check for related consumers that may have the same issue.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(npx jest *), Bash(npx tsc *), Bash(npx prettier *), Bash(npx eslint *), Bash(npm test *), Bash(cd packages/* && *), Bash(git grep *), Bash(git log *), AskUserQuestion
argument-hint: <bug description>
user-invocable: true
---

# Bug Fix — Test-Driven Loop

Reproduce a bug with a failing test first, then fix the code and verify everything passes.

## Invocation

`/bug-fix <bug description>`

## Procedure

### Step 1: Understand the Bug

Parse `$ARGUMENTS` for the bug description. Read any error messages, stack traces, or symptoms the user describes.

If the bug is vague, ask clarifying questions:
- Which screen or feature triggers it?
- What is the expected behavior vs what actually happens?
- Is there an error message or stack trace?

### Step 2: Locate the Source

Use Grep and Glob to find the relevant code:

1. Search for the error message string: `git grep "<error text>"`
2. Find the service/component/function involved
3. Read the file(s) to understand the current logic

### Step 3: Identify All Consumers

Before fixing, find every place the broken code is used:

```bash
git grep "<function/method/type name>" packages/
```

List all files that call or depend on the broken code. This prevents incomplete fixes where one callsite is repaired but others remain broken.

### Step 4: Write a Failing Test

Before changing any production code, write a test that reproduces the bug:

- Use `/test <file-path>` to set up test infrastructure if it doesn't exist
- Write the smallest possible test that fails in the same way the bug does
- Run it to confirm it fails: `cd packages/<pkg> && npx jest --testPathPattern="<test-file>" --no-coverage`

Report the failing test output to the user.

### Step 5: Fix the Code

Now fix the production code. Apply the fix to **all consumers** identified in Step 3 — not just the first one found.

Common patterns to check for each fix type:

| Bug type | Also check |
|----------|-----------|
| SQL JOIN error | All other queries in the same service that JOIN the same table |
| Wrong type / type cast | All other callsites that pass the same value |
| Missing import / export | All packages that import from the same module |
| State not reset | All other paths that should trigger the same reset |
| Wrong API endpoint | Both web and mobile API clients |

### Step 6: Verify the Fix

Run the test suite in a loop until passing (up to 3 attempts):

```bash
cd packages/<pkg> && npx jest --testPathPattern="<test-file>" --no-coverage
```

If tests still fail after 3 attempts, diagnose the root cause before continuing — do not blindly retry.

### Step 7: TypeScript Check

```bash
cd packages/<pkg> && npx tsc --noEmit
```

Fix any type errors introduced by the fix.

### Step 8: Report

Summarize:
- **Root cause**: What was wrong and why
- **All files changed**: Including any related consumers that had the same issue
- **Test**: Name of the test file and what scenario it covers
- **Consumers checked**: List of files searched to ensure no other callsites are broken

Then invoke the commit-push skill to stage and commit.

## Notes

- Never skip Step 3 (finding consumers) — the most common incomplete fix is patching one callsite and missing others
- If test infrastructure doesn't exist for the package, set it up using `/test` before writing the bug-reproduction test
- If the bug is purely a UI rendering issue with no testable logic, skip Steps 4–6 and go straight to the fix, but still run TypeScript checks
- For bugs that span API + web + mobile (e.g., a wrong response shape), write tests on the API side where the logic lives
