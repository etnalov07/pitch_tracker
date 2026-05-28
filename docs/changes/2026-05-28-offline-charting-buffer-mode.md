# Offline-mode charting (buffer mode) for game play — mobile

- **Date:** 2026-05-28
- **Type:** feat
- **Commit:** `<pending>`
- **Versions:** mobile `2.39.0` → `2.40.0`

## Context

Coaches chart live games on iPhone where cell reception is often poor. Every
pitch log and game write hit the API synchronously (`src/services/api.ts`, 10s
timeout) and failed hard on a dropped connection — the error surfaced and the
pitch could be lost. This makes charting survive reception gaps: pitch logs are
buffered locally and synced automatically when signal returns.

A complete offline stack already existed in the app but was **stubbed off**
during the iOS 26.2 beta because it depended on `expo-sqlite` + `expo-network`
(both crash on that beta, both banned). That dependency had already been
engineered out — storage is pure AsyncStorage (`src/db/schema.ts`), reachability
is a `fetch` probe, foreground-sync uses `AppState` (`src/services/offlineService.ts`).
So this was mostly a **revive-and-wire** job, not greenfield.

## Plan (Decisions)

Upstream plan: `~/.claude/plans/need-to-connect-stalker-vectorized-bentley.md`
(buffer-mode design). Scope confirmed with the user:

- **Buffer mode, not full offline.** The game is opened while online (the
  current at-bat exists on the server). When signal drops, **pitch logs queue**
  and auto-sync. Starting a new at-bat / inning / game with zero signal is out
  of scope — it would need temp→real ID remapping the sync engine doesn't do.
- **Load-bearing constraint:** `offlineService.executeAction` replays each
  queued payload verbatim (no ID remapping). So only `LOG_PITCH` is buffered
  (its `at_bat_id` always points at a server-created at-bat); everything that
  creates/transitions a server entity is **gated to online**.
- **Game charting only** (not bullpen). **Mobile-only** — no API/migration.
- **Reused the existing infra** rather than rebuilding: queue, sync engine,
  offline slice, and `SyncStatusBadge` were all already present.
- **No live pitch-list reconcile.** `state.games.pitches` has no server-refetch
  loader for an in-progress at-bat, so optimistic `local-` pitches simply live
  in memory until the next (online) at-bat transition resets the list — avoids
  a fragile refetch/double-count. EDIT/Fix-Last is suppressed for `local-` ids.

## What shipped

### `packages/mobile/`

- **`src/services/networkCheck.ts`** (new) — extracted the `fetch`-based
  `checkIsOnline` probe into its own module so the slice and service share it
  without an import cycle.
- **`src/services/offlineService.ts`** — now imports `checkIsOnline` from
  `networkCheck` (removed the local copy). Sync engine, `AppState` foreground
  sync, and 30s interval drain are unchanged.
- **`src/state/offline/offlineSlice.ts`** — un-stubbed the three thunks:
  `checkNetworkStatus` → `checkIsOnline()`; `loadPendingCount` →
  `getPendingActionCount()`; `loadPendingActions` → `getPendingActions()`.
  Dropped the stale "disabled" comments; `networkType` initial → `null`.
- **`app/_layout.tsx`** — `startOfflineService()` in the boot init effect
  (inside the existing `InteractionManager` deferral); `stopOfflineService()`
  on cleanup. This is what was missing — the service was never started.
- **`src/hooks/useOfflineActions.ts`** — `logPitchOffline` reads `isOnline`
  from the slice. Offline → `queueAction('LOG_PITCH', …)` + optimistic
  `addPitch` (a `local-<id>` pitch so the count/zone update instantly) +
  `incrementPendingCount`, returns `{ queued: true, pitch }`. Online → dispatch
  as before, but on failure it re-probes connectivity and buffers if the
  network is actually down (catches a sudden mid-action drop).
- **`app/game/[id]/useLiveGameActions.ts`** —
    - `handleLogPitch`: shows a "Saved offline" toast (not the server-only EDIT
      affordance) for queued pitches; after a buffered pitch, **skips the
      server-bound at-bat resolution** and notes "reconnect to record the
      result" when the result would end the at-bat.
    - Added a ref-backed `requireOnline(label)` guard and gated every
      transition handler: `advanceInningWithRuns`, `handleEndAtBat`,
      `handleEndHalfScrimmage`, `handleTeamAtBatConfirm`, `handleSelectPitcher`,
      `handleEndGame`, `handleToggleHomeAway`, `handleStartAtBat`,
      `startAtBatForBatter`, `handleInPlayResult`, `handleRunnerPress`,
      `handleEditLastPitchResult`, `handleUndoLastPitch` (plus a `local-` guard
      so an unsynced pitch can't be undone).
- **`app/game/[id]/useLiveGameController.ts`** — exposes `pendingCount` from the
  offline slice (drives the live-screen indicator).
- **`src/components/common/SyncStatusBadge.tsx`** — un-stubbed: restored the
  `triggerSync` import and tap-to-sync handler. Already rendered compact in
  `LiveGameTopBar` and full on the dashboard, so the live screen now shows
  Offline / N pending / Syncing / Synced and syncs on tap — no new pill needed.
- **`app/(tabs)/settings.tsx`** — restored `handleManualSync` (→ `triggerSync()`)
  and `handleClearPending` (→ `clearAllActions()` + `setPendingCount(0)`),
  replacing the "temporarily disabled" alerts; removed the stale commented
  imports. The Sync & Data section UI was already wired.
- **`src/db/__tests__/offlineQueue.test.ts`** (new) — 3 tests pinning the
  enqueue → read-back → FIFO-order → remove/clear contract against an in-memory
  AsyncStorage mock.

## Verification

1. `cd packages/mobile && npx tsc --noEmit` — clean.
2. `cd packages/mobile && npx jest --no-coverage` — 15/15 pass (3 new).
3. **On-device, iOS (the real test):** open a game online so the current at-bat
   exists → **Airplane Mode** → log several pitches → confirm: no error, pitches
   appear (count/zone advance), the top-bar badge shows "Offline / N pending",
   no EDIT affordance on buffered pitches, and tapping "next batter" / end
   at-bat / change pitcher / advance inning shows a "you're offline — reconnect
   to …" toast (no crash). → disable Airplane Mode → within ≤30s (or on
   foreground) the badge drains to Synced and transitions work again. Settings →
   Sync & Data shows pending count, manual Sync, and Clear Pending.
4. **iOS 26.2 safety:** only AsyncStorage + `fetch` + `AppState` are used (all
   proven safe via auth/settings persistence); New Architecture stays off.

## Out of scope (deferred)

- **Full offline** — creating at-bats/innings/games with zero signal; needs
  temp→real ID remapping + backend idempotency/client IDs/batch-sync. The unused
  `OfflineActionType`s (`CREATE_AT_BAT`, `ADVANCE_INNING`, …) stay defined for it.
- **Bullpen offline** — not selected; a simpler follow-up (session id exists, no
  dependency chain).
- **Read-cache / offline app-reload** — deliberately deferred. The game-load
  effect fetches many entities (inning, pitchers, lineup, base runners), so a
  partial game-only cache would leave a half-populated, un-chartable screen. In
  memory state already survives backgrounding; a full kill+reload offline is rare
  and needs a comprehensive cache done deliberately.
- **Offline editing** of synced pitches / "Fix Last Pitch" — gated offline.
- **Queuing `updateScore` / `updateBaseRunners` offline** — gated for v1 (safe to
  add later since they reference the existing game id).
- **Conflict resolution** beyond the existing retry-3-then-drop.
