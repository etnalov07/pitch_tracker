# Phase 2 — C continuation 1 — Extract `useLiveGameController` hook

**Status:** Approved · in progress
**Phase:** UX Audit Phase 2, item C (continuation 1/2)
**Findings addressed:** `UX-LG-00` (live.tsx is 2647→2921 lines), foundation for `UX-LG-11` and `UX-LG-31`

## Context

Phase 2 batch 2 shipped the user-visible part of C (phone layout reorder). This batch starts the code-quality half: extract a `useLiveGameController` hook that owns all state, effects, and derived values. Handlers stay in `live.tsx` for now — they reference destructured values via closure. The JSX split into separate layout components is C continuation 2 (separate batch).

The split mirrors web's `useLiveGameState` + `useLiveGameActions` pattern but combined into a single hook because mobile's state and derived values are tightly coupled and the handlers share enough common dependencies that a single closure scope is simpler than two.

## Plan (Decisions)

### What goes in the hook

- Framework hooks: `useRouter`, `useTheme`, `useAppDispatch`, `useToast`, `useConfirm`, `useDeviceType`, `useOfflineActions`, `useLocalSearchParams`, `useStalkerRadar`, `useGameWebSocket`
- All Redux selectors (games, settings, teams)
- All `useState` declarations (~30 pairs)
- The `useRef` for the in-flight pitch log guard
- All `useEffect` calls (radar velocity sync, BT audio activation, game data loading, my-team lineup load, team players load, current pitcher auto-set, pitcher pitch types fetch, TeamAtBat modal auto-show, viewer role redirect, pitcher game pitch count)
- All derived constants (game, gameMode, isScoutingMode, scoutingBattingSide/PitchingSide, scoutingFocus, shouldSkipHalf, activeBatters, lineupSize, balls/effectiveStrikes/strikes, isReadOnly, filteredGamePitches, previousAtBatsForCurrentBatter, hasPreviousAtBats, hasRunnersOnBase, isUserBatting, canStartAtBat, activePitcherDisplay, activeBatterDisplay)

### What stays in `live.tsx`

- All `useCallback` handlers (~25): updateScoreForRuns, startAtBatForBatter, findNextActiveBatter, findInningLeadoffBatter, advanceInningWithRuns, handleEndAtBat, handleInningChangeConfirm, handleSkipHalf, handleTeamAtBatConfirm, handleSelectPitcher, handleSelectBatter, handleEndGame, handleToggleHomeAway, handleStartAtBat, handleSendCall, handleResendCall, handleChangeCall, handleShake, handleTalkPressIn, handleTalkPressOut, handleEditLastPitchResult, handleUndoLastPitch, handleLogPitch, handleInPlayResult, handleRunnerAdvancementConfirm, handleRecordBaserunnerOut, handleRecordAdvancement, handleDoublePlayConfirm, handleRunnerPress
- All render helpers (renderPitchTypeFilterBar, renderPitchBreakdown, renderZoneTapHint, renderActualEqualsTargetButton, renderGameHeader, renderAtBatControls, renderModals, renderRunnerOutButton)
- Both render paths (tablet landscape and phone portrait)
- StyleSheet

### Why not move handlers too?

Two reasons:
1. **Handlers reference toast/confirm + Haptics + every state value.** Moving them all to the hook would require either passing toast/confirm into the hook (already done — they're called via the same hook) OR exporting all setters and having handlers re-declared with explicit dependencies. The first works but bloats the hook; the second is roughly equivalent code. The component-level handlers keep using closure-based access to destructured values from the hook — same end result, half the boilerplate.
2. **Incremental safety.** Doing hook + handlers + JSX split all in one batch would have been a ~1500-line refactor. Splitting at this boundary lets us verify the hook works (TS + Jest both clean), commit, then continue.

The web pattern splits state vs. actions; mobile combines them into one hook for now. If a future change wants the split, refactor at that point.

## Scope — files touched

### packages/mobile (v2.13.0 → v2.14.0)

- NEW `app/game/[id]/useLiveGameController.ts` (562 lines) — the hook + exported `LiveGameController` type.
- MODIFIED `app/game/[id]/live.tsx`:
  - Trimmed imports: removed `useState`, `useEffect`, `useRef`, `useLocalSearchParams`, `useTheme`, `useToast`, `useConfirm`, `useDeviceType`, `useOfflineActions`, `useStalkerRadar`, `useGameWebSocket`, `useAppDispatch`, `useAppSelector`, `useGameWebSocket`. Removed several action creators only used in extracted effects (fetchCurrentGameState, fetchTeamPlayers, fetchTeamPitcherRoster, fetchGamePitchers, fetchBaseRunners, updateAtBat). Removed several type imports only used by extracted state (GamePitcherWithPlayer, isOutResult, getNextBatter, GameMode, deriveGameMode, ABBREV_TO_PITCH_TYPE). Removed `activateBTAudio`/`forceDeactivateBTAudio` (extracted to hook).
  - Replaced the 430-line state/effects/derived block with `const ctl = useLiveGameController()` + an 80-name destructure.
  - Removed duplicate derived-value declarations that the hook now provides: `isReadOnly`, `filteredGamePitches`, `previousAtBatsForCurrentBatter`, `hasPreviousAtBats`, `hasRunnersOnBase`, `canStartAtBat`, `activePitcherDisplay`, `activeBatterDisplay`.
  - Removed the `useGameWebSocket(...)` call (extracted to hook).
  - Net: live.tsx went 2921 → 2739 lines (-182).
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Prettier on touched files.

**Smoke (manual — same behaviors as before, just reorganized):**

1. Open Live Game → loading state renders → game state loads → header + StrikeZone + result row all appear with correct data.
2. Log a pitch — state updates as before (count flips, pitches array appends, snackbar EDIT appears).
3. Switch pitcher → state propagates → pitch count updates.
4. Open Pitcher / Hitter Tendencies modals → state-driven visibility works.
5. Toggle home/away with pitches logged → confirm dialog appears → server flip → state syncs.

## Out of scope (deferred — C continuation 2)

- **Split JSX into layout components** — `LiveGameTablet`, `LiveGamePhone`, `LiveGameModals`, `LiveGameCallControls`, `LiveGameResultPanel`. Each takes the hook return as props. Goal: trim live.tsx to a thin orchestrator (~100 lines) that delegates to the layout components.
- **Move handlers into the hook (or a sibling `useLiveGameActions` hook)** — optional polish. The current closure-based pattern works; moving handlers would deepen the testability split but is not load-bearing.
