# Live-game dark mode — StrikeZone SVG + PitchTypeGrid chips

- **Date:** 2026-05-10
- **Type:** style
- **Commit:** `35f85a8`
- **Versions:** mobile `1.88.0` → `1.89.0` (mobile-only)

## Context

Dark mode had been swept across most of mobile in earlier commits, but the live-game screen still had two glaring light-mode islands:

1. **StrikeZone SVG** — the canvas background, plate shadow, zone-cell fills, strokes, and zone-label text were hard-coded to cream/light colors. On a dark surface card the SVG looked like a white pane in the middle of the screen.
2. **PitchTypeGrid pitch-type buttons** (4S / CB / CH etc.) — buttons used `colors.gray[100]` bg with `colors.gray[700]` text. In dark mode those rendered as bright white pills with dark text — distracting and unrelated to the surrounding card.

## Decision

- For SVG (no theme tokens at the SVG-prop level): derive a per-mode palette from `theme.dark` and pass into `fill`/`stroke` props.
- For PitchTypeGrid buttons: keep the static StyleSheet structure but layer `theme.colors.surfaceVariant` / `onSurface` / `onSurfaceVariant` overrides at the JSX site (the inline-override pattern used elsewhere on mobile).

## What shipped

### `packages/mobile/src/components/live/StrikeZone/StrikeZone.tsx`

- New per-mode palette derived from `theme.dark`:
    - `svgBackground`, `plateShadow`, `zoneOuterFill`, `zoneCellFill`, `zoneCellStroke`, `zoneOuterStroke`, `wasteHintFill`, `wasteHintStroke`, `wasteLabelFill`, `zoneLabelFill`.
- Title, legend, instructions, and clear-target button text/bg use inline `theme.colors.onSurface` / `onSurfaceVariant` / `surfaceVariant` / `primary` overrides.

### `packages/mobile/src/components/live/PitchTypeGrid/PitchTypeGrid.tsx`

- Compact and full-mode buttons: unselected bg = `theme.colors.surfaceVariant`; abbrev text = `theme.colors.onSurface` (or `onSurfaceVariant` in compact); label text = `theme.colors.onSurfaceVariant`. Selected state unchanged (`colors.primary[600]` bg, white text).
- Section title text uses `theme.colors.onSurface`.

## Verification

Mobile in dark mode: open the live-game screen with a pitcher and batter selected.

- The strike-zone canvas should sit cleanly on the dark surface card with visible cell borders and labels.
- 4S / CB / CH etc. read as muted card chips, not glaring white pills. Selected state stays bright.
- Light mode unchanged.
