# Snackbar Foundation — replace Alert.alert / alert() with Toast + ConfirmDialog

**Status:** Approved · in progress
**Phase:** UX Audit Phase 1, Item #1 (sequencing prerequisite)
**Findings addressed (Phase 1a, this PR):** `UX-LG-04`, `UX-LG-05`, `UX-LG-06`, `UX-NG-05`, `UX-BP-03`, `UX-DB-02`, `UX-PB-08`, partial `UX-GLB-02`
**Findings deferred to Phase 1b:** the long tail of secondary-screen Alert.alert/alert() (admin, settings, scouting screens, team management) — same infrastructure, mechanical follow-up

---

## Context

The UX audit (`docs/plans/2026-05-23-ux-audit.md`) identified `Alert.alert` (mobile) and native `alert()` (web) as the single most-recurring anti-pattern in the in-game flow — 111 callsites across both packages. Every one of them blocks the inning with a system-modal dialog, breaks the design language, can't be dismissed with a swipe, and feels jarring at game pace.

Replacing them in one motion lights up ~10 individual findings AND unblocks Phase 1 Item #2 (Fix Last Pitch), which needs the toast pattern for its "Pitch logged · UNDO" affordance.

The audit recommends this as the prerequisite for everything else; sequencing it first.

---

## Plan (Decisions)

### Two components, two patterns

`Alert.alert` is used for two semantically different things, and we need both:

1. **Informational toast** — one-button "OK" notifications ("Failed to log pitch", "Missing Info", "Failed to send call"). These should be non-blocking, auto-dismiss after a few seconds, with an optional inline action button (Gmail-style "Undo").
2. **Destructive confirm dialog** — two-button yes/no confirmations ("End Game", "Delete game", "Sign Out", "Leave Session", "Remove player"). These should be blocking modals, but rendered through the app's UI library (Paper Dialog on mobile, custom modal on web) instead of the system alert.

### Mobile — `<ToastProvider>` + `useToast()` + `<ConfirmProvider>` + `useConfirm()`

- **Toast** built on Paper's `Snackbar` component (already installed via `react-native-paper@^5.14.5`).
- Single `<ToastProvider>` at the root level (sibling to `PaperProvider` in `app/_layout.tsx`).
- Hook signature: `const toast = useToast(); toast.show({ message, type?: 'info' | 'error' | 'success', action?: { label, onPress }, duration?: number })`.
- **Confirm** built on Paper's `Dialog` component.
- Hook signature: `const confirm = useConfirm(); const ok = await confirm({ title, message, confirmLabel?, cancelLabel?, destructive?: boolean })` — promise-based, returns `boolean`.
- Both hooks read context-provided functions; no Redux involvement.
- No new dependencies. CLAUDE.md's iOS 26.2 beta blocklist (expo-haptics, expo-secure-store, expo-sqlite, expo-network) is not affected.

### Web — `<ToastProvider>` + `useToast()` + `<ConfirmDialog>` + `useConfirm()`

- **Toast** built as an Emotion styled component (consistent with the rest of `packages/web`).
- Same hook surface as mobile (`toast.show(...)`, `await confirm(...)`).
- Mounted via a `<ToastContainer>` portal in `App.tsx`.
- No new dependencies; uses existing `@emotion/styled`.

### Why not Paper Snackbar's native `action` prop alone?

Paper's Snackbar takes a single action with `{ label, onPress }`. That's enough for `UNDO` / dismiss. But for a queueing system (multiple errors fired close together) we need our own queue management in the provider. Keep the Snackbar visual; wrap it.

### What we are NOT doing in this PR

- **Replace EVERY Alert.alert in the codebase** — only the primary in-game / setup / dashboard surfaces. The secondary screens (admin, settings, scouting editor, team management, opponent rosters, performance summary) get the same mechanical replacement in **Phase 1b** as a follow-up PR. Build the infrastructure once; sweep later.
- **Re-model Undo as a logged-pitch toast** — that's Phase 1 Item #2 (Fix Last Pitch) and depends on this PR's `useToast`. Will land in a separate PR.
- **Theme-token cleanup** — Toast and ConfirmDialog will use Paper's theme tokens already; broader hex-literal cleanup is Phase 2 Theme A.

---

## Scope — files touched

### Phase 1a (this PR)

**packages/shared** — nothing.

