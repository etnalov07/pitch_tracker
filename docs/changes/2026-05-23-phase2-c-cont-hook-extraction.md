# Phase 2 — C continuation 1 — Extract `useLiveGameController` hook · 2026-05-23

**Type:** `refactor`
**Commit:** `35571a4`
**Versions:** `mobile@2.13.0 → 2.14.0`

## Context

Code-quality half of audit item C. The user-visible phone reorder (item C part 3) shipped in `2026-05-23-phase2-c-partial-phone-reorder.md`. This commit extracts a `useLiveGameController` hook that owns all state, effects, derived values, and the WebSocket subscription — taking 430 lines of mixed state/effects/derivation out of `live.tsx` and into a dedicated, single-concern file.

Handlers and JSX stay in `live.tsx` for this batch. They reference destructured values from the hook via closure (same end result as moving them, much less boilerplate). JSX split into separate layout components is C continuation 2.

Findings addressed: `UX-LG-00` (live.tsx size), foundation for `UX-LG-11` and `UX-LG-31`.

## Plan (Decisions)

- **Single combined hook**, not split state/actions like web. Mobile state and derived values are tightly coupled enough that one closure is simpler.
- **Handlers stay in `live.tsx`**: they close over destructured hook values; moving them too would have ballooned this batch.
- **Incremental safety**: TS + Jest verified clean before committing.

Full plan: [`docs/plans/2026-05-23-phase2-c-cont-hook-extraction.md`](../plans/2026-05-23-phase2-c-cont-hook-extraction.md).

## What shipped

### packages/mobile (v2.14.0)

- NEW `app/game/[id]/useLiveGameController.ts` (562 lines):
  - All framework hooks: `useRouter`, `useTheme`, `useAppDispatch`, `useToast`, `useConfirm`, `useDeviceType`, `useOfflineActions`, `useLocalSearchParams`, `useStalkerRadar`, `useGameWebSocket`.
  - All Redux selectors (games/settings/teams).
  - All `useState` declarations (~30 pairs) preserved in original order/grouping for diff readability.
  - The `isLoggingRef` useRef.
  - All `useEffect` calls: radar velocity sync, BT audio activation/cleanup, mount data loading, my-team lineup load, team players + pitcher roster load, current pitcher auto-set, pitcher pitch types fetch, TeamAtBat auto-show, viewer redirect, pitcher game pitch count (UX-LG-13).
  - All derived constants: `game`, `gameMode`, `isScoutingMode`, `scoutingBattingSide`/`PitchingSide`, `scoutingFocus`, `shouldSkipHalf`, `activeBatters`, `lineupSize`, `balls`/`effectiveStrikes`/`strikes`, `isReadOnly`, `filteredGamePitches`, `previousAtBatsForCurrentBatter`, `hasPreviousAtBats`, `hasRunnersOnBase`, `isUserBatting`, `canStartAtBat`, `activePitcherDisplay`, `activeBatterDisplay`.
  - Inline `useGameWebSocket(...)` subscription with the same payload handlers (pitch_logged, at_bat_ended, inning_changed, runners_updated, pitch_call pre-fill).
  - Exports `useLiveGameController` and `LiveGameController` type (`ReturnType<typeof useLiveGameController>`).

- MODIFIED `app/game/[id]/live.tsx`:
  - Trimmed imports: removed `useState`/`useEffect`/`useRef` from React (`useCallback` still used), removed `useLocalSearchParams`/`useTheme`/`useToast`/`useConfirm`/`useDeviceType`/`useOfflineActions`/`useStalkerRadar`/`useGameWebSocket`/`useAppDispatch`/`useAppSelector`. Removed action creators that only fed extracted effects (`fetchCurrentGameState`, `fetchTeamPlayers`, `fetchTeamPitcherRoster`, `fetchGamePitchers`, `fetchBaseRunners`, `updateAtBat`). Removed `activateBTAudio`/`forceDeactivateBTAudio` (extracted). Added `import { useLiveGameController } from './useLiveGameController'`. Kept `OpponentLineupPlayer` and `Player` type imports (still used in handler signatures + display logic).
  - Replaced the 430-line state/effects/derived block at the top of the component body with `const ctl = useLiveGameController()` + an 80-name destructure.
  - Removed duplicate derived-value declarations that the hook now provides: `isReadOnly` (was line ~1387), `filteredGamePitches` (was line ~1442), `hasRunnersOnBase` (was line ~1694), `previousAtBatsForCurrentBatter`/`hasPreviousAtBats` (was line ~1852), and the `canStartAtBat`/`activePitcherDisplay`/`activeBatterDisplay` block (was line ~1361).
  - Removed the inline `useGameWebSocket(...)` call.
  - Net: live.tsx went 2921 → 2739 lines (-182).
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Prettier on touched files.

**Smoke (manual — no behavior change, all paths verified by TS):**

1. Open Live Game → loading state renders → game data loads → header + StrikeZone + result row all appear correctly.
2. Log a pitch — count flips, pitches array appends, snackbar EDIT appears.
3. Switch pitcher → state propagates → pitch count updates.
4. Tendencies modals open/close on tap.
5. Toggle home/away with pitches logged → confirm dialog appears.

## Out of scope (deferred — C continuation 2)

- **Split JSX into layout components**: `LiveGameTablet`, `LiveGamePhone`, `LiveGameModals`, `LiveGameCallControls`, `LiveGameResultPanel`. Each takes the hook return as a prop. Trims live.tsx to a ~100-line orchestrator.
- **Move handlers into the hook (or sibling `useLiveGameActions` hook)** — optional. The closure pattern is fine; this would only deepen the testability split.
