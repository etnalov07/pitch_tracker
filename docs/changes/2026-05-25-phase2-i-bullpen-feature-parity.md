# Phase 2 I — Bullpen Feature Parity · 2026-05-25

**Type:** `feat` (I1, I2) + `fix` (I3)
**Commits:** `cb8f3f9` (I1) · `605c1eb` (I2) · `2835873` (I3)
**Versions:** `api@1.21.0 → 1.22.0` · `web@1.28.0 → 1.30.0` · `mobile@2.33.0 → 2.36.0`

## Context

Phase 2 item I from the UX audit (`docs/plans/2026-05-23-ux-audit.md` lines 399–432, summary table line 492). Bullpen had three drift problems:

- **Mobile couldn't author plans** — web shipped `BullpenPlans` + `BullpenPlanEditor` (plan CRUD, ordered pitch sequence with target zones + instructions, pitcher assignments). Mobile could only run pre-existing plans. A coach who showed up to bullpen and wanted to tweak a plan needed a laptop.
- **No Undo on bullpen live** — Live Game had Undo, bullpen didn't. Same fat-finger risk on a 30-pitch session.
- **Load-bearing 'called_strike' fallback** — both web and mobile mapped `BullpenPitch.result || 'called_strike'` when building the StrikeZone preview. Unscored pitches lied as strikes, inflating perceived strike rate.

User-confirmed scope:

1. **Build the mobile plan editor** — close the audit's biggest pain point in I.
2. **3 sub-commits** — I1 mobile editor, I2 Undo on both platforms, I3 fallback fix + Command Grade verify.

Findings covered: **UX-BP-02, UX-BP-10, UX-BP-13, UX-BP-14**.

## What shipped

### I1 — Mobile bullpen plan editor (`cb8f3f9`, mobile 2.33.0 → 2.34.0)

Addresses **UX-BP-10**.

**packages/mobile**

- **NEW** `app/bullpen/plans/index.tsx` — plan list (Expo Router auto-routes). Loads team plans, renders one card per plan (name, description, pitch count + max, assigned-pitcher count), Create button in the header. Tap card → editor; trash icon → confirm + delete + refresh. `useFocusEffect` refreshes when returning from the editor.
- **NEW** `app/bullpen/plans/[id].tsx` — plan editor. `id='new'` → create mode; otherwise edit. Plan metadata fields (name, description, max pitches), ordered pitch sequence builder (pitch-type picker via Paper `Menu`, optional target zone via inline `StrikeZone`, instruction text, up/down/remove icon buttons), and a pitcher-assignment list (`Checkbox` rows filtered to `primary_position === 'P' && is_active !== false`).
- `src/state/bullpen/api/bullpenApi.ts` — added `createPlan`, `updatePlan`, `deletePlan`, `assignPlan`, `unassignPlan` to mirror web's `bullpenService`. Existing `getTeamPlans` / `getPlan` / `getPitcherAssignments` reused as-is.
- `app/bullpen/new.tsx` — small "Manage" button next to the "Bullpen Plan (optional)" label, navigating to `/bullpen/plans?teamId=X`. Only entry point needed; everything else flows naturally.

### I2 — Undo last bullpen pitch (`605c1eb`, api 1.21.0 → 1.22.0, mobile 2.34.0 → 2.35.0, web 1.28.0 → 1.29.0)

Addresses **UX-BP-13**.

**packages/api**

- **NEW** `DELETE /bullpen/pitches/:id` endpoint (route + controller + service). `bullpen.service.deletePitch(pitchId)` is a straightforward `DELETE FROM bullpen_pitches WHERE id = $1 RETURNING *`; returns the deleted row or null. No cascading concerns — `bullpen_pitches` has no children.

**packages/mobile**

- `src/state/bullpen/api/bullpenApi.ts` — `deletePitch(pitchId)` wrapper.
- `app/bullpen/[id]/live.tsx` — `handleUndoLastPitch`: confirms via the existing `useConfirm` hook ("Undo pitch #N (pitch type)?"), calls `bullpenApi.deletePitch(last.id)`, then refetches both `fetchSessionPitches` + `fetchBullpenSession` so the strike/ball/total counters re-derive. Outlined red "Undo Last Pitch" Button rendered below "Log Pitch" when `pitches.length > 0 && !isLogging`.

**packages/web**

- `src/services/bullpenService.ts` — `deletePitch(pitchId)` wrapper.
- `src/pages/BullpenLive/BullpenLive.tsx` — `handleUndoLastPitch`: `window.confirm` + `setPitches((prev) => prev.filter(...))`. Full-width outlined red `UndoButton` rendered in the PitchForm column under the Log Pitch button.
- `src/pages/BullpenLive/styles.ts` — NEW `UndoButton` styled component.

