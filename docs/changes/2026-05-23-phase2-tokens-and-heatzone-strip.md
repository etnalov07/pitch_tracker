# Phase 2 Batch 1 · Design tokens (A) + Heat-zone strip (K) · 2026-05-23

**Type:** `refactor`
**Commit:** _(pending)_
**Versions:** `mobile@2.11.0 → 2.12.0` · `web@1.22.0 → 1.23.0`

## Context

First Phase 2 batch. Two foundation cleanups: lift named tokens into the theme files (so future work doesn't have to fight literal jungles in dark mode), and rip the dead heat-zone toggle out of Live Game (the audit found nobody used it).

Item C (live-screen refactor) was originally bundled here but split into its own session — it's a 2647-line-file refactor that needs dedicated attention.

Findings addressed: `UX-GLB-01`, partial `UX-GLB-03`, `UX-LG-18`, `UX-LG-24`, `UX-LG-29`, `UX-TD-06`, `UX-TD-08`, `UX-PB-06`.

## Plan (Decisions)

- **Stay neutral on aesthetic** (not navy/amber from item H) — A just centralizes the existing palette; H stays a separate brand decision.
- **Strip K from Live Game only** — `PitcherProfile` still uses heat zones for post-game analysis, kept intact.
- **Sweep coverage scoped** to the highest-impact files: mobile Hitter/Pitcher Tendencies modals + `live.tsx`; web Settings panel. Remaining files (mobile pitch-calling, bullpen live, modals; web inline styles in PlayersRow/score area) are Phase 2.A continuation.

Full plan: [`docs/plans/2026-05-23-phase2-tokens-and-heatzone-strip.md`](../plans/2026-05-23-phase2-tokens-and-heatzone-strip.md).

## What shipped

### packages/mobile (v2.12.0)

- MODIFIED `src/styles/theme.ts` — added `blue` (50-800), `orange` (50-800), `amber` (50-800), `purple` (50/100/500/600/700) scales. Added `semantic` map: `warningBg`/`warningText`/`warningBorder`, `successBg`/`successText`/`successBorder`, `errorBg`/`errorText`/`errorBorder`, `infoBg`/`infoText`/`infoBorder`. Mirrors web's existing structure.
- MODIFIED `src/components/live/TendenciesModals/HitterTendenciesModal.tsx` — import `colors, semantic`; replaced 11 hex literals (`#0B1F3A` → `colors.primary[900]`, `#fefce8`/`#854d0e` → `semantic.warningBg/Text`, `#eff6ff`/`#bfdbfe`/`#1d4ed8` → `semantic.infoBg/Border/Text`, `#ef4444` → `colors.red[500]`, `#dcfce7` → `colors.green[100]`, `#d1d5db` → `colors.gray[300]`, `#f87171` → `colors.red[400]`, `#e5e7eb` → `colors.gray[200]`).
- MODIFIED `src/components/live/TendenciesModals/PitcherTendenciesModal.tsx` — same pattern, replaced 7 hex literals.
- MODIFIED `app/game/[id]/live.tsx` — import `colors, semantic`; replaced 30+ hex literals across both JSX inline styles and the StyleSheet block. Notable swaps: `#0A1628` → `colors.primary[900]`, `#F5A623` → `colors.amber[500]`, `#fef3c7`/`#92400e`/`#fcd34d` → `semantic.warningBg/Text/Border`, `#f0fdf4`/`#86efac`/`#15803d` → `semantic.successBg/Border/Text`, `#6366f1` → `colors.purple[600]`, `#EF4444`/`#EF444420` → `colors.red[500]` + an `rgba(239, 68, 68, 0.13)` (semantic alpha tint), `#d97706` → `colors.amber[600]`, `#e5e7eb` → `colors.gray[200]`, `#9ca3af` → `colors.gray[400]`, `#b91c1c` → `colors.red[700]`, `#16a34a` → `colors.green[600]`.
- MODIFIED `package.json` — version bump.

### packages/web (v1.23.0)

- MODIFIED `src/index.css` — added `--color-purple-{50,100,500,600,700}` (both light + dark blocks). Added `--semantic-warning-{bg,text,border}`, `--semantic-success-*`, `--semantic-error-*`, `--semantic-info-*` (both blocks, dark inverted appropriately for legibility).
- MODIFIED `src/styles/theme.ts` — exposed `colors.purple` + `semantic` map.
- MODIFIED `src/pages/LiveGame/styles.ts`:
  - **Deleted** `HeatZoneToggleContainer`, `HeatZoneToggleLabel`, `ToggleSwitch`, `ToggleSwitchInput`, `ToggleSwitchSlider` (~64 lines, dead after K strip).
  - **Added** `SettingsAnchor`, `SettingsPanel`, `SettingsPanelTitle`, `SettingsRow`, `SettingsCheckbox`, `SettingsRowLabel`, `SettingsRowSub` for the Settings extraction.
- MODIFIED `src/pages/LiveGame/LiveGame.tsx`:
  - Removed heat-zone toggle JSX (`HeatZoneToggleContainer` block above StrikeZone) + import.
  - Removed `<StrikeZone>` `heatZones` + `showHeatZones` props.
  - Rewrote Settings panel using the new styled components — eliminated 60+ lines of inline `style={{...}}` and removed dependence on importing `theme` for inline composition.
- MODIFIED `src/pages/LiveGame/useLiveGameState.ts` — removed `showHeatZones`, `setShowHeatZones`, `heatZones`, `useHeatZones` import + state + return entries.
- MODIFIED `package.json` — version bump.

### packages/api / packages/shared

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/web && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Prettier on all touched files.

**Smoke (manual):**

1. Mobile Live Game: load on light theme — visual parity with prior version (tokens resolve to same hex values).
2. Mobile Live Game: switch to dark theme — warning banners, success badges, walkie-talkie active state all readable (previously `#fef3c7` / `#92400e` would have been near-invisible on dark surface).
3. Mobile Hitter Tendencies modal: scouting box, no-data warning, zone-grid colors render correctly.
4. Web Live Game: Settings gear opens the panel; both checkboxes work; panel auto-dismisses on second click.
5. Web Live Game: no heat-zone toggle above strike zone.
6. Web PitcherProfile: heat-zone toggle still functional (untouched).

## Out of scope (deferred)

- **C — Live screen refactor** — its own session. Extract `useLiveGameController` hook from 2647-line `live.tsx`, split JSX into 5 layout components, reorder phone layout. Doesn't block on this batch.
- **Phase 2.A continuation** — sweep remaining mobile files (pitch-calling, bullpen live, game/new, the 7 in-play modals, the 4 selector modals, GameHeader, BatterBreakdownSheet) and web (rest of LiveGame inline styles in PlayersRow/score area, the inline `<select>` styling, Runner Adv/Out button inline styles).
- **Dark-mode visual QA pass** — tokens are in place; this is the pre-requisite. A separate dark-mode QA pass would catch any contrast issues that survived. Not included here.
- **Item H — navy/amber scoreboard aesthetic** — still its own brand decision. Foundation is now in place to make the swap trivial if you ever decide to adopt it (change token values; everything else follows).
