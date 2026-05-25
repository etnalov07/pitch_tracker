# Phase 2 B — Pitch Calling Consolidation · 2026-05-25

**Type:** `refactor` (B1) + `feat` (B2, B3, B4)
**Commits:** `9a24d86` (B1) · `d273231` (B2) · `53533a8` (B3) · `4219a8f` (B4)
**Versions:** `mobile@2.28.0 → 2.32.0` · `api@1.19.0 → 1.21.0` (one minor bump per sub-commit that touched the package)

## Context

Phase 2 item B from the UX audit (`docs/plans/2026-05-23-ux-audit.md` lines 305–318, summary table line 485) — the audit's biggest structural debt. Pitch calling had **two parallel implementations** that drifted:

- **`/live`** — inline SEND row + active-call badge on the live-game screen. Used by most coaches. Recorded 6-bucket pitch results but only sent 4-bucket call results.
- **`/pitch-calling`** — dedicated screen with navy/amber scoreboard aesthetic and its own duplicate components (`CallPitchTypeGrid`, `CallZoneGrid`, `CallResultButtons`, `WalkieTalkieButton`, `BluetoothStatus`, `CallHistory`). Stale entry point; ~471 lines that overlapped with /live.

The drift left three correctness problems: a lossy call-result enum (called_strike + swinging_strike collapsed to 'strike', hit_by_pitch to 'ball'), no explicit pitch ↔ pitch_call link, and a fake "transmitted" indicator (sender device fired it after local TTS, regardless of whether any catcher actually received the call).

Forward-design plan: see `C:\Users\brian\.claude\plans\wobbly-napping-glade.md` (planning session for this work).

Findings covered: **UX-PC-01, UX-PC-02, UX-PC-04, UX-PC-05, UX-PC-07, UX-PC-08, UX-PC-09, UX-PC-11**.

## Plan (Decisions)

User-confirmed during planning:

1. **Keep `/live`, delete `/pitch-calling`.** All coach pitch-calling stays inline on the live screen. Navy/amber palette is lifted into `theme.colors.scoreboard.*` tokens first so the aesthetic survives.
2. **Ship as 4 sub-commits**, Phase 2 E pattern. Each independently revertible.
3. **Include the transmission ack pipeline.** Catcher-side POST + new WS event + coach-side ✓ Received pill.

Key tradeoffs:

- B2 backfilled legacy `result = 'strike'` rows to `'called_strike'` — conservative, since without pitch context we can't distinguish swinging.
- B4 uses `viewer.tsx` as the canonical "catcher" screen. If a catcher uses `/live` instead, the ✓ pill never lights up (truthful — no real ack), and that's an acceptable v1 trade. A device-id-aware ack would let `/live`'s WS handler distinguish sender from receiver; deferred.

## What shipped

### B1 — Delete `/pitch-calling`, lift navy/amber to theme tokens (`9a24d86`, mobile 2.28.0 → 2.29.0)

Addresses **UX-PC-01**, **UX-PC-02**, **UX-PC-08**, **UX-PC-11**.

**packages/mobile**

- **DELETE** `app/game/[id]/pitch-calling.tsx` (471 lines).
- **DELETE** `src/components/pitchCalling/{CallPitchTypeGrid,CallZoneGrid,CallResultButtons,CallHistory,WalkieTalkieButton,BluetoothStatus}/` (the six duplicate components) and the barrel `index.ts`. The `pitchCalling` folder is removed entirely.
- **KEEP** the audio plumbing utilities (`src/utils/pitchCallAudio.ts`, `walkieTalkie.ts`, `bluetoothAudio.ts`) — `/live` consumes them via the inline talkHoldButton.
- **EDIT** `src/styles/theme.ts` — add `colors.scoreboard.*` (`navy`, `navyLight`, `amber`, `chalk`, `chalkDim`, `border`) lifted verbatim from the deleted screen.
- **EDIT** `app/game/[id]/liveGameStyles.ts` — adopt scoreboard tokens on the active-call badge: navy bg + amber border + chalk text (replaces the green `semantic.successBg` tint). The SEND button keeps its existing amber so the visual rhythm stays.
- **UX-PC-11** verified — `/live`'s `PitchTypeGrid` already filters by `pitcherPitchTypes` when `gameMode !== 'opp_pitcher'`, and SEND inherits the same `selectedPitchType` state, so no code change needed for arsenal-aware calling.
- The `pitchCallingSlice` and `pitchCallingApi` are untouched (still consumed by `pitch-call-analytics.tsx`).

