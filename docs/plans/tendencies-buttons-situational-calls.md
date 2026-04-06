# Tendencies Buttons & Situational Call Types

**Date:** 2026-04-05
**Status:** Planned
**Commits:** TBD

---

## Summary

Add two "tendencies" buttons to the live game screen (web + mobile) that surface real-time pitcher and hitter tendency data — pitch type distribution, zone preference, and effectiveness splits by batter handedness — and generate a suggested pitch sequence for the current at-bat. Alongside this, extend the pitch call system with four new situational call types: Pickoff, Bunt Coverage, 1st & 3rd Coverage, and Shake.

---

## Motivation

Coaches currently have to leave the live game screen or rely on memory to recall how a pitcher attacks left-handed vs. right-handed hitters, or where a batter has historically been weak. The tendencies buttons surface this data in-context, inline with the at-bat in progress. The situational call types fill a gap in the pitch calling workflow — pickoffs and defensive coverages are part of real game management but have no record in the system today. The "shake" call type lets coaches track how often the catcher signals the pitcher to shake off (fake a sign change as a deception tactic).

---

## Design Decisions

- **Live endpoint, not a pre-computed report**: Tendencies are computed fresh per request against pitch history so they reflect the most recent data. Results are lightweight enough (< 50 pitches typical sample) that caching is not required at launch.
- **Handedness split is mandatory for pitcher tendencies**: A pitcher's approach against LHH vs. RHH is fundamentally different; the endpoint always accepts `batter_hand=L|R` and returns split-specific data.
- **Suggested sequence is heuristic, not ML**: The sequence suggestion is rule-based (lead with highest-effectiveness pitch for count, follow with best "chaser" off that, finish with best put-away). This is fast to implement and transparent to coaches. ML can replace it later.
- **Situational calls are a separate type from pitch calls**: Pickoffs, coverages, and shakes do not have `pitch_type` or `zone` — they are recorded as `PitchCallCategory = 'situational'` alongside the existing `'pitch'` category. This avoids polluting pitch analytics with non-pitch events.
- **Shake is a flag on a pitch call, not a separate call**: The catcher's shake signal is a modifier to the active call — "we want the pitcher to visibly shake off before throwing this." It increments a `shake_count` counter on the game record and can be noted on the individual pitch call.
- **Both web and mobile get full feature parity** per project convention.

---

## Feature 1: Pitcher Tendencies Button

### What it shows

A modal/side panel triggered from the live game header, contextual to the **current pitcher** and **current batter's handedness**.

**Sections:**
1. **Pitch Mix vs. [L/R]HH** — horizontal bar chart of pitch type usage % (e.g., FB 58%, SL 22%, CH 20%)
2. **Zone Tendencies vs. [L/R]HH** — 3×3 heat grid showing where this pitcher most frequently attacks
3. **Effectiveness by Pitch Type** — table: pitch type | count | strike % | whiff % | avg velo
4. **Suggested Sequence** — ordered list of 3 pitches for the current count (e.g., "1. FB up & in → 2. SL low & away → 3. CH low & away")

### Sequence suggestion algorithm

```
Given: pitcher history vs. batter hand, current count (balls-strikes)

1. "Setup pitch": highest strike% pitch for this pitcher vs. this hand
2. "Chase pitch": pitch with highest whiff% when thrown after setup pitch (off-speed off fastball, etc.)
3. "Put-away pitch": pitch with highest K-rate on 2-strike counts vs. this hand
```

If insufficient data (< 10 pitches vs. this hand), fall back to overall history. If overall < 10 pitches, show "Insufficient data" banner.

---

## Feature 2: Hitter Tendencies Button

### What it shows

A modal/side panel triggered from the live game header, contextual to the **current batter**.

Works for both team batters (tracked via `batter_id`) and opponent batters (tracked via `opponent_batter_id` / scouting profile).

