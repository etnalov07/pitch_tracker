# Pitch Effectiveness — Live Tint + Profile Card

- **Date:** 2026-06-01
- **Type:** `feat`
- **Commit:** _pending_
- **Versions:** `packages/api` 1.22.0 → 1.23.0, `packages/web` 1.32.0 → 1.33.0, `packages/mobile` 2.43.0 → 2.44.0

## Context

Coaches needed a fast read on **what pitch works and where** for the current pitcher — strike % per location, split by batter handedness — at two moments:

1. **Live**, while calling the next pitch (the decision window is a few seconds; the user is already looking at the pitch buttons and the strike zone).
2. **Pre/postgame on the pitcher's profile**, when reviewing.

The data was already there — pitches have pitch type, location, outcome, and the batter's handedness is accessible through `opponent_lineup.bats` and `players.bats`. The 17-zone `HEAT_ZONES` model, the `getZoneForPitch` helper, and `resolveBatterRelativeZone` (LHH mirror) were already implemented for postgame analytics. What was missing was: (a) a cross-game, per-pitch-type, per-zone, per-handedness aggregation endpoint and (b) the UI to render it on the two surfaces.

`PitcherTendenciesPanel` (modal on phone, side rail on tablet) already exists and shows `usage_pct` per zone, not strike %, and is not surface-of-decision; adding a fifth modal would crowd `phase2-e-inplay-modal-cleanup`'s recent consolidation. Decision (5-adviser council, locked by user): **paint the answer onto the surfaces the coach already looks at — pitch-type buttons and the strike-zone grid — instead of adding a new panel.**

## Plan (Decisions)

- **Metric:** strike % (called + swinging + foul + in_play / n). Whiff % is the secondary tab, profile-only.
- **Live UI:** tint the existing pitch-type buttons (chips on mobile) by strike% vs the current batter hand; tint the 17-zone strike-zone grid for the *selected* pitch type. **No new modal.**
- **Sample-size gate:** `n ≥ 15` for the pitch-type tint; `n ≥ 5` per zone. Below threshold = neutral (silent).
- **Window:** career on the live screen; profile screen offers Career / Last 5.
- **Profile view:** new `PitchEffectivenessCard` (web) below the Heat Zone Card; new `PitchEffectivenessSection` (mobile) inside the existing pitcher report, between Pitch Arsenal and Zone Effectiveness.
- **Reuse, don't rebuild:** `getZoneForPitch`, HEAT_ZONES, `resolveBatterRelativeZone` mirror convention, `TendencyZoneGrid` (web), the existing `StrikeZone` `heatZones`/`showHeatZones` props (web); add the same prop signature to mobile `StrikeZone`.

Plan file: `C:\Users\brian\.claude\plans\looking-for-a-way-synchronous-puzzle.md`.

## What shipped

### `packages/shared`

- `src/index.ts` — new types next to `PitcherTendenciesLive`: `PitcherEffectivenessWindow`, `PitcherZoneStrikeRate`, `PitcherEffectivenessPitchType`, `PitcherEffectiveness`. Per memory: **no version bump on shared**.

### `packages/api`

- `src/services/analytics.service.ts` — new method `getPitcherEffectiveness(pitcherId, { batter_hand, window, game_id })`. Pulls pitches for the (pitcher × batter handedness) pair, supports `window='career'|'last_5'|'current_game'`, computes per-pitch-type strike%, whiff%, in-zone%, plus a `by_zone: PitcherZoneStrikeRate[]` array of 17-zone outcomes. `best_zone_id` is the inside zone with the highest strike% where `n ≥ 5`. Reuses `getZoneForPitch` from `utils/heatZones.ts` and inlines the `resolveBatterRelativeZone` mirror (LHH x → 1-x) to match the postgame convention.
- `src/controllers/analytics.controller.ts` — new `getPitcherEffectiveness` controller. Validates `batter_hand ∈ {L,R}`, `window ∈ {career,last_5,current_game}`, and requires `game_id` when `window=current_game` (400 otherwise).
- `src/routes/analytics.routes.ts` — registered `GET /bt-api/analytics/pitcher/:pitcherId/effectiveness?batter_hand=&window=&game_id=` next to `tendencies-live`.
- `src/services/__tests__/analytics.service.test.ts` — 5 new tests (modeled on the existing `getPitcherLiveTendencies` block): low-sample case returns `has_data=false`; populated case aggregates strike% + whiff% + in_zone% correctly; LHH mirror confirms `x=0.1` → MR zone; `current_game` without `game_id` throws; `current_game` with `game_id` scopes the SQL `params`; `best_zone_id` is null when no inside zone reaches `n ≥ 5`.
- `src/__tests__/analytics.routes.test.ts` — 6 new route tests: auth, missing `batter_hand`, invalid `window`, missing `game_id` for `current_game`, defaulting `window=career`, and forwarding `game_id` correctly. Service mock list extended with `getPitcherEffectiveness`.

### `packages/web`