### B2 — pitch_calls.result 6-bucket enum + pitch_id link (`d273231`, api 1.19.0 → 1.20.0, mobile 2.29.0 → 2.30.0)

Addresses **UX-PC-04**, **UX-PC-05**.

**packages/shared** (rebuild required; version unchanged per memory)

- `PitchCallResult` extended to `'ball' | 'called_strike' | 'swinging_strike' | 'foul' | 'in_play' | 'hit_by_pitch'` — 1:1 with `PitchResult`, no information loss.
- `PitchCallGameSummary.results`, `GameCallAnalytics.results`, `SeasonCallAnalytics.results` shapes updated from 4 keys to 6.

**packages/api**

- **NEW migration `047_pitch_calls_result_enum_expand.sql`** — backfills legacy `result = 'strike'` to `'called_strike'`, then adds a CHECK constraint `result IS NULL OR result IN ('called_strike','swinging_strike','ball','foul','in_play','hit_by_pitch')`.
- `pitchCall.service.ts` — `validResults` expanded to 6; `getGameSummary` results object expanded; strike-counting helper `isStrike(r)` counts both called + swinging toward strike totals in pitch-type / zone breakdowns.
- `pitchCallAnalytics.service.ts` — `getGameAnalytics` local results bucket expanded; `getSeasonAnalytics` SQL `COUNT(CASE WHEN ...)` expressions split `strike` into `called_strikes` + `swinging_strikes` and add `hit_by_pitches`. Return shape updated.
- Tests `pitchCall.routes.test.ts` + `pitchCallAnalytics.routes.test.ts` — mock rows and assertions updated to the new enum + columns. 25/25 pass.

**packages/mobile**

- `app/game/[id]/useLiveGameActions.ts` — removed the 4-bucket coercion (`called_strike|swinging_strike → 'strike'`, `hit_by_pitch → 'ball'`). Now passes `effectiveResult` directly and `logResult.pitch?.id` as the third arg, so `pitch_calls.pitch_id` is populated explicitly. Closes UX-PC-05.
- `app/game/[id]/pitch-call-analytics.tsx` — Strike chip aggregates `called_strike + swinging_strike`; added an HBP chip for `hit_by_pitch`.

**packages/web**

- `src/pages/LiveGame/useLiveGameActions.ts` — `toPitchCallResult` collapsed to an identity cast (kept as a thin wrapper for clarity at the `linkPitch` call site).

### B3 — Unify Change semantics on /live (`53533a8`, mobile 2.30.0 → 2.31.0)

Addresses **UX-PC-07**.

**packages/mobile**

- `app/game/[id]/useLiveGameActions.ts` `handleChangeCall` — imports `ABBREV_TO_PITCH_TYPE` and pre-fills `selectedPitchType` from `activeCall.pitch_type` and `targetZone` from `activeCall.zone` before clearing `activeCall`. Mirrors the deleted `/pitch-calling` screen's Change semantics (which were the correct ones).
- `app/game/[id]/LiveGameTablet.tsx` + `LiveGamePhone.tsx` — destructured `changingCallId` from `ctl`; SEND button label flips between `SEND: …` and `SEND CHANGE: …` based on `changingCallId`.

Before: coach tapped Change → had to repick both pitch type and zone. After: both are pre-selected; the coach tweaks one.

### B4 — Transmission ack pipeline (`4219a8f`, api 1.20.0 → 1.21.0, mobile 2.31.0 → 2.32.0)

Addresses **UX-PC-09**.

**packages/shared** (rebuild required)

- `WsMessageType` extended with `'pitch_call_transmitted'`.

**packages/api**

- `pitchCall.service.ts` `markTransmitted` — after the UPDATE, fires `pg_notify('game_<id>', { type: 'pitch_call_transmitted', id, game_id })` so the sender's device gets a real ack event.

**packages/mobile**

