# Narrative polling for team-offense summary

- **Date:** 2026-05-10
- **Type:** feat (+ follow-up build fix)
- **Commits:** `0a6329f`, `40c85ba`
- **Versions:** web `0.94.0` → `0.96.0`, mobile `1.91.0` → `1.92.0`

## Context

The new postgame `OpponentAttackSummary` triggers a fire-and-forget Anthropic narrative on first GET, but the response returns immediately with no narrative. The frontend showed a placeholder ("Narrative still generating. Click 'Generate narrative' if it doesn't appear shortly.") and required the user to manually refresh or click the button to actually pull the cached paragraph down.

The existing pitcher Summary card already polls every 3 seconds (up to 10 attempts) until its narrative arrives. Mirroring that pattern was the right move; it was deliberately deferred at v1 ship time, then revisited.

## Decision

Add the same polling loop to `OpponentAttackSummary` (web) and `OpponentAttackSummaryView` (mobile). Reset the attempt counter when the narrative lands, when the user navigates to a different game, or when they click "Regenerate narrative."

## What shipped

### Both platforms

- `NARRATIVE_POLL_INTERVAL_MS = 3000`, `NARRATIVE_POLL_MAX_ATTEMPTS = 10`.
- `useEffect` watching `[summary, gameId]`: when `summary && !summary.narrative` and attempts < cap, schedule a refetch via `setTimeout`. Cleanup clears the timer on unmount or summary change.
- `pollAttemptsRef` reset on initial fetch and on regenerate.

### Build fix follow-up (`40c85ba`)

The constants were initially placed between import statements, breaking `eslint-plugin-import`'s `import/first` rule and the web build (`Line 7:1: Import in body of module; reorder to top`). Constants moved below all imports.

## Verification

- Open the Summary tab for a completed game with no cached narrative. Within ~3–6 seconds the placeholder should be replaced by the AI-generated paragraph (assuming `ANTHROPIC_API_KEY` is set, migration 033 is applied, and `home_team_id` is non-null on the game row).
- If the narrative never arrives after ~30 seconds (10 × 3s), polling stops. That's a real signal — usually missing API key, missing migration, or null `home_team_id`. Check the API logs for `console.error('AI team offense narrative generation failed:', err)`.
- Web `npx eslint src/components/performanceSummary/OpponentAttackSummary` clean after the import-order fix.
