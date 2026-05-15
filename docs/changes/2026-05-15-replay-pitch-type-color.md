# Replay: color the actual-location dot by pitch type

- **Date:** 2026-05-15
- **Type:** fix
- **Commit:** _backfill on commit_
- **Versions:** mobile `2.1.1` → `2.1.2`, web `1.6.1` → `1.6.2`

## Context

User feedback after trying the replay: "The target looks plotted on the strike zone, just not the pitch and pitch type (this can be color coded)." The actual-location dot was technically rendering, but it was colored by `pitch_result` (e.g., grey for ball, green for called strike) and centered very close to the dashed amber target marker — visually it blended in and didn't communicate which pitch type was thrown.

## Decisions

- **Switch the dot's color encoding to pitch type.** Mobile already has `colorBy="pitchType"` on `StrikeZone` (used by other read-only views) which paints the dot with the type color and stamps a 2-letter abbreviation (`FB`, `SL`, `CB`, …) inside it. Just flip the prop in the replay screen.
- **Mirror that on web.** `MiniStrikeZone` was painting by result and had no label. Ported the mobile `PITCH_TYPE_COLORS` and `PITCH_TYPE_ABBREV` maps so the visual encoding matches across platforms; bumped the radius from 11 → 13 to match mobile's `PITCH_RADIUS` and added the abbrev `<text>` inside the circle.
- **Surface a "(pitch location not recorded)" hint** under the strike zone when the current pitch's `location_x` / `location_y` is null. Some legacy pitches may have target-only data; the user should know why no dot rendered rather than wondering if it's a UI bug.

## What shipped

- `packages/mobile/app/game/[id]/replay.tsx` — `colorBy="pitchType"`, hint text when location is missing.
- `packages/web/src/pages/Replay/MiniStrikeZone.tsx` — `pitchResult` prop replaced by `pitchType`; ported `PITCH_TYPE_COLORS` + `PITCH_TYPE_ABBREV` from the mobile `StrikeZone`; radius bumped to 13; abbrev text rendered inside the dot.
- `packages/web/src/pages/Replay/Replay.tsx` — passes `pitchType` instead of `pitchResult`; same "(pitch location not recorded)" hint under the strike zone.
- `packages/mobile/package.json`: 2.1.1 → 2.1.2
- `packages/web/package.json`: 1.6.1 → 1.6.2

## Verification

1. Open replay on a finished game with our pitcher → scrub to any pitch with a location → expect the dot to be color-coded by pitch type with the 2-letter abbrev inside (`FB` / `SL` / etc.).
2. Scrub to a pitch with no recorded location (legacy data) → expect the hint text under the zone, no dot.
3. Same on mobile and web; visual encoding matches.

## Out of scope (deferred)

- A legend mapping pitch-type color → name. The info card under the zone already names the pitch type, so the legend is redundant for v1.
- Backfilling location_x / location_y on legacy pitches. Out of scope for a UI fix.