- `app/game/[id]/viewer.tsx` — imports `pitchCallingApi`; subscribes to the `pitch_call` WS event and POSTs `markTransmitted(payload.id)`. This is the only legitimate ack path now.
- `app/game/[id]/useLiveGameController.ts` — subscribes to the new `pitch_call_transmitted` event; on receive, flips local `activeCall.bt_transmitted` via `setActiveCall((prev) => prev && prev.id === id ? { ...prev, bt_transmitted: true } : prev)` (no-op if this device didn't send the call).
- `app/game/[id]/useLiveGameActions.ts` — `handleSendCall` and `handleResendCall` STOP firing `pitchCallingApi.markTransmitted(call.id)`. That was the false-ack source — coach's local TTS finishing said nothing about the catcher receiving anything.
- `app/game/[id]/LiveGameTablet.tsx` + `LiveGamePhone.tsx` — active-call badge text appends `  ✓ Received` when `activeCall.bt_transmitted` is true.

Behavior: if no catcher is on `/viewer` for the game, the ✓ pill never lights up — accurate, no more lie.

## Verification

- `cd packages/shared && npm run build` clean after B2 and B4.
- `cd packages/api && npx tsc --noEmit` clean after every sub-commit.
- `cd packages/mobile && npx tsc --noEmit` clean after every sub-commit.
- `cd packages/web && npx tsc --noEmit` clean after B2.
- `cd packages/api && npm test -- --testPathPatterns=pitchCall` — 25/25 pass.
- `cd packages/mobile && npm test` — 12/12 pass after every sub-commit.
- `npx prettier --write` on all changed files — clean.

Manual (deferred to dev / TestFlight):

1. **`/pitch-calling` is gone** — navigating to `/game/<id>/pitch-calling` hits the not-found screen.
2. **Coach flow on `/live`**: select pitch type + target zone → SEND row appears (navy/amber active-call badge after sending). Tap SEND. Log a pitch via `ResultButtons`. Verify `pitch_calls.result` matches the 6-value pitch result (e.g. `swinging_strike`, not `strike`) and `pitch_calls.pitch_id` is non-null.
3. **Change flow**: tap CHANGE on the active-call badge → SEND row reappears with pitch + zone pre-selected → SEND CHANGE label visible → tap a new zone → SEND CHANGE → new active-call badge.
4. **Ack pipeline**: open `/game/<id>/viewer` on a second device → send a call from coach → ✓ Received pill appears on coach's badge within ~100ms.
5. **Backfill check**: `SELECT result, COUNT(*) FROM pitch_calls GROUP BY result;` — legacy `'strike'` rows are now `'called_strike'`.

## Phase 2 status after this batch

| Item  | Title                           | Status                     |
| ----- | ------------------------------- | -------------------------- |
| A     | Design tokens                   | Shipped                    |
| **B** | **Pitch calling consolidation** | **Shipped**                |
| C     | Live screen refactor            | Shipped                    |
| D     | New Game flow alignment         | Pending (needs user input) |
| E     | In-play modal cleanup           | Shipped                    |
| F     | Tendencies side-by-side         | Shipped                    |
| G     | Snackbar lib eval               | Closed                     |
| H     | Scoreboard aesthetic            | Declined                   |
| I     | Bullpen feature parity          | Pending                    |
| J     | Mobile role routing             | Shipped                    |
| K     | Heat-zone parity                | Shipped                    |

## Out of scope (deferred)

- **UX-PC-03** (SEND disabled when BT not connected) — `/live`'s SEND doesn't have the same hard `disabled={!btConnected}` gate that `/pitch-calling` had, so this is effectively resolved by B1. Confirm in manual test.
- **UX-PC-06** (TTS skip button) — UX polish, no data-model implication.
- **UX-PC-10** (back-button color in dark mode) — moot, the offending screen is deleted.
- **UX-PC-12** (visible "talking" indicator during TTS) — UX polish.
- **Device-id-aware ack** — if catcher uses `/live` (not `/viewer`), the ✓ pill won't light up. Adding a `sender_user_id` filter on the `pitch_call` WS handler would let `/live` act as both coach and catcher cleanly. Defer.
- **Web pitch-calling parity** — web's `LiveGame` has no SEND row today (only `SituationalCallsRow`). Web stayed untouched apart from B2's enum/identity-cast cleanup.
- **Bumping `packages/shared`'s version** (per memory: never bump shared; api/web/mobile pin at 1.0.0).
