# Phase 2 Batch 1 — Design tokens (A) + Heat-zone strip (K)

**Status:** Approved · in progress
**Phase:** UX Audit Phase 2, items A + K
**Findings addressed:** `UX-GLB-01`, partial `UX-GLB-03`, `UX-LG-18`, `UX-LG-24`, `UX-LG-29`, `UX-TD-06`, `UX-TD-08`, `UX-PB-06`

C (live-screen refactor) was originally bundled with this batch but split into its own session — see "Out of scope" below.

---

## Context

Phase 1 of the UX audit landed across 4 commits over a single day. Phase 2 starts the larger-workstream cleanups. The user's choices for Phase 2 Batch 1:

- **K — Heat zones**: strip from web (decision: post-game analysis users on `PitcherProfile` keep heat zones; live-game users were the ones who never used them).
- **A — Design tokens**: stay neutral (don't bundle the navy/amber aesthetic from item H; keep the existing palette and just centralize it).
- **C — Live screen refactor**: deferred to its own session.

---

## Plan (Decisions)

### K — Strip web heat-zone overlay from Live Game

Heat zones in Live Game were dead weight per the audit (UX-LG-29). The web `PitcherProfile` page still uses heat zones for post-game pitcher analysis — keep that path intact. Only remove from Live Game.

**Decision:** delete the toggle UI from `LiveGame.tsx`, the related state from `useLiveGameState.ts`, and the now-unused `HeatZoneToggleContainer`/`HeatZoneToggleLabel`/`ToggleSwitch*` styles. Leave `HeatZoneOverlay` component + `useHeatZones` hook untouched (still used by `PitcherProfile`). Mobile `StrikeZone` never had heat zones; no parity work needed.

### A — Design token consolidation

Audit inventoried **~100 distinct hex literals** across the codebase. Web theme (`packages/web/src/styles/theme.ts`) was already partially tokenized via CSS variables (with both light + dark mode) — needed `purple` scale + a `semantic` aliases group. Mobile theme (`packages/mobile/src/styles/theme.ts`) had `primary/gray/green/red/yellow` scales but was missing `blue`, `orange`, `amber`, `purple` (referenced widely) plus the same `semantic` group.

**Decision:**

1. Extend both theme files with the missing scales (`blue`, `orange`, `amber`, `purple` — Tailwind-derived values) + a `semantic` map (`warningBg/Text/Border`, `successBg/Text/Border`, `errorBg/Text/Border`, `infoBg/Text/Border`).
2. Sweep the highest-impact files only this batch — covers the audit's most-flagged "literal jungle" surfaces. Remaining files documented as Phase 2.A continuation.

**Sweep coverage (this batch):**
- Mobile: `HitterTendenciesModal.tsx`, `PitcherTendenciesModal.tsx`, `app/game/[id]/live.tsx` (the most-edited Phase 1 file).
- Web: `LiveGame.tsx` Settings panel (the audit's `UX-LG-24` 60-line inline-styles offender — extracted to 7 new styled components in `styles.ts`).

### Honest sweep limits

This batch does NOT sweep:
- Mobile: `pitch-calling.tsx`, `bullpen/[id]/live.tsx`, `game/new.tsx`, the 4 selector modals, the 7 in-play modals (most still have literals)
- Web: the rest of `LiveGame.tsx` inline styles (PlayersRow, Runner Adv/Out buttons, the inline `<select>` styling)

These are Phase 2.A continuation. Foundation tokens are in place; the sweep can proceed file-by-file in subsequent PRs.

---

## Scope — files touched

### packages/mobile (v2.11.0 → v2.12.0)

- MODIFIED `src/styles/theme.ts` — add `blue`, `orange`, `amber`, `purple` scales; add `semantic` map (warningBg/Text/Border, successBg/Text/Border, errorBg/Text/Border, infoBg/Text/Border).
- MODIFIED `src/components/live/TendenciesModals/HitterTendenciesModal.tsx` — import `colors, semantic`; replace 11 hex literals.
- MODIFIED `src/components/live/TendenciesModals/PitcherTendenciesModal.tsx` — import `colors, semantic`; replace 7 hex literals.
- MODIFIED `app/game/[id]/live.tsx` — import `colors, semantic`; replace 30+ hex literals across JSX inline styles and the StyleSheet block.

### packages/web (v1.22.0 → v1.23.0)

- MODIFIED `src/index.css` — add `--color-purple-{50,100,500,600,700}` to both light + dark blocks; add `--semantic-*` aliases for warning/success/error/info.
- MODIFIED `src/styles/theme.ts` — expose `colors.purple` + `semantic` map.
- MODIFIED `src/pages/LiveGame/styles.ts` — delete `HeatZoneToggleContainer`, `HeatZoneToggleLabel`, `ToggleSwitch`, `ToggleSwitchInput`, `ToggleSwitchSlider` (heat-zone toggle support, now unused). Add `SettingsAnchor`, `SettingsPanel`, `SettingsPanelTitle`, `SettingsRow`, `SettingsCheckbox`, `SettingsRowLabel`, `SettingsRowSub` for the Settings panel extraction.
- MODIFIED `src/pages/LiveGame/LiveGame.tsx` — remove heat-zone toggle JSX + imports; rewrite Settings panel using new styled components (replaces 60+ lines of inline styles).
- MODIFIED `src/pages/LiveGame/useLiveGameState.ts` — remove `showHeatZones`, `setShowHeatZones`, `heatZones`, `useHeatZones` import + return.

### packages/api / packages/shared

No changes.

---

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/web && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Prettier on all touched files.

**Smoke (manual):**
1. Web LiveGame: settings gear opens panel, both checkboxes work, panel dismisses by clicking gear again.
2. Web LiveGame: no heat-zone toggle visible above strike zone.
3. Web PitcherProfile: heat zone toggle still works (unchanged).
4. Mobile LiveGame: visual parity with previous version (tokens resolve to same values).
5. Mobile Hitter/Pitcher Tendencies modals: visual parity.

---

## Out of scope (deferred)

### C — Live screen refactor (own session)

Originally bundled with A + K, but realistically a full-session item:
- Extract `useLiveGameController` hook (~30 useState calls, ~25 handlers from a 2647-line file)
- Split JSX into `LiveGameTablet`, `LiveGamePhone`, `LiveGameModals`, `LiveGameCallControls`, `LiveGameResultPanel` components
- Reorder phone layout to put StrikeZone + ResultButtons in thumb zone

Deferred to its own commit so it gets the attention it needs. Doesn't block on this batch.

### Phase 2.A continuation

The token sweep is ~30% done by file count. Continuation files:
- Mobile: `pitch-calling.tsx`, `bullpen/[id]/live.tsx`, `game/new.tsx`, in-play modals (`InPlayModal`, `RunnerEventModal`, `RunnerAdvancementModal`, `BaserunnerOutModal`, `DoublePlayModal`, `PickoffModal`, `InningChangeModal`), selector modals (`BatterSelectorModal`, `MyBatterSelectorModal`, `PitcherSelectorModal`, `TeamAtBatModal`), `BatterBreakdownSheet`, `GameHeader`
- Web: rest of `LiveGame.tsx` inline styles (PlayersRow, Runner Adv/Out buttons, the inline `<select>` styling, score row alignments)

Mechanical follow-up PR(s) once tokens are battle-tested.
