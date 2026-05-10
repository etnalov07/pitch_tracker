# CLAUDE.md — codify change doc convention

- **Date:** 2026-05-10
- **Type:** docs
- **Commit:** _(pending)_
- **Versions:** none (docs only)

## Context

User established a new workflow rule: every feature and bug fix gets a planning + change doc in `docs/`. Saved to memory and backfilled the recent session's commits into a new `docs/changes/` folder. The convention then needed to be encoded in `CLAUDE.md` so it survives across agents and sessions, not just my private memory.

## Decisions

- Add a new top-level **Change Documentation** section between the Implementation Checklist and Common Pitfalls. Section is the place future contributors will look, so it has to spell out:
    - Location pattern (`docs/changes/<date>-<slug>.md`).
    - Distinction from `docs/plans/` (forward-design vs. post-ship record).
    - Required sections for each doc.
    - Rule for bundling follow-up commits into the same doc instead of fragmenting.
- Add a checklist item to the existing Implementation Checklist so the change doc shows up in definition-of-done alongside the parity check and pre-commit checks.

## What shipped

- `CLAUDE.md`
    - New checklist item: "Change doc written under `docs/changes/` (see Change Documentation below)".
    - New "Change Documentation" section detailing location, distinction from `docs/plans/`, required sections, and bundling rule.

## Verification

Read CLAUDE.md top-to-bottom — both the checklist item and the new section render correctly and reference each other.
