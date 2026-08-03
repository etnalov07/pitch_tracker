# App-wide Org/Team Brand Theming + Dark-Mode Cleanup (Web)

- **Date:** 2026-08-02
- **Type:** feat
- **Commit SHA:** _pending_
- **Version bumps:** web `1.37.0 → 1.38.0`, api `1.27.0 → 1.28.0` (shared unchanged)

## Context

Request: "a standard light mode and dark mode, and for organizations or teams a theme
based on their primary and secondary colors."

An audit found ~70% of this already existed: light/dark mode is fully built on web
(`ThemeModeContext` + `index.css` tokens + Settings switcher) and mobile, and web team
theming existed end-to-end (DB columns, `PUT /teams/:id/colors`, `ColorPicker`,
`TeamThemeContext` writing `--team-*` CSS vars) — but was only *activated* on two team
pages and *consumed* in ~2 gradient headers. Org colors had DB columns/types but no API
write path and no UI. So the work is extension + cleanup, not greenfield.

Scope (user-chosen): **web only** (mobile team-theming deferred); **app-wide** brand with a
**full reskin**; **dark-mode-aware** derivation; add **org-level theming**; dark-mode cleanup.

## Plan (Decisions)

- **Brand = baseline + override**, not a flat priority list. Org colors are the app-wide
  resting brand; a team's colors override *only while inside that team's route*, then revert
  to the org baseline (never to default) — so every navigation is one monotonic recolor, no
  flash-to-default. Precedence: team-in-context → org → default (`#486581/#1f2937/#22c55e`).
- **Full reskin from primary+secondary** by deriving a whole `--color-primary-50…900` ramp
  plus tinted surfaces and a header gradient, layered as inline vars on `<html>` over the
  `index.css` base tokens (the existing `var(--*)` architecture).
- **Dark-mode aware:** in dark mode the ramp is lifted ~2 stops (base at the 400 slot) so
  500/600 read bright on dark, mirroring the `[data-theme='dark']` strategy in `index.css`.
- **Guardrails** so arbitrary user hex can't break contrast: text/gray tokens are never
  derived (ride the neutral WCAG ramp); surface tint clamped (light ≤5%, dark ≤10%); header
  stops contrast-nudged against white; invalid hex falls back to defaults.
- **No-FOUC:** the provider persists the exact derived var-map; an inline bootstrap in
  `index.html` sets `data-theme` and replays that map before first paint. No color math in
  the bootstrap → nothing to keep in sync. This also fixed the latent explicit-dark flash and
  made the incomplete `@media (prefers-color-scheme: dark)` fallback removable.
- **Org theming** mirrors the team pattern (2-color mode, no `accent_color` column → no
  migration, no shared change).

Upstream plan: `~/.claude/plans/review-the-theming-throughout-zesty-crayon.md`.

## What shipped

### packages/web

- **`src/styles/colorMath.ts` (NEW):** `normalizeHex`/`hexToRgb`/`rgbToHex`, `mix`/`lighten`/
  `darken`, `getLuminance`/`getContrastRatio` (hoisted out of ColorPicker), `generateRamp`
  (mode-aware, base anchored at 600 light / 400 dark), `ensureContrast`, `deriveBrandTokens`
  (returns the 20-key brand var-map), and `BRAND_VAR_KEYS`/`DEFAULT_BRAND`.
- **`src/contexts/TeamThemeContext.tsx`:** generalized into the brand provider — org baseline +
  team override state, resolves to a brand, consumes `useThemeMode().effectiveMode` and
  re-derives on light/dark toggle, applies tokens via `setProperty` and removes exactly
  `BRAND_VAR_KEYS` on clear, and persists `brand:vars` (var-map) + `brand:active` (source).
  Adds `setOrgBrand`/`setTeamBrand`/`clearTeamBrand`; keeps `setActiveTeam`/`clearTheme` as a
  back-compat shim.
