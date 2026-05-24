# Snackbar Foundation — Toast + ConfirmDialog · 2026-05-23

**Type:** `feat`
**Commit:** _(pending)_
**Versions:** `mobile@2.7.0 → 2.8.0` · `web@1.18.0 → 1.19.0`

## Context

The UX audit (`docs/plans/2026-05-23-ux-audit.md`) identified `Alert.alert` (mobile) and native `alert()` (web) as the single most-recurring anti-pattern in the in-game flow — **111 callsites** across both packages. Every one of them blocks the inning with a system-modal dialog, breaks the design language, can't be dismissed with a swipe, and feels jarring at game pace.

This is Phase 1 Item #1 of the audit's recommended bundle. It's the sequencing prerequisite for Phase 1 Item #2 (Fix Last Pitch) — that finding needs the toast pattern for its "Pitch logged · UNDO" affordance.

Findings addressed: `UX-LG-04`, `UX-LG-05`, `UX-LG-06`, `UX-NG-05`, `UX-BP-03`, `UX-DB-02`, `UX-PB-08`, and partial coverage of the `UX-GLB-02` umbrella (primary in-game surfaces only — secondary screens are Phase 1b).

## Plan (Decisions)

Two patterns for two semantically different uses:

1. **Toast** for informational notifications and validation errors (auto-dismiss, non-blocking, optional inline action button)
2. **ConfirmDialog** for destructive yes/no confirmations (blocking, but rendered through the app's UI library instead of the system alert)

**Mobile:** Toast wraps Paper's `Snackbar`; ConfirmDialog wraps Paper's `Dialog`. Both exposed via context providers + hooks (`useToast`, `useConfirm`).

**Web:** Toast and ConfirmDialog built as Emotion styled components. Same hook surface as mobile (`toast.show(...)`, `await confirm(...)`).

**No new dependencies** on either package. CLAUDE.md's iOS 26.2 beta blocklist is unaffected. Confirm returns `Promise<boolean>` so callers can `await` and branch.

Full plan: [`docs/plans/2026-05-23-snackbar-foundation.md`](../plans/2026-05-23-snackbar-foundation.md).

## What shipped

### packages/mobile (v2.8.0)

- NEW `src/hooks/useToast.tsx` — `ToastProvider` + `useToast()` hook; uses Paper `Snackbar`; supports `info`/`error`/`success` types, optional inline `action`, custom `duration` (default 3s without action, 5s with).
- NEW `src/hooks/useConfirm.tsx` — `ConfirmProvider` + promise-based `useConfirm()` hook; uses Paper `Dialog` inside a `Portal`; supports `destructive` styling and custom confirm/cancel labels.
- MODIFIED `app/_layout.tsx` — wrap app tree with `ConfirmProvider` + `ToastProvider` between `PaperProvider` and `AuthGuard`. (Left the pre-mount fatal-error `Alert.alert` in `ErrorUtils.setGlobalHandler` — it fires before the React tree mounts, so no context is available.)
- MODIFIED `app/(tabs)/index.tsx` — `handleDeleteGame` now uses `await confirm({destructive: true})` + `toast.show` for the failure branch.
- MODIFIED `app/game/new.tsx` — all 5 validation alerts + 1 error alert replaced with `toast.show({type: 'error'})`.
- MODIFIED `app/game/[id]/live.tsx` — 16 sites converted. `handleEndGame` and `handleUndoLastPitch` now use `await confirm({destructive: true})`. "Third strike — was it dropped?" converted from `Alert.alert` with two callbacks to `await confirm()`. All error paths use `toast.show({type: 'error'})`. Variable rename: `result` → `logResult` inside `handleLogPitch` to avoid shadowing.
- MODIFIED `app/game/[id]/pitch-calling.tsx` — 3 error sites → toast.
- MODIFIED `app/bullpen/[id]/live.tsx` — 4 sites. Back-arrow "Leave Session?" prompt uses confirm; the rest use toast.
- MODIFIED `app/bullpen/new.tsx` — 1 error → toast.
- MODIFIED `src/components/live/BatterSelectorModal/BatterSelectorModal.tsx` — 3 errors → toast.
- MODIFIED `src/components/live/MyBatterSelectorModal/MyBatterSelectorModal.tsx` — 1 error → toast.
- MODIFIED `package.json` — version bump 2.7.0 → 2.8.0.

### packages/web (v1.19.0)

- NEW `src/hooks/useToast.tsx` — `ToastProvider` + `useToast()` hook; bottom-center fixed positioning; auto-dismiss timer; re-exports `ToastType` from the view component.
- NEW `src/hooks/useConfirm.tsx` — `ConfirmProvider` + promise-based `useConfirm()` hook; standard `Promise<boolean>` API.
- NEW `src/components/common/Toast/Toast.tsx` + `styles.ts` + `index.ts` — Emotion styled bar with slide-up animation, type-tinted background (`gray[800]` for info, `red[600]` for error, `green[600]` for success), optional action button, dismiss "×".
- NEW `src/components/common/ConfirmDialog/ConfirmDialog.tsx` + `styles.ts` + `index.ts` — Emotion styled modal overlay; backdrop-click + Esc-key dismiss; destructive variant tints confirm button red.
- MODIFIED `src/App.tsx` — wrap `Routes` with `ConfirmProvider` + `ToastProvider` inside the `Router`.
- MODIFIED `src/pages/LiveGame/useLiveGameActions.ts` — 18 `alert()` sites replaced via a local `showError` helper that wraps `toast.show({type: 'error'})`.
- MODIFIED `src/pages/LiveGame/useLiveGameState.ts` — 1 `window.alert` site (charter→viewer fallback notice) → `toast.show({type: 'info'})`.
- MODIFIED `src/components/game/PitcherSelector/PitcherSelector.tsx` — `alert('Failed to set pitcher')` → toast.
- MODIFIED `src/components/game/BatterSelector/BatterSelector.tsx` — 2 `alert()` sites → toast.
- MODIFIED `package.json` — version bump 1.18.0 → 1.19.0.

### packages/shared

No changes.

### packages/api

No changes.

## Verification

**Type + lint + tests (passed):**

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/web && npx tsc --noEmit` — clean.
- `cd packages/web && npx eslint src/...` — clean after `--fix` resolved import-order warnings.
- `cd packages/mobile && npm test` — 12/12 tests pass.

**Smoke flow (manual):**

- Mobile: live game → tap **End Game** → confirm dialog (not system alert), Cancel returns to game.
- Mobile: dashboard → long-press a game → Delete confirm dialog (red destructive button), Cancel keeps the game.
- Mobile: bullpen live → back arrow → "Leave Session?" confirm.
- Mobile: live game → log a pitch with no pitcher selected → error toast at bottom auto-dismisses after 3s.
- Web: live game → click Log Pitch with no pitch location → toast appears bottom-center.
- Web: live game → click anywhere → no system alert; toast for any error path; ConfirmDialog for any destructive path (none yet wired into web LiveGame in this PR — see Out of scope).

## Out of scope (deferred)

- **Phase 1b — remaining ~50 `Alert.alert`/`alert()` sites** in `app/team/**`, `app/game/[id]/lineup.tsx`, `app/game/[id]/my-lineup.tsx`, `app/game/[id]/scouting-lineup.tsx`, `app/game/[id]/performance-summary.tsx`, `app/(tabs)/settings.tsx`, `app/(tabs)/teams.tsx`, `src/components/team/AddPlayerModal.tsx`, and the web admin/teams/history/team-detail paths. Same mechanical transformation; ships as a follow-up PR.
- **Re-model Undo as a logged-pitch toast affordance** — that's Phase 1 Item #2 (Fix Last Pitch), which depends on a new `PATCH /pitches/:id` (result-only) endpoint. Separate PR.
- **Theme-token consolidation** — Phase 2 Theme A.
- **Pre-mount fatal-error `Alert.alert` in `_layout.tsx`** — kept as-is; fires before the React tree exists, so no provider context available. The whole iOS 26.2 beta diagnostic should retire once the beta ships stable.
- **Web LiveGame destructive confirms** (e.g., End Game has its own modal already, Undo has `UndoPitchModal`) — left alone. ConfirmDialog is available if/when a future change wants to standardize.
