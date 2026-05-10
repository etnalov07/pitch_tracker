# Heat-zone label orientation + batter-relative attack heatmap

- **Date:** 2026-05-10
- **Type:** fix
- **Commit:** `c515dce`
- **Versions:** web `0.93.0` → `0.94.0`, mobile `1.90.0` → `1.91.0`

## Context

User asked whether the `TL`/`TR` cells in the new postgame attack heatmap meant "Top Left / Top Right" and whether they were batter-oriented. Investigation surfaced **two** real problems:

### 1. Y-axis convention mismatch (pre-existing bug)

`packages/api/src/utils/heatZones.ts` defined `TL` as `yMin: 0.67, yMax: 1.0` and `BL` as `yMin: 0, yMax: 0.33`. But pitches are captured with the **opposite** y convention:

- `StrikeZone.tsx` derives y from SVG coords: `zoneY = (svgY - ZONE_Y) / ZONE_HEIGHT`. SVG y increases downward, so a tap at the top of the zone stores `location_y ≈ 0`; a tap at the bottom stores `location_y ≈ 1`.
- `PITCH_CALL_ZONE_COORDS['0-0']` ("Up and In") = y 0.167 confirms it: y near 0 means high in the zone.

So the cell labeled `TL` was actually receiving **bottom-left** pitches, and `BL` got top-left pitches. `HeatZoneOverlay` (which draws zone overlays in the live charting view) compensated for this with a `(1 - y)` flip in its render math, with the net effect that overlay rectangles ended up displayed at the **wrong vertical position** relative to where pitches were actually charted.

Existing analytics/scouting consumers used the same buggy `HEAT_ZONES`, which is why nobody had caught it — the data was internally consistent, just labeled and rendered upside-down.

### 2. Attack heatmap was not batter-relative

The new postgame heatmap aggregated raw absolute coordinates — mixing RHH and LHH at-bats meant the same cell on the right side held "inside to RHH" and "outside to LHH" pitches, blurring the inside/away signal.

## Decisions

1. **Flip the y-bands in `heatZones.ts`** to match the captured convention (y=0 = top). Internal data flow unchanged: pitches are bucketed correctly by the new ranges, and `HeatZoneOverlay`'s render math (which used the math-y convention plus a `(1-y)` flip) now lines up correctly without further changes.
2. **Mirror x for LHH at-bats** in the postgame attack-zone aggregation only. Switch hitters treated as RHH for v1 (TODO: derive from opposing pitcher's throws). The pitcher per-zone outcome view stays in absolute coords — that's about _where the pitch went_.
3. **Replace cryptic cell labels with directional axes**: column headers `Away · Mid · In`, row labels `High · Mid · Low`, cells just show counts.

## What shipped

### API

- `packages/api/src/utils/heatZones.ts` — y-bands of all 17 zones flipped (inside 9 + outer ring 8). `HEAT_ZONES.find((z) => z.id === 'TL')` now correctly maps to `yMin 0, yMax 0.33`.
- `packages/api/src/utils/__tests__/heatZones.test.ts` — corner expectations flipped:
    - `getZoneForPitch(0.1, 0.1)` → `'TL'` (was `'BL'`).
    - `getZoneForPitch(0.5, -0.1)` → `'OT'` (above the zone is now y < 0).
    - `getZoneForPitch(-0.1, -0.1)` → `'OTL'` (was `'OBL'`).
- `services/performanceSummary.service.ts` — new `resolveBatterRelativeZone(row)` helper mirrors `x → 1 - x` for `bats === 'L'`. Used inside `getOpponentAttackSummary`. Pitcher's `computeZoneOutcomes` continues to use absolute `resolveZone`.

### Web

- `OpponentAttackSummary` component: new `HeatmapWrap`, `HeatmapColLabel`, `HeatmapRowLabel`, `HeatmapCaption` styled components. Cells render counts only; axis labels rendered around the grid; caption: "Right column = inside to the hitter (LHH at-bats are mirrored)."

### Mobile

- `OpponentAttackSummaryView` mirrors the layout via React Native styles (`gridHeaderRow`, `gridDataRow`, `gridRowLabel`, `gridAxisLabel`, `gridCaption`).

## What this means for other consumers

- `HeatZoneOverlay` (web live-charting overlay) — visually corrected automatically. Top pitches now render at the visual top.
- `analytics.service.ts` `getBatterPitchHeatMap` — bucket counts shift names (what was BL is now TL etc.) but downstream `BatterHeatMapView` receives the same shape with corrected labels.
- `scouting.service.ts` — uses the `isInside` flag and `zoneId` as a bucket key, both unaffected by the y-band flip semantically.

## Verification

- All 490 API tests pass after the test update.
- Live charting with `HeatZoneOverlay` toggled on: top pitches render at top of strike zone (was at bottom).
- Postgame Summary tab: attack heatmap right column always = inside to hitter regardless of LHH/RHH mix; caption explains the mirroring.
