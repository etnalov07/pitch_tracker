---
name: save-plan
description: Save the coding or design plan for a feature to docs/plans/ as a permanent record of architectural decisions.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(git log *), Bash(git diff *), Bash(mkdir *), Bash(ls *), Bash(date *)
argument-hint: <feature-name> [--from-plan] [--retroactive]
user-invocable: true
---

# Save Plan

Capture and persist the implementation plan for a new or changed feature into `docs/plans/`.

## When to Use

- After finishing plan mode and before (or after) implementation
- When a significant feature or refactor has been completed and the design should be recorded
- When retroactively documenting a feature that was already built

## Procedure

### Step 1: Determine the Feature Name and Source

Parse the argument to get the feature name (used for the filename).

- **`<feature-name>`**: Required. Kebab-case name for the plan file (e.g., `bullpen-mode`, `offline-queue`, `parity-fixes`).
- **`--from-plan`**: Pull content from the active plan file in `.claude/plans/` (the most recently modified `.md` file). Use this as the starting content and enhance it.
- **`--retroactive`**: No active plan exists. Reconstruct the plan by reading recent commits, changed files, and code structure.

If no flag is given, infer:
1. Check if a `.claude/plans/*.md` file was modified in this session — if so, behave like `--from-plan`.
2. Otherwise, behave like `--retroactive`.

### Step 2: Gather Context

#### If `--from-plan` (or inferred):
1. Read the active plan file from `.claude/plans/`.
2. Read the git log for the current branch to find related commits.
3. Note any deviations from the original plan (files that were changed but not in the plan, or planned changes that weren't made).

#### If `--retroactive`:
1. Ask the user which commits or date range cover the feature, or default to the last 5 commits.
2. Run `git log --oneline` and `git diff` for that range to understand what changed.
3. Read the key files that were modified to understand the architecture.
4. Reconstruct the intent, approach, and decisions from the code.

### Step 3: Write the Plan Document

Create `docs/plans/<feature-name>.md` with this structure:

```markdown
# <Feature Name>

**Date:** <YYYY-MM-DD>
**Status:** <Planned | In Progress | Completed>
**Commits:** <short SHA list or range>

## Summary

<2-3 sentence overview of what was built and why.>

## Motivation

<What problem does this solve? What triggered the work?>

## Design Decisions

<Bulleted list of key architectural choices and their rationale. Include alternatives that were considered and why they were rejected.>

## Changes

### API
<Endpoints added/modified, migration files, service changes>

### Web
<Pages, components, services added/modified>

### Mobile
<Screens, slices, API files, components added/modified>

### Shared
<Types, utilities added/modified>

## File Manifest

<Table of all files created or significantly modified>

| File | Action | Purpose |
|------|--------|---------|
| `packages/api/src/...` | Added | ... |

## Known Limitations

<What wasn't done, intentional gaps, future work>

## Testing

<How to verify the feature works — manual steps, test commands, or test files>
```

### Step 4: Update the Plan Index

Check if `docs/plans/README.md` exists. If not, create it with a table header. Append the new plan to the index table:

```markdown
# Feature Plans

| Date | Feature | Status | Plan |
|------|---------|--------|------|
| 2026-03-04 | Parity Fixes | Completed | [parity-fixes](parity-fixes.md) |
```

### Step 5: Confirm with User

Display the path to the saved plan and a brief summary of what was captured. Ask if anything should be added or corrected before committing.

## Notes

- Plans are living documents — they can be updated later if the feature evolves.
- The `Status` field should reflect the current state: `Planned` (before implementation), `In Progress`, or `Completed`.
- Keep plans concise but complete enough that a new developer could understand the feature's architecture from the plan alone.
- Do NOT duplicate the full code in the plan — reference file paths instead.
- If the feature touches the database, always include the migration file path and a summary of schema changes.
