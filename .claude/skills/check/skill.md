---
name: check
description: Run quality checks (TypeScript, ESLint, tests) on only the packages that have changed. Detects shared/api/web/mobile changes and runs the right checks for each.
allowed-tools: Bash(git diff *), Bash(git status *), Bash(cd packages/shared *), Bash(cd packages/api *), Bash(cd packages/web *), Bash(cd packages/mobile *), Bash(npx tsc *), Bash(npx eslint *), Bash(npx jest *), Bash(npx prettier *)
argument-hint: [HEAD~1..HEAD | <commit-range> | --all]
user-invocable: true
---

# Check — Package Quality Gate

Run the right checks for the right packages based on what has actually changed.

## Invocation

`/check` — checks packages changed since the last commit (`HEAD~1..HEAD`)
`/check HEAD~3..HEAD` — checks packages changed in the last 3 commits
`/check --all` — runs checks on all four packages unconditionally

## Procedure

### Step 1: Detect Changed Packages

Run `git diff --name-only $ARGUMENTS` (default: `HEAD~1..HEAD`) to get the list of changed files.

Map files to packages:

| File path prefix | Package |
|-----------------|---------|
| `packages/shared/` | **shared** |
| `packages/api/` | **api** |
| `packages/web/` | **web** |
| `packages/mobile/` | **mobile** |

Also flag **shared** as changed if `packages/shared/src/` appears — every other package depends on it and needs its rebuild before TypeScript can pass.

If `--all` is passed, treat all four packages as changed.

Report which packages were detected before running any checks:

```
Detected changes in: shared, web
```

### Step 2: Rebuild Shared (if shared changed)

If **shared** is in the changed set, run first — all other packages reference its compiled output:

```bash
cd packages/shared && npm run build
```

If this fails, stop immediately and report the error. Do not proceed to other checks.

### Step 3: Run Per-Package Checks

Run checks in this order. Only run a package's checks if that package (or shared) changed.

#### shared

```bash
cd packages/shared && npx jest --no-coverage
```

#### api

```bash
cd packages/api && npx tsc --noEmit
cd packages/api && npx jest --no-coverage
```

#### web

```bash
cd packages/web && npx tsc --noEmit
cd packages/web && npx eslint src/ --ext .ts,.tsx
```

Note: The web `npm test` script is interactive (CRA watch mode). Do not run it — use `npx tsc` and `npx eslint` instead. ESLint warnings are treated as errors in CI — all warnings must be clean.

#### mobile

```bash
cd packages/mobile && npx tsc --noEmit
```

Mobile has no automated test suite yet — TypeScript is the only check.

### Step 4: Report Results

Print a summary table:

```
## Check Results

| Package | TypeScript | ESLint | Tests | Status |
|---------|-----------|--------|-------|--------|
| shared  | —         | —      | ✅ 41 passed | ✅ |
| web     | ✅ clean   | ✅ clean | —   | ✅ |
| mobile  | ✅ clean   | —      | —     | ✅ |
| api     | —         | —      | —     | — (not changed) |
```

Use ✅ for pass, ❌ for fail, — for not applicable or not changed.

If any check failed, list the errors clearly and stop. Do not proceed to commit — tell the user what needs to be fixed.

If all checks pass, report:

```
All checks passed. Safe to commit.
```

## Notes

- Always rebuild shared before checking other packages if shared changed — TypeScript in web/mobile/api will fail otherwise.
- ESLint warnings in web are treated as errors (the `lint` script uses `--max-warnings 0` behavior via the CI config). Fix all warnings, not just errors.
- If a package has no changes but depends on shared (and shared changed), still run its TypeScript check — a shared type change can break downstream consumers.
- Run all checks for all affected packages even after a failure, so the full error picture is reported at once.