**packages/mobile**
- NEW: `src/components/common/Toast/Toast.tsx` + `index.ts`
- NEW: `src/components/common/ConfirmDialog/ConfirmDialog.tsx` + `index.ts`
- NEW: `src/hooks/useToast.tsx` (provider + hook)
- NEW: `src/hooks/useConfirm.tsx` (provider + hook)
- MODIFIED: `src/components/common/index.ts` (re-export new components)
- MODIFIED: `app/_layout.tsx` (wrap with ToastProvider + ConfirmProvider; replace _layout's own diagnostic Alert.alert)
- MODIFIED: `app/(tabs)/index.tsx` (1 destructive confirm + 1 error toast)
- MODIFIED: `app/game/new.tsx` (5 validation toasts + 1 error toast)
- MODIFIED: `app/game/[id]/live.tsx` (16 Alert.alert sites)
- MODIFIED: `app/game/[id]/pitch-calling.tsx` (3 sites)
- MODIFIED: `app/bullpen/[id]/live.tsx` (4 sites — 3 error + 1 destructive confirm)
- MODIFIED: `app/bullpen/new.tsx` (1 site)
- MODIFIED: `src/components/live/BatterSelectorModal/BatterSelectorModal.tsx` (3 sites)
- MODIFIED: `src/components/live/MyBatterSelectorModal/MyBatterSelectorModal.tsx` (1 site)
- MODIFIED: `package.json` version bump 2.7.0 → 2.8.0

**packages/web**
- NEW: `src/components/common/Toast/Toast.tsx` + `styles.ts` + `index.ts`
- NEW: `src/components/common/ConfirmDialog/ConfirmDialog.tsx` + `styles.ts` + `index.ts`
- NEW: `src/hooks/useToast.tsx`
- NEW: `src/hooks/useConfirm.tsx`
- MODIFIED: `src/App.tsx` (wrap routes with ToastProvider + ConfirmProvider)
- MODIFIED: `src/pages/LiveGame/useLiveGameActions.ts` (~18 alert() sites)
- MODIFIED: `src/pages/LiveGame/useLiveGameState.ts` (1 site)
- MODIFIED: `src/components/game/PitcherSelector/PitcherSelector.tsx` (1 site)
- MODIFIED: `src/components/game/BatterSelector/BatterSelector.tsx` (2 sites)
- MODIFIED: `package.json` version bump 1.18.0 → 1.19.0

**packages/api** — nothing.

### Phase 1b (separate follow-up PR)
The remaining ~50 Alert.alert / alert() callsites in non-in-game screens (admin, settings, scouting reports, team detail, opponents, performance summary, lineup editors). Same mechanical transformation; no infrastructure changes.

---

## Verification

**Per-file E2E:**
- After replacing each in-game Alert.alert: pull up the relevant screen, force the error path (disconnect API, leave a required field empty, etc.), verify the Toast/ConfirmDialog renders correctly.
- Specifically test on iOS sim — CLAUDE.md flags iOS 26.2 beta as fragile; Paper Snackbar + Dialog should be safe but verify.

**Type + lint + tests:**
- `cd packages/mobile && npx tsc --noEmit`
- `cd packages/mobile && npm test`
- `cd packages/web && npx tsc --noEmit`
- `cd packages/web && npx eslint src/ --ext .ts,.tsx`
- Prettier: `npx prettier --write` on all touched files

**Smoke flow (manual, mobile):**
1. Live game → tap result for an in-progress at-bat → verify no Alert.alert pops up if all good
2. Live game → tap End Game → confirm dialog appears (not system alert), tap Cancel → returns to game
3. Bullpen live → tap back arrow → confirm "Leave Session?" dialog appears
4. Dashboard → long-press a game → confirm Delete dialog appears, tap Cancel → game stays

**Smoke flow (manual, web):**
1. Live game → no pitcher selected → click Log Pitch → toast appears bottom of screen with "Please select both a pitcher and a batter first"
2. PitcherSelector → trigger an API error (devtools network tab block) → toast appears
3. Toast auto-dismisses after ~4 seconds with no action

---

## Out of scope (deferred)

- **Phase 1b**: remaining ~50 Alert.alert/alert() sites in admin, settings, scouting reports, team detail, opponents, performance summary, lineup editors. Same transformation; mechanical PR.
- **Re-model Undo as logged-pitch toast** — Phase 1 Item #2 (Fix Last Pitch); separate PR with new `PATCH /pitches/:id` endpoint.
- **Haptic feedback on toast appear** — would use `expo-haptics` but CLAUDE.md bans it for iOS 26.2; route through existing `utils/haptics` no-op wrapper if added.
- **Toast queueing / stacking** — first version surfaces one toast at a time; if a second `toast.show()` fires while one is visible, it replaces. Queueing can come later if needed.
- **Theme-token consolidation** — Phase 2 Theme A.
