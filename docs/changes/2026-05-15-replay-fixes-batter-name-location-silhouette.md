# Replay: opp batter name lookup, string-numeric location dot, polished silhouette

- **Date:** 2026-05-15
- **Type:** fix
- **Commit:** `5d6d67c`
- **Versions:** mobile `2.2.0` → `2.2.1`, web `1.7.0` → `1.7.1`

## Context

User feedback after the [silhouette/names follow-up](2026-05-15-replay-silhouette-and-names.md) — three issues visible in the same screenshot:

1. **Batter name fell back to "Batter"** in both the AB chip and the header. Root cause: opp batters don't have a `players` row — they live in `opponent_lineup` keyed by `opponent_batter_id`. The pitch service's `LEFT JOIN players b ON p.batter_id = b.id` always misses for opp batters, so `batter_first_name` / `batter_last_name` come back null.
2. **Pitch dot still not rendering on the strike zone** despite a real `pitch_type` and pitch result. Root cause: `pitches.location_x / location_y` are PostgreSQL `numeric(5,4)` columns; node-postgres returns those as strings (e.g. `"0.5000"`), and the web `MiniStrikeZone`'s `typeof === 'number'` check rejected them.
3. **Web silhouette was a stick figure**, not the polished batter art used in the live charting view.

## Decisions

### Name lookup belongs in the builder (#1)

Added an optional `ReplayLookups` parameter to `buildReplaySequence` carrying `batterNameByOpponentId` + `pitcherNameByPlayerId` maps. `pickBatterName` consults the map first when `pitch.opponent_batter_id` is set, falls through to the joined `batter_first_name` / `batter_last_name` for our-team batters, and finally to `"Batter"`. Same shape for `pickPitcherName`. Both screens build the maps from the data they already fetch (`gamesApi.getOpponentLineup` + `gamesApi.getGamePitchers`) and pass them in.

No API change — server-side fixes (a second JOIN on `opponent_lineup`) would also work but client-side keeps this fix narrow.

### Coerce string-numerics at the boundary (#2)

`MiniStrikeZone` now accepts `actualX` / `actualY` as `number | string | null` and runs them through a small `toFiniteNumber` helper before the `typeof` check. The mobile screen does the same coercion when it constructs the pitch passed to `StrikeZone`, so even though mobile's existing `=== undefined` check tolerated strings via JS arithmetic coercion, a `null` value (which evaluates to 0 → top-left corner) is now handled cleanly too.

Worth surfacing this for future readers: PostgreSQL `numeric` columns always come back as strings from `pg`. Anything new touching `pitches.location_x/y`, `velocity`, `target_location_x/y`, etc. should expect strings.

### Port the polygon silhouette (#3)

`packages/web/src/pages/Replay/BatterSilhouette.tsx` is a mechanical port of `packages/mobile/src/components/live/StrikeZone/BatterSilhouette.tsx` — identical polygon point arrays with React-Native-SVG tags lowercased to standard SVG (`<G>` → `<g>`, `<Polygon>` → `<polygon>`, `<Path>` → `<path>`). `MiniStrikeZone` applies the same `translate(batterX, 40) scale(±1.61, 1.61) translate(-36, 0)` transform used in the live view's `StrikeZone`, so the visual matches.

(Did not extract the silhouette into a shared package. The asset is a static SVG and the JSX-tag-name difference between RN and web makes a true shared module awkward without an SVG-asset pipeline — a copy here is the lowest-friction option for one consumer.)

## What shipped

### Shared

- `packages/shared/src/utils/replayBuilder.ts` — new `ReplayLookups` interface, third optional arg on `buildReplaySequence`, `pickBatterName` / `pickPitcherName` consult the map first.
- `packages/shared/src/index.ts` — exports `ReplayLookups` type.
- `packages/shared/src/utils/__tests__/replayBuilder.test.ts` — new case for the lookup-map path (8 tests total).

### Mobile

- `packages/mobile/app/game/[id]/replay.tsx` — builds `ReplayLookups` from `opponentLineup` + `gamePitchers`, threads into `buildReplaySequence`. Coerces `location_x` / `location_y` to numbers when constructing the pitch for `StrikeZone`.

### Web

- `packages/web/src/pages/Replay/BatterSilhouette.tsx` — new file, polygon-based silhouette ported from mobile.
- `packages/web/src/pages/Replay/MiniStrikeZone.tsx` — uses `BatterSilhouette` with the same translate/scale as the live `StrikeZone`. `actualX` / `actualY` accept `number | string | null`; `toFiniteNumber` normalizes both before the dot's `hasActual` check.
- `packages/web/src/pages/Replay/Replay.tsx` — same lookup-map plumbing as mobile.

### Versions

- `packages/mobile/package.json`: 2.2.0 → 2.2.1
- `packages/web/package.json`: 1.7.0 → 1.7.1

## Verification

1. `cd packages/shared && npm test` — 159 tests; new case validates the opp-batter lookup map.
2. **Web**: open replay on an opp-batter game → header shows real batter names (chips too); strike zone shows the polished batter silhouette on the correct side; the actual-pitch dot renders color-coded by pitch type with the 2-letter abbrev inside.
3. **Mobile**: same end-to-end. The dot was rendering via JS coercion already in most cases, but the new `toNum` guarantees it renders for `null` and string-numeric values uniformly.
4. **Edge cases**: opp-batter row missing from the lineup (falls through to joined fields → "Batter"); pitcher missing from `gamePitchers` (joined `pitcher_first_name` still wins; falls through to "Pitcher" only if both miss); a pitch genuinely missing `location_x` (the "(pitch location not recorded)" hint appears under the zone).

## Out of scope (deferred)

- Server-side JOIN on `opponent_lineup` for batter names. Cleaner long-term but requires API release; the client lookup map is sufficient and reuses already-fetched data.
- Catcher silhouette behind the plate.
- Sharing `BatterSilhouette` between mobile and web via a single SVG asset (would need an asset pipeline; copy is fine for one consumer).
