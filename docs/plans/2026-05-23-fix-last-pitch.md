# Fix Last Pitch — result-only edit of the most recent pitch

**Status:** Approved · in progress
**Phase:** UX Audit Phase 1, item #2 (biggest single user-visible win)
**Findings addressed:** `UX-LG-01`, `UX-LG-22`, `UX-LG-09`

## Context

The biggest mid-inning friction source: a mis-tapped result (e.g., the coach taps "Ball" when the pitch was a called strike) requires a 6–8-tap Undo + full re-entry of pitch type, zone, location, velocity, and the correct result. The audit ranked this as the #1 individual user-visible win behind the Snackbar foundation.

The Snackbar infrastructure landed in `2026-05-23-snackbar-foundation.md` — it has an `action` slot on every toast. Wiring an "Edit" action into the post-log toast turns a 6–8-tap repair into 2 taps.

## Plan (Decisions)

### Server-side: `PATCH /bt-api/pitches/:id` (result-only)

Body: `{ pitch_result: PitchResult }`.

Scope **deliberately narrow** to avoid having to unwind at-bat / game lifecycle changes:

- Pitch must be the most recent in its at-bat (409 otherwise).
- Both the old and new results must be non-AB-ending: `ball`, `called_strike`, `swinging_strike`, `foul`. If either is `hit_by_pitch`, `in_play`, or would trip the 4-ball / 3-strike threshold given the snapshot count, **reject with 409** and a `code: 'AB_BOUNDARY'` hint. Client falls back to the existing Undo flow for those.
- Single transaction: update `pitches.pitch_result`, recompute `at_bats.balls` / `at_bats.strikes`, mark scouting tendencies stale (same hook the original log/undo use). No baserunner events, no score recomputation — those only fire on AB-end results, which this endpoint excludes.

This covers the most common mis-tap (Strike ↔ Ball, Called ↔ Swinging, Foul ↔ Strike) without re-implementing the entire pitch lifecycle. AB-end-boundary cases stay on the existing Undo path until a future iteration.

### Client UX

After logging a pitch, the live screen shows a 5-second toast:

```
Pitch logged · EDIT
```

Tapping **EDIT** opens a small `EditResultModal` with the 6 result chips. Tapping the new result calls `PATCH /pitches/:id`. On success, a confirmation toast shows the change (`"Strike → Ball"`). On 409 (`AB_BOUNDARY`), an info toast steers the coach to Undo (`"Use Undo for this — count crossed a boundary"`).

The existing Undo button stays as-is (handles the boundary cases).

### Shared types

`PitchResult` already exists. Add one new request DTO `UpdatePitchResultRequest` in shared so api/mobile/web are typed identically. No DB migration.

## Scope — files touched

### packages/shared (no version bump — see `feedback_no_shared_version_bumps`)

- MODIFIED `src/index.ts` — add `UpdatePitchResultRequest` interface.
- Run `npm run build` after.

### packages/api (vX.Y.Z → vX.Y.Z+1, follow existing api versioning)

- MODIFIED `src/routes/pitch.routes.ts` — add `router.patch('/:id', ...)`.
- MODIFIED `src/controllers/pitch.controller.ts` — new `updatePitchResult` method.
- MODIFIED `src/services/pitch.service.ts` — new `updatePitchResult(pitchId, newResult)` method with the validation rules above.
- MODIFIED `src/__tests__/pitch.routes.test.ts` (if exists) — coverage for: success, 404, 409 not-latest, 409 AB-boundary cases.
- MODIFIED `package.json` if api is versioned.

### packages/mobile (v2.9.0 → v2.10.0)

- NEW `src/components/live/EditResultModal/EditResultModal.tsx` + `index.ts` — Paper Modal with 6 result chips; renders the previous result distinctly.
- MODIFIED `src/state/games/api/gamesApi.ts` — new `updatePitchResult(pitchId, result)` method.
- MODIFIED `src/state/games/gamesSlice.ts` — new `updateLastPitchResult` thunk + reducer to merge update into local `pitches`.
- MODIFIED `app/game/[id]/live.tsx` — after a successful log, fire `toast.show({ action: { label: 'Edit', onPress: () => openEditModal(lastPitchId) }, duration: 5000 })`. Add `<EditResultModal>` instance. Wire up the success/409 handling.

### packages/web (v1.20.0 → v1.21.0)

- NEW `src/components/live/EditResultModal/EditResultModal.tsx` + `styles.ts` + `index.ts` — Emotion modal mirroring mobile.
- MODIFIED `src/state/games/api/gamesApi.ts` — `updatePitchResult` method.
- MODIFIED `src/pages/LiveGame/useLiveGameActions.ts` — after `logPitch` succeeds, fire `toast.show({ action })`. Wire up the modal.

## Verification

- API: `cd packages/api && npm test` — pitch.routes.test.ts covers success + both 409 paths.
- Mobile: `npx tsc --noEmit`, `npm test`.
- Web: `npx tsc --noEmit`, `npx eslint`.
- Prettier on all touched.
- Smoke (manual):
  1. Log Ball at 0-0 → toast appears with EDIT. Tap EDIT → pick "Called Strike" → pitch updates, count flips to 0-1. Confirm in DB.
  2. Log Called Strike at 2-2 → tap EDIT → pick "Ball" → succeeds, count → 1-2. Pick "Swinging Strike" → would be 3rd strike → 409 → toast suggests Undo.
  3. Walk a batter (4th ball) → tap EDIT → 409 (AB ended) → toast suggests Undo.

## Out of scope (deferred)

- AB-end-crossing edits — would need to wrap undo+re-log in a single transaction; significant refactor; covered today by the Undo button.
- Editing pitch type / zone / velocity — explicit non-goal per the audit (`UX-LG-01` is **result-only**). If a coach mis-tapped the type, Undo + re-enter is correct.
- Editing pitches before the most recent — the audit's "last pitch only" constraint stands.
- Optimistic UI — wait for the PATCH to return before updating local state. Adds a sub-second delay but keeps state truthful.
