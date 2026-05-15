# Replay: include legacy pitches that pre-date `team_side`

- **Date:** 2026-05-15
- **Type:** fix
- **Commit:** `e24f7d9`
- **Versions:** mobile `2.1.0` → `2.1.1`, web `1.6.0` → `1.6.1`

## Context

After shipping the [pitch replay](2026-05-14-pitch-replay.md), the user opened it on a real game and got the empty state: "No pitches from your pitcher in this game." The filter checked `pitch.team_side === 'our_team'`, but `team_side` is a **nullable** column added later in the project's life. Pitches logged before that field existed have `team_side = NULL` and were silently excluded — even though they were our pitcher's pitches.

The API's `getPitchesByGame` already does an INNER JOIN on `players` via `pitcher_id`, so any returned pitch with a `pitcher_id` was logged by a player on our roster (opponent-pitcher pitches have `pitcher_id = NULL` and never make it past the join). That makes a `pitcher_id` presence check a safe legacy fallback.

## Decisions

- **Relax the filter to a two-arm rule** in `filterUserPitcherPitches`: keep a pitch if `team_side === 'our_team'` (modern) **or** if `team_side` is missing AND `pitcher_id` is set (legacy). Explicit `team_side === 'opponent'` still drops the pitch — only the null/undefined case falls through.
- **No schema change.** Backfilling `team_side` on historic rows would also work, but the client-side fix is reversible and ships immediately.
- **Test the legacy path** in `replayBuilder.test.ts`.

## What shipped

- `packages/shared/src/utils/replayBuilder.ts` — updated `filterUserPitcherPitches` with the two-arm rule and a comment explaining why `pitcher_id` alone is a safe legacy signal.
- `packages/shared/src/utils/__tests__/replayBuilder.test.ts` — new case covering the legacy data path (modern our_team kept, legacy null+pitcher_id kept, null+no-pitcher_id dropped, explicit opponent dropped). Total replay tests: 7.
- `packages/mobile/package.json`: 2.1.0 → 2.1.1
- `packages/web/package.json`: 1.6.0 → 1.6.1

No mobile/web screen changes — both already call into the shared helper.

## Verification

1. `cd packages/shared && npm test` — 158 tests pass, including the new legacy-fallback case.
2. Open a finished game with pitches logged before the `team_side` column existed → tap **Replay Game** (mobile) or **▶ Replay** (web). Expect the batter strip + scrubber to populate as expected.
3. Open a finished game where the user only charted as `opp_pitcher` (we batted, opponent pitched). Expect the empty state to still show — those pitches have `pitcher_id = NULL` and are excluded by the API's INNER JOIN before they ever reach the client filter.

## Out of scope (deferred)

- Backfilling `team_side` on historic pitch rows. The client fallback covers the symptom and avoids a migration round-trip.
