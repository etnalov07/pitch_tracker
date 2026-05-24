# Fix Last Pitch — result-only PATCH + snackbar Edit action · 2026-05-23

**Type:** `feat`
**Commit:** `9b2a8fd`
**Versions:** `api@1.15.0 → 1.16.0` · `mobile@2.9.0 → 2.10.0` · `web@1.20.0 → 1.21.0`

## Context

The biggest mid-inning friction source per the UX audit: a mis-tapped result (Strike-vs-Ball especially) required Undo + full re-entry of pitch type / zone / location / velocity / correct result — 6–8 taps to fix one wrong tap. Now it's two taps: **EDIT** in the post-log toast, then the correct result chip.

Findings addressed: `UX-LG-01`, `UX-LG-22`, `UX-LG-09`. This is Phase 1 item #2 of the UX audit. Depends on the Snackbar foundation that landed in `2026-05-23-snackbar-foundation.md`.

## Plan (Decisions)

Scoped deliberately narrow: result-only PATCH for the most-recent pitch in its at-bat, **only when neither the old nor new result crosses an at-bat-ending boundary** (4th ball / 3rd strike / `in_play` / `hit_by_pitch`). Boundary cases get a 409 with `code: 'AB_BOUNDARY'`; the client surfaces an info toast steering the coach to Undo (which already fully reverses lifecycle state).

Why narrow: editing across AB-end boundaries would require unwinding at-bat completion, runner advancement, and score updates — that's effectively a full undo + relog. The existing Undo path already handles this cleanly. Scoping the new endpoint to non-boundary cases gets the most common mis-tap (Strike ↔ Ball in mid-AB) covered with minimal new surface.

Full plan: [`docs/plans/2026-05-23-fix-last-pitch.md`](../plans/2026-05-23-fix-last-pitch.md).

## What shipped

### packages/shared

- MODIFIED `src/index.ts` — added `UpdatePitchResultRequest` interface + `PitchUpdateErrorCode` union (`'AB_BOUNDARY' | 'NOT_LATEST' | 'NO_PREV_STATE'`).
- Rebuilt with `npm run build`.

### packages/api (v1.16.0)

- MODIFIED `src/routes/pitch.routes.ts` — new `router.patch('/:id', pitchController.updatePitchResult.bind(pitchController))`.
- MODIFIED `src/controllers/pitch.controller.ts` — new `updatePitchResult` method; validates `pitch_result` in body; surfaces `error.status` and `error.code` to the response.
- MODIFIED `src/services/pitch.service.ts` — new `updatePitchResult(pitchId, newResult)` service method. Single transaction. Validation: 404 if missing, 400/NO_PREV_STATE for legacy rows, 409/NOT_LATEST if not the most recent pitch, 409/AB_BOUNDARY if either old or new result would cross 4-ball / 3-strike / in_play / hit_by_pitch. On success, updates `pitches.pitch_result` + recomputes `at_bats.balls`/`strikes` + invalidates opponent batter scouting cache.

### packages/mobile (v2.10.0)

- NEW `src/components/live/EditResultModal/EditResultModal.tsx` + `index.ts` — Paper Portal/Modal with all 6 result chips; current result rendered disabled with "current" tag.
- MODIFIED `src/components/live/index.ts` — re-export `EditResultModal`.
- MODIFIED `src/state/games/api/gamesApi.ts` — new `updatePitchResult(pitchId, pitchResult)` method that throws `Error` with `.status`/`.code` so callers can route 409/AB_BOUNDARY to a "use Undo" toast.
- MODIFIED `src/state/games/gamesSlice.ts` — new `updatePitch` reducer (merge updated pitch into local `state.pitches` by id) + export.
- MODIFIED `src/state/index.ts` — re-export `updatePitch`.
- MODIFIED `src/hooks/useOfflineActions.ts` — `logPitchOffline` return type extended with `pitch?: Pitch` so callers can reference the just-logged id.
- MODIFIED `app/game/[id]/live.tsx`:
  - `editResultPitch` / `editResultModalVisible` local state.
  - `handleEditLastPitchResult` callback: calls PATCH, dispatches `updatePitch` + `setCurrentAtBat`, bumps `statsRefreshTrigger`, toasts success or routes 409 cases to info/error toast.
  - Post-log: `toast.show({ action: { label: 'EDIT', onPress: ... }, duration: 5000 })`.
  - Mount `<EditResultModal>` in both tablet-landscape and phone-portrait return paths.

### packages/web (v1.21.0)

- NEW `src/components/live/EditResultModal/EditResultModal.tsx` + `styles.ts` + `index.ts` — Emotion-styled modal mirroring mobile; backdrop-click + Esc to dismiss; current result rendered disabled.
- MODIFIED `src/state/games/api/gamesApi.ts` — `updatePitchResult` method with status/code-aware error wrapping.
- MODIFIED `src/pages/LiveGame/useLiveGameState.ts` — new `editResultPitch` / `showEditResultModal` state + setters added to the returned hook surface.
- MODIFIED `src/pages/LiveGame/useLiveGameActions.ts`:
  - Destructure new state setters.
  - Post-log: `toast.show({ action: { label: 'EDIT', onPress: ... } })`.
  - New `handleEditLastPitchResult` returned from the hook.
- MODIFIED `src/pages/LiveGame/LiveGame.tsx` — destructure new state; mount `<EditResultModal>`; wire `onSelect={actions.handleEditLastPitchResult}`.

## Verification

**Type + lint + test:**

- `cd packages/api && npx tsc --noEmit` — clean.
- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/web && npx tsc --noEmit` — clean.
- `cd packages/web && npx eslint ...` — clean after `--fix` resolved one import-order warning.
- `cd packages/mobile && npm test` — 12/12 pass.
- `cd packages/api && npm test` — **504/527 pass**, same 23 failures pre-exist in `scoutingFlow.integration.test.ts` (DB-integration test that requires a real database connection; verified failures occur on `git stash`-clean tree as well).
- Prettier `--write` on all touched files.

**Smoke (manual):**

1. Mobile/web: Log a Ball at 0-0 → toast "Logged: ball · EDIT" → tap EDIT → pick "Called Strike" → toast "Updated: ball → called strike" → count flips to 0-1.
2. Log Called Strike at 2-2 → tap EDIT → pick "Ball" → succeeds, count → 1-2.
3. Log Called Strike at 2-2 → tap EDIT → pick "Swinging Strike" → 409/AB_BOUNDARY (would be 3rd strike) → info toast "use Undo for this".
4. Walk a batter (4th ball) → toast EDIT → 409/AB_BOUNDARY (old pitch ended AB) → same info toast.

## Out of scope (deferred)

- AB-end-crossing edits — covered by the existing Undo button; combining undo+re-log into one PATCH would need a service-level refactor and is its own item.
- Editing pitch type / zone / velocity — explicit non-goal per `UX-LG-01` ("result-only").
- Editing earlier pitches in the same at-bat — "last pitch only" constraint stands.
- Optimistic UI — we wait for the PATCH to return before updating local state.
- Pitch route unit tests for the new PATCH path — codebase has no `pitch.routes.test.ts`; the integration test infra needs a DB. Followup if/when DB-backed test infra returns.
