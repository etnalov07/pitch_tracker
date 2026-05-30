# Scrimmage Mode Follow-ups · 2026-05-30

**Type:** `feat`
**Commit:** _pending_
**Versions:** `shared@1.0.0 (unchanged)` · `api@unchanged` · `web@1.30.0 → 1.31.0` · `mobile@2.41.0 → 2.42.0`

## Context

After the first real scrimmage with the [`2026-05-25 Scrimmage Game Mode`](2026-05-25-scrimmage-mode.md) feature (5 days in), two rough edges surfaced for today's "5 batters per inning" scrimmage:

1. The `GameHeader` outs widget is a 3-dot strip — when outs exceed 3 in a scrimmage half (because the 3-out auto-end is suppressed), all three dots stay lit and the coach can't tell whether they're on out #4, #5, etc.
2. The New Game form still asks for **Innings: 5/6/7/9** in scrimmage mode, even though `handleEndHalfScrimmage` bypasses `advanceInningWithRuns`/`endGame` entirely — the field is misleading because no inning cap is actually enforced.

Neither was a logic bug — the underlying scrimmage behavior already supports unlimited outs per half and unlimited innings (game ends only via the **End Game** button). Pure display/setup polish so the UI matches the rules.

## Plan (Decisions)

- **Outs > 3 → render the literal number** (mobile + web). Keep the existing dot indicators for outs 0–3 (familiar baseball UX); switch to a yellow numeric badge once outs cross 3. Threshold `> 3` (not `>= 3`) so the 3-dot widget still fills as expected for normal play, and the digit only appears in scrimmage scenarios where things actually exceed 3.
- **Hide the Innings picker when `chartingMode === 'scrimmage'`** (mobile new-game screen + web GameSetup). Total_innings still defaults under the hood (7 / 9 by team_type) so `createGame` payload stays valid — the field just isn't surfaced because nothing reads it for scrimmages.
- **No backend / shared changes.** All four edits are pure UI; the scrimmage spec hasn't changed.
- **No `batters_per_inning` auto-flip setting** (explicitly out of scope for today — coach taps **End Half Inning** manually after batter #5).

## What shipped

### packages/shared (no version bump — pinned at 1.0.0)

- No changes.

### packages/api (unchanged)

- No changes.

### packages/mobile (v2.42.0)

- `src/components/live/GameHeader/GameHeader.tsx`:
    - Replaced the hardcoded 3-dot outs strip with a conditional: `outs > 3` renders a yellow numeric badge (`styles.outNumber`) inside the same `countItem` cell; `outs <= 3` keeps the existing 3 dots.
    - Added `outNumber` StyleSheet entry (yellow[400], bold, fontSize 14, marginLeft 2 to match dot spacing).
- `app/game/new.tsx`:
    - Wrapped the **Innings** label + `SegmentedButtons` in `{!isScrimmageMode && (...)}`. Updated the section comment to explain why.
- `package.json`: bumped to `2.42.0`.

### packages/web (v1.31.0)

- `src/pages/LiveGame/styles.ts`:
    - Added `OutsNumber` styled span (yellow[400], bold, fontSize.base, marginLeft xs).
- `src/pages/LiveGame/LiveGame.tsx`:
    - Imported `OutsNumber` from `./styles`.
    - In the inning/outs panel: when `currentOuts > 3`, render `<OutsNumber>{currentOuts}</OutsNumber>` in place of the two `<OutIndicator>` dots. Below threshold, keep the existing two-dot widget.
- `src/pages/GameSetup/GameSetup.tsx`:
    - Wrapped the **Innings** `FormGroup` in `{!isScrimmageMode && (...)}`. Updated the section comment.
- `package.json`: bumped to `1.31.0`.

### docs/changes

- This doc + table row in `docs/changes/README.md`.

## Verification

1. **Prettier**: `npx prettier --write` on the 5 touched files — clean.
2. **TypeScript**: `npx tsc --noEmit` in `packages/web` and `packages/mobile` — clean.
3. **Web ESLint**: `npx eslint` on the three changed web files — clean.
4. **Mobile Jest**: `npm test` — 18/18 pass.
5. **End-to-end (mobile)**:
    - Create a new game → tap **Scrim** → confirm the **Innings** picker disappears (Lineup Size still visible above; Charting Mode segmented control below).
    - Switch back to **Our P** → Innings picker reappears.
    - Submit a scrimmage → log a half-inning with 5 outs (e.g., 2 strikeouts + 3 baserunner caught-stealing events). At outs 0–3 the dot widget fills as usual; at out 4 the dots are replaced by the yellow digit `4`; out 5 → `5`. Tap **End Half Inning** → outs reset to 0, dots return.
6. **End-to-end (web)**: same flow on `/games/new`. `currentOuts > 3` renders `<OutsNumber>` in place of the two dots in the inning panel.
7. **Regression**: open an existing `our_pitcher` game; outs widget still renders the dot strip on both platforms, Innings picker still present in setup.

## Out of scope (deferred)

- Configurable **Batters per inning** field with auto-end-half after N completed at-bats. Coach handles this manually via **End Half Inning** for now.
- Visually distinguishing scrimmage games in the games list / postgame report.
- Bumping `packages/shared` (intentionally pinned at 1.0.0 per memory).
- Web `OutIndicator` strip is only 2 dots (pre-existing) — left as-is; the numeric fallback covers the only scenario where it matters (scrimmage).