**Sections:**
1. **Zone Weakness Map** — 3×3 heat grid with swing rate and contact rate overlaid per zone; highlight zones where batter swings and misses most
2. **Pitch Type Vulnerability** — table: pitch type | times seen | swing % | whiff % | BA (if tracked)
3. **Count Tendencies** — early count: does batter swing early? Two-strike: chase rate out of zone?
4. **Suggested Attack Sequence** — ordered list of 3 pitches targeting weakest zones

### Data sources

- **Opponent batters**: `GET /analytics/opponent-batter/:batterId/scouting` (already has `zone_tendencies` JSONB and `breaking_chase_rate`)
- **Team batters** (our own players, e.g., in practice/scrimmage): `GET /analytics/batter/:batterId/history` augmented with zone breakdown
- Both paths return the same `HitterTendenciesLive` response shape so the UI is identical

---

## Feature 3: Situational Call Types

### New call categories

| Type | Abbrev | Description |
|------|--------|-------------|
| `pickoff` | PO | Pickoff throw to a base |
| `bunt_coverage` | BNT | Defensive bunt coverage scheme |
| `1st_3rd_coverage` | 1&3 | 1st & 3rd defensive coverage play |
| `shake` | SHK | Catcher signals pitcher to visibly shake off (deception) |

### Behavioral differences from pitch calls

- **No `zone` required** — situational calls don't target a strike zone location
- **No `pitch_type` required** — these are defensive/tactical calls
- **Shake** additionally increments `shake_count` on the active game record
- **Pickoffs** optionally record `base` (1B, 2B, 3B) as metadata
- None of these appear in pitch analytics (strike %, velocity, etc.)
- All appear in game call history and game summary

---

## Changes

### Shared (`packages/shared`)

- **`PitchCallCategory`** (new type): `'pitch' | 'situational'`
- **`SituationalCallType`** (new type): `'pickoff' | 'bunt_coverage' | '1st_3rd_coverage' | 'shake'`
- **`PitchCall` interface**: add `category: PitchCallCategory`, `situational_type?: SituationalCallType`, `pickoff_base?: '1B' | '2B' | '3B'`
- **`PitcherTendenciesLive`** (new interface): pitch mix, zone grid, effectiveness table, suggested sequence
- **`HitterTendenciesLive`** (new interface): zone weakness map, pitch type vulnerability, suggested attack sequence
- **`SuggestedPitch`** (new interface): `{ pitch_type, zone, rationale: string }`
- **`Game` interface**: add `shake_count: number`

### API (`packages/api`)

**Migration**: `008_tendencies_situational_calls.sql`
- Add `category VARCHAR(20) DEFAULT 'pitch'` to `pitch_calls`
- Add `situational_type VARCHAR(30)` to `pitch_calls`
- Add `pickoff_base VARCHAR(5)` to `pitch_calls`
- Add `shake_count INTEGER DEFAULT 0` to `games`

**New analytics endpoints**:
- `GET /bt-api/analytics/pitcher/:pitcherId/tendencies-live?batter_hand=L|R` — pitcher live tendencies
- `GET /bt-api/analytics/hitter/:batterId/tendencies-live?batter_type=team|opponent` — hitter live tendencies

**Updated pitch calls service** (`pitch.service.ts` / `pitch-call.service.ts`):
- Accept `category` and `situational_type` when creating a pitch call
- When `situational_type === 'shake'`: `UPDATE games SET shake_count = shake_count + 1`

**New analytics service methods**:
- `getPitcherLiveTendencies(pitcherId, batterHand)` — query pitcher pitch history, compute mix/zones/effectiveness, generate sequence
- `getHitterLiveTendencies(batterId, batterType)` — query batter pitch history or scouting profile, compute weakness map, generate attack sequence

### Web (`packages/web`)