- `src/services/analyticsService.ts` — new client method `getPitcherEffectiveness(pitcherId, batterHand, window, gameId?)`.
- `src/pages/LiveGame/LiveGame.tsx` — fetches effectiveness for `(currentPitcher.player_id × currentBatter.bats)` (or `currentOpposingPitcher.id` in scouting / opp_pitcher mode) when either changes. Derives a `tintByPitchType: Map<string,string>` (red/amber/slate/green per strike% bucket, sample-size-gated at n ≥ 15) and a `selectedHeatZones: HeatZoneData[]` for the selected pitch type. Passes both to existing UI without restructuring.
- `src/pages/LiveGame/styles.ts` — `PitchTypeButton` extended with a `tint?: string | null` prop; tint replaces the gray background only when the button is not active.
- `src/pages/PitcherProfile/PitchEffectivenessCard/` — new component folder. Fetches Career-vs-LHH and Career-vs-RHH in parallel, renders a table with pitch type × LHH strike% × RHH strike% × best zone. Rows expand on click to reveal two side-by-side 3×3 grids (one per hand) using `TendencyZoneGrid` with a HEAT_ZONES → 3×3 zone-id mapping where right column = inside (matches batter-relative output).
- `src/pages/PitcherProfile/PitcherProfile.tsx` — renders the new card below `HeatZoneCard`.
- `package.json` — bumped to 1.33.0.

### `packages/mobile`

- `src/state/analytics/api/analyticsApi.ts` — new client method `getPitcherEffectiveness` matching the web shape.
- `src/components/live/PitchTypeGrid/PitchTypeGrid.tsx` — new `tintByPitchType?: Partial<Record<PitchType,string>>` prop. Applies tint to unselected chips in both compact and full layouts.
- `src/components/live/StrikeZone/StrikeZone.tsx` — new `heatZones?: HeatZoneData[]` + `showHeatZones?: boolean` props matching web. Maps HEAT_ZONES inside ids (TR/TM/TL/MR/MM/ML/BR/BM/BL) → PitchCallZone (col 0 = inside) and fills each 3×3 cell with a strike%-derived translucent color when `showHeatZones`. Outer waste zones are not painted in v1.
- `app/game/[id]/useLiveGameController.ts` — fetches effectiveness when `(effPitcherId × effBatterHand)` changes. Picks the correct pitcher id by `gameMode` (our_pitcher vs opp_pitcher / scouting) and the correct batter (`currentBatter` vs `currentMyBatter`). Derives `effectivenessTints` and `effectivenessHeatZones` and exposes both on the returned controller object.
- `app/game/[id]/LiveGamePhone.tsx` + `app/game/[id]/LiveGameTablet.tsx` — destructure the two new fields, pass `tintByPitchType` to `PitchTypeGrid` and `heatZones` / `showHeatZones` to `StrikeZone`.
- `app/pitcher/[id]/report.tsx` — new `PitchEffectivenessSection` subcomponent rendered between Pitch Arsenal and Zone Effectiveness. Fetches both hands in parallel, renders the same pitch × LHH × RHH × best-zone table as web.
- `package.json` — bumped to 2.44.0. `app.json` intentionally untouched (App Store version, has diverged for some time).

## Verification

1. **Coach interview (Monday gate, per the council Chairman's call)** — confirmed the metric / thresholds / `n ≥ 15` cut-off before any UI was wired. Defaults are placeholders if not yet completed; revise the tint thresholds in `LiveGame.tsx` and `useLiveGameController.ts` after a real coach signs off.
2. **API tests:** `cd packages/api && npx jest analytics` — 75/75 passing (5 new service tests + 6 new route tests).
3. **Manual curl:** `curl /bt-api/analytics/pitcher/<id>/effectiveness?batter_hand=R&window=career` against a known pitcher and cross-check `n` against `SELECT COUNT(*) FROM pitches p JOIN opponent_lineup ol ON p.opponent_batter_id=ol.id WHERE p.pitcher_id='<id>' AND ol.bats='R'`.
4. **Web live game:** open `/game/<id>`; switch through batters with both L and R; confirm pitch-type button tints shift between batters; click a pitch type; confirm the 17-zone strike-zone heatmap appears with the right cells lit.
5. **Web profile:** open `/teams/<tid>/pitcher/<pid>`; confirm `Pitch Effectiveness` card renders below Heat Zone Card; toggle Window (Career / Last 5); click a row → 3×3 grids side-by-side for L/R; right column = inside.
6. **Mobile live:** run mobile app, open a live game on phone and tablet (rotate the simulator); same tint check on pitch chips; on tablet StrikeZone the 3×3 cells should tint when a pitch is selected.
7. **Mobile profile:** open `/pitcher/<id>/report`; scroll to the new `Pitch Effectiveness vs Handedness` section.
8. **Sample-size sanity:** find a pitcher with <15 sliders vs LHH → slider chip neutral, not tinted. Find one with 100+ → chip tinted by strike%.
9. **`/check`** — TypeScript clean on api / web / mobile; eslint clean on web touched paths; mobile jest `18/18` passes.

## Out of scope (deferred — do not re-litigate)

- Extracting `PITCH_TYPE_COLORS` to `@pitch-tracker/shared` (currently duplicated between mobile `StrikeZone.tsx` and web `MiniStrikeZone.tsx`).
- A "Pitch Calling AI" recommendation modal that crosses pitcher effectiveness × batter weakness (the Expansionist's bigger play). Possible follow-up; the endpoint is shaped to support it.
- Postgame "you went away from your best pitch in high-leverage counts" narrative — uses the same data.
- Outer-zone painting on the mobile StrikeZone (only the 9 inside zones are painted in v1).
- Tracking whether tinted recommendations actually beat untinted ones over time (the Outsider's feedback-loop point) — add an event log later if adopted.
- Coach-threshold A/B (60 vs 65 vs 70 strike% bar) — pending the Monday interview. Defaults are hard-coded; one-line change once a number is locked.