- **`src/contexts/BrandSync.tsx` (NEW):** single app-wide driver rendered in the Router —
  fetches the user's org once per session for the baseline, and applies/reverts the team
  override off `useMatch('/teams/:team_id/*')` + redux `selectedTeam` (fetching the team if a
  subroute didn't). Exported from `src/contexts/index.ts`; mounted in `src/App.tsx`.
- **`src/pages/TeamDetail/useTeamDetail.ts` + `src/pages/TeamSettings/TeamSettings.tsx`:**
  removed the local `setActiveTeam`/`clearTheme` wiring (now centralized in `BrandSync`);
  TeamSettings keeps its local color-editing state.
- **`src/components/team/ColorPicker/ColorPicker.tsx`:** imports the hoisted contrast helpers;
  added `showAccent?: boolean` (default true) to render 2-color mode for orgs.
- **`src/pages/OrgDashboard/OrgDashboard.tsx`:** "Organization Colors" section in the Settings
  tab (`ColorPicker showAccent={false}` + Save, gated by `canManage`); saving calls
  `organizationService.updateColors`, updates local state, and `setOrgBrand` for instant reskin.
- **`src/services/organizationService.ts`:** added `updateColors(orgId, { primary_color,
  secondary_color })` → `PUT /organizations/:id/colors`.
- **`public/index.html`:** pre-paint bootstrap script (sets `data-theme`, replays `brand:vars`).
- **`src/index.css`:** removed the incomplete `@media (prefers-color-scheme: dark)` fallback
  (the app requires JS and the bootstrap now sets `data-theme` synchronously).
- **Dark-mode cleanup:** replaced hardcoded severity-badge hex with `theme.semantic.*` pairs in
  `pages/BullpenSessions/styles.ts`, `pages/BullpenNew/styles.ts`,
  `components/pitcher/BullpenLogTable/styles.ts`, `components/pitcher/BullpenLogDetail/styles.ts`;
  and one muted-text hex → `theme.surfaces.textSubtle` in
  `components/performanceSummary/BatterBreakdownPanel/styles.ts`.

### packages/api

- **`src/services/organization.service.ts`:** added `updateColors(orgId, colors)` — COALESCE
  UPDATE of `primary_color`/`secondary_color`.
- **`src/controllers/organization.controller.ts`:** added `updateColors` with the same hex
  validation the team endpoint uses.
- **`src/routes/organization.routes.ts`:** added `PUT /:org_id/colors`
  (`requireOrgRole('owner','admin')`).

### packages/shared

- No changes. `Organization` already carries `primary_color`/`secondary_color`; org theming
  uses 2-color mode, so no `accent_color` column/type/migration and no shared version bump.

## Verification

- **Checks:** `packages/web` `tsc --noEmit` clean; `packages/web` ESLint clean; `packages/api`
  `tsc --noEmit` clean; Prettier applied to all changed files.
- **Color math (runtime):** imported `colorMath.ts` via `tsx` — light ramp is monotonic with
  base at 600, dark ramp lifted with base at 400, all 20 derived tokens are valid 6-digit hex,
  header stops clear white-text contrast (18.5 / 7.3), and garbage hex normalizes to `null`.
- **Manual end-to-end** (`npm run dev:api` + `npm run dev:web`):
  1. Settings → Appearance (Light/Dark/System) still toggles correctly.
  2. Team Settings → set colors → the whole app reskins inside the team; leaving reverts to the
     org baseline (not default), no flash.
  3. OrgDashboard → Settings → Organization Colors → Save → app-wide baseline updates; reload
     confirms it persists.
  4. Hard-reload in dark mode with a brand set → no flash of light/default before React mounts.
  5. Pick a near-black team primary, switch to dark → buttons/surfaces/text stay legible.
- **No env/migration steps** (uses existing org color columns).

## Out of scope (deferred)

- Mobile team/org theming (net-new provider + dynamic Paper theme) and mobile static-color
  cleanup (~30 files).
- Org logos and org `accent_color` column/type.
- Roaming light/dark across devices (no `user_settings` table).
- User-pinned "which org brands my app" (`brand:active.kind` leaves room).
- Intentionally-kept hardcoded colors: `BullpenLive` rgba chips and navy+white highlight rows
  (`PerformanceSummaryCard`, `BatterBreakdownPanel`, `OpponentAttackSummary`) stay readable in
  dark mode as-is (fixed-surface, white-on-navy), so they were left untouched.

## Note

The pre-existing `packages/api` `organization.routes.test.ts` suite fails to load on `main`
(`team.routes.ts:18` — `teamController.getTeamById` undefined in the test harness), confirmed
by stashing these changes and re-running. It is unrelated to this work.