**New components** (in `src/components/live/`):
- `TendenciesButton/` — reusable toggle button (used for both pitcher + hitter)
- `PitcherTendenciesPanel/` — modal/drawer showing pitcher tendency data
- `HitterTendenciesPanel/` — modal/drawer showing hitter tendency data
- `TendencyZoneGrid/` — 3×3 grid component with heat overlay (reusable between both panels)
- `SuggestedSequence/` — ordered pitch sequence with rationale text

**Updated components**:
- `LiveGame.tsx` — add two tendency buttons near the pitcher/batter display in the game header area; wire up modals
- `useLiveGameState.ts` — add `showPitcherTendencies`, `showHitterTendencies` booleans
- `useLiveGameActions.ts` — add toggle actions for both panels

**New service methods** (`services/analyticsService.ts`):
- `getPitcherLiveTendencies(pitcherId, batterHand)`
- `getHitterLiveTendencies(batterId, batterType)`

**Updated pitch call UI** (`PitchCallModal/` or equivalent):
- Add situational call row below pitch type grid: `[PO] [BNT] [1&3] [SHK]`
- These buttons skip zone selection and submit immediately
- Shake button shows running `shake_count` badge on the game header

### Mobile (`packages/mobile`)

**New components** (in `src/components/live/`):
- `TendenciesButtons` — row of two buttons rendered below pitcher/batter header in live game
- `PitcherTendenciesModal` — bottom sheet with pitcher tendency data
- `HitterTendenciesModal` — bottom sheet with hitter tendency data
- `TendencyZoneGrid` — 3×3 grid with heat overlay (React Native Paper `Surface`)
- `SuggestedSequence` — ordered list component

**Updated screens/components**:
- `app/game/[id]/live.tsx` — render `TendenciesButtons` component; wire up modals
- `src/components/pitchCalling/CallPitchTypeGrid/CallPitchTypeGrid.tsx` — add situational call row (`PO`, `BNT`, `1&3`, `SHK`)
- `CallPitchTypeGrid` situational buttons bypass zone selection and call API directly

**New state** (`src/state/analytics/`):
- `analyticsSlice.ts` — `pitcherTendencies`, `hitterTendencies`, loading states
- `api/analyticsApi.ts` — `fetchPitcherLiveTendencies`, `fetchHitterLiveTendencies` thunks

---

## File Manifest

| File | Action | Purpose |
|------|--------|---------|
| `packages/shared/src/index.ts` | Modified | Add new types: `PitchCallCategory`, `SituationalCallType`, `PitcherTendenciesLive`, `HitterTendenciesLive`, `SuggestedPitch`; extend `PitchCall` and `Game` |
| `packages/api/src/migrations/008_tendencies_situational_calls.sql` | Added | Schema: `category`, `situational_type`, `pickoff_base` on pitch_calls; `shake_count` on games |
| `packages/api/src/services/analytics.service.ts` | Modified | Add `getPitcherLiveTendencies()`, `getHitterLiveTendencies()` |
| `packages/api/src/controllers/analytics.controller.ts` | Modified | Add two new controller methods |
| `packages/api/src/routes/analytics.routes.ts` | Modified | Register two new GET endpoints |
| `packages/api/src/services/pitch-call.service.ts` | Modified | Handle `category`/`situational_type`; increment `shake_count` on game |
| `packages/web/src/components/live/TendenciesButton/` | Added | Reusable tendency toggle button |
| `packages/web/src/components/live/PitcherTendenciesPanel/` | Added | Pitcher tendencies modal |
| `packages/web/src/components/live/HitterTendenciesPanel/` | Added | Hitter tendencies modal |
| `packages/web/src/components/live/TendencyZoneGrid/` | Added | 3×3 heat zone grid (shared by both panels) |
| `packages/web/src/components/live/SuggestedSequence/` | Added | Ordered pitch sequence component |
| `packages/web/src/pages/LiveGame/LiveGame.tsx` | Modified | Add tendency buttons + modals |
| `packages/web/src/pages/LiveGame/useLiveGameState.ts` | Modified | Add panel visibility state |
| `packages/web/src/pages/LiveGame/useLiveGameActions.ts` | Modified | Add toggle actions |
| `packages/web/src/services/analyticsService.ts` | Modified | Add two new fetcher functions |
| `packages/web/src/components/pitchCalling/CallPitchTypeGrid/` | Modified | Add situational call row |
| `packages/mobile/app/game/[id]/live.tsx` | Modified | Add `TendenciesButtons` + modal wiring |
| `packages/mobile/src/components/live/TendenciesButtons.tsx` | Added | Two-button row component |
| `packages/mobile/src/components/live/PitcherTendenciesModal.tsx` | Added | Bottom sheet for pitcher tendencies |
| `packages/mobile/src/components/live/HitterTendenciesModal.tsx` | Added | Bottom sheet for hitter tendencies |
| `packages/mobile/src/components/live/TendencyZoneGrid.tsx` | Added | 3×3 heat zone grid (RN Paper) |
| `packages/mobile/src/components/live/SuggestedSequence.tsx` | Added | Ordered pitch sequence (RN) |
| `packages/mobile/src/components/pitchCalling/CallPitchTypeGrid/CallPitchTypeGrid.tsx` | Modified | Add situational call type row |
| `packages/mobile/src/state/analytics/analyticsSlice.ts` | Added | Tendencies state slice |
| `packages/mobile/src/state/analytics/api/analyticsApi.ts` | Added | Fetch thunks |
| `packages/mobile/src/state/store.ts` | Modified | Register analytics reducer |
| `packages/mobile/src/state/index.ts` | Modified | Barrel export new thunks |