### I3 — Drop `called_strike` fallback + verify Command Grade (`2835873`, mobile 2.35.0 → 2.36.0, web 1.29.0 → 1.30.0)

Addresses **UX-BP-14** and verifies **UX-BP-02**.

**packages/mobile**

- `app/bullpen/[id]/live.tsx` — `previousPitchesForZone` filters `bp.result != null` before mapping to `Pitch` shape; cast is now `bp.result as Pitch['pitch_result']` instead of `(bp.result as any) || 'called_strike'`. Unscored legacy rows simply don't appear on the StrikeZone preview rather than being colored as strikes.

**packages/web**

- `src/pages/BullpenLive/BullpenLive.tsx` — same `.filter((bp) => bp.result != null)` before the map; cast is `bp.result as PitchResult`. Same effect: no more lying preview.

**UX-BP-02 closed by verification**: both `app/bullpen/[id]/summary.tsx` (mobile) and `BullpenSessions.tsx` (web) already surface `summary.target_accuracy_percentage` as the "Accuracy %" stat in the post-session summary. Command Grade IS shown post-log. No code change needed; finding closes.

Server already auto-scores bullpen pitches from location at log time (`bullpen.service.ts:207-212`), so the unscored case the fallback was masking is a legacy edge case only.

## Verification

- `cd packages/api && npx tsc --noEmit` clean after every sub-commit.
- `cd packages/mobile && npx tsc --noEmit` clean.
- `cd packages/web && npx tsc --noEmit` clean.
- `cd packages/mobile && npm test` 12/12 pass.
- `cd packages/web && npx eslint src/pages/BullpenLive/` clean.
- `npx prettier --write` on all changed files — clean.

Manual (deferred to dev / TestFlight):

1. **Mobile plan editor**: from a team with no plans, navigate `/bullpen/new` → tap "Manage" → empty state with Create Plan button → tap → fill in name + description + add 3 pitches with different types → set a target zone on one via inline StrikeZone → assign to 2 pitchers → save → returns to list with new plan visible. Tap the new plan → fields pre-populated → tweak one → save → list reflects.
2. **Mobile plan delete**: tap trash on a plan → confirm dialog → tap Delete → row disappears.
3. **Bullpen Undo (mobile)**: log 3 pitches → "Undo Last Pitch" button visible → tap → confirm → counts decrement and the pitch is removed from the StrikeZone preview.
4. **Bullpen Undo (web)**: same flow on `BullpenLive`.
5. **UX-BP-14 fix**: pre-populate a `bullpen_pitches` row with `result = NULL` directly in the DB. Open the session in live view → that pitch should NOT show on the StrikeZone preview (previously it would show as a strike).
6. **Command Grade**: end a session → summary screen shows "Accuracy %" stat.

## Phase 2 status after this batch

| Item  | Title                       | Status      |
| ----- | --------------------------- | ----------- |
| A     | Design tokens               | Shipped     |
| B     | Pitch calling consolidation | Shipped     |
| C     | Live screen refactor        | Shipped     |
| D     | New Game flow alignment     | Shipped     |
| E     | In-play modal cleanup       | Shipped     |
| F     | Tendencies side-by-side     | Shipped     |
| G     | Snackbar lib eval           | Closed      |
| H     | Scoreboard aesthetic        | Declined    |
| **I** | **Bullpen feature parity**  | **Shipped** |
| J     | Mobile role routing         | Shipped     |
| K     | Heat-zone parity            | Shipped     |

**Phase 2 is complete.** A/B/C/D/E/F/I/J/K all shipped. G/H closed/declined intentionally. Only deferred work: UX-NG-02 (smart-defaults from last game) which is its own follow-up session, and the audit's S3-tagged polish items bundled with the design-token pass.

## Out of scope (deferred)

- **Plan duplication** — mobile and web editors both lack a "Duplicate plan" affordance. Useful for coaches who want a variant of an existing plan; not flagged by the audit; defer.
- **Drag-to-reorder pitches in mobile editor** — up/down arrows work; full drag-and-drop is iOS-26.2-beta sensitive (reanimated quirks) and not worth the risk this batch.
- **Catcher-side bullpen view** — bullpen doesn't have a viewer/relay surface like live games do (UX-PC-09 territory). Out of scope.
- **Web ↔ mobile parity on session listing** — web has a dedicated `/teams/:id/bullpen/sessions` page; mobile has none. Audit didn't flag; defer.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