---

## Known Limitations

- Suggested pitch sequence is heuristic/rule-based at launch — not machine learning. Effectiveness will improve as pitch data volume grows.
- Pitcher tendencies vs. LHH only appear after ≥ 10 pitches to that handedness are logged. Small sample sizes show a "Insufficient data" message.
- Opponent batter hitter tendencies rely on the scouting profile, which is only populated if pitches have been logged against that batter in prior games in this system. New opponents will have no data.
- `shake_count` is a game-level counter only — individual pitch-level shake attribution (which pitch was "shaken") is not tracked in v1.
- Pickoff outcomes (safe/out) are not tracked in v1.

---

## Testing

**Manual verification — Pitcher Tendencies:**
1. Start a live game with a pitcher who has ≥ 10 prior pitches logged
2. Tap/click "Pitcher Tendencies" button — panel opens
3. Toggle batter handedness (L/R) — stats update accordingly
4. Verify pitch mix bars sum to 100%
5. Verify suggested sequence contains 3 pitches with rationale text
6. With a new pitcher (no history) — verify "Insufficient data" banner

**Manual verification — Hitter Tendencies:**
1. Start a live game against a batter with logged history or a scouting profile
2. Tap/click "Hitter Tendencies" button — panel opens
3. Verify zone grid highlights weak zones (high swing%, low contact%)
4. Verify suggested attack sequence targets those zones
5. With a new batter (no data) — verify "Insufficient data" banner

**Manual verification — Situational Calls:**
1. In pitch calling mode (mobile), verify 4 new situational buttons appear below pitch type grid
2. Tap `PO` (Pickoff) — verify call is created with `category: 'situational'`, `situational_type: 'pickoff'`
3. Tap `SHK` (Shake) — verify `shake_count` increments on game, displayed in game header
4. Verify situational calls appear in game call history
5. Verify situational calls do NOT appear in pitch analytics (strike %, velocity charts)

**API:**
```bash
# Pitcher tendencies
GET /bt-api/analytics/pitcher/:pitcherId/tendencies-live?batter_hand=R

# Hitter tendencies
GET /bt-api/analytics/hitter/:batterId/tendencies-live?batter_type=opponent

# Create a pickoff call
POST /bt-api/pitch-calls
{ "category": "situational", "situational_type": "pickoff", "pickoff_base": "1B", "game_id": "...", "pitcher_id": "..." }
```
