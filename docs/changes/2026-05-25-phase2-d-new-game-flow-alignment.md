# Phase 2 D — New Game Flow Alignment · 2026-05-25

**Type:** `feat` (D1, D2)
**Commits:** `8013686` (D1) · `04f7cc2` (D2)
**Versions:** `web@1.26.0 → 1.28.0` · `mobile@2.32.0 → 2.33.0`

## Context

Phase 2 item D from the UX audit (`docs/plans/2026-05-23-ux-audit.md` lines 378–398, summary table line 487). Mobile's new-game flow (`app/game/new.tsx`, 571 lines) was a single scrollable form; web's (`pages/GameSetup/GameSetup.tsx`, 673 lines) was a 3-step wizard (Teams & Mode → Game Details → Confirm). Same outcome, very different ergonomics. Repeat coaches — the dominant user — hit "Next → Next → Confirm" 30 times a season on web for no gain. Same wizard also lacked edit-in-place on Confirm and silently defaulted `total_innings` to 7.

The mobile form was in good shape already: native date/time pickers, `total_innings` segmented control, `lineup_size` segmented chips, opponent chip row, scrimmage helper text. The mobile gaps were smaller: cryptic abbreviated `chartingMode` labels with no first-timer hint.

User-confirmed scope:

1. **Collapse web to a single form matching mobile.** Drop the 3-step wizard; fill in the web parity gaps (`total_innings`, `lineup_size` segmented chips, opponent chip row).
2. **Defer UX-NG-02 smart defaults** to a follow-up. Audit's "biggest setup-speed win" stays pending.
3. **2 commits**: D1 web rewrite, D2 mobile polish + last-location chip on both platforms.

Findings covered: **UX-NG-01, UX-NG-03, UX-NG-04, UX-NG-06, UX-NG-07, UX-NG-11, UX-NG-12, UX-NG-13**.

## Plan (Decisions)

Web → mobile alignment. The audit asked "wizard or single form?" — the answer is single form, because the dominant user is the repeat coach. The wizard's only real benefit (onboarding-friendly progress steps) doesn't outweigh the friction of submitting one form three times.

Key tradeoffs:

- The descriptive `<ModeCard>` grid (with title + description) survives on web — it's already the rich first-timer affordance the wizard had. Mobile got a single-line description below its segmented control to match without growing the form.
- Last-location chip uses `gamesApi.getGamesByTeam` (already exists on both platforms) → in-memory dedupe + top 5. No new API endpoint.
- Smart defaults from last game (UX-NG-02) was explicitly deferred. The audit calls it the "biggest setup-speed win"; deserves its own session.

## What shipped

### D1 — Web collapse 3-step wizard to single form (`8013686`, web 1.26.0 → 1.27.0)

Addresses **UX-NG-01, UX-NG-03, UX-NG-04, UX-NG-06, UX-NG-07, UX-NG-12**.

**packages/web**

- **REWRITE** `src/pages/GameSetup/GameSetup.tsx` (673 → 376 lines, -45%). Stripped `step` state, `getStepStatus()`, `STEP_LABELS`, and the 3 `step === N && ...` conditional renders. All fields render in one scrollable form, mobile section order.
- **ADDED** `total_innings` segmented chips (5 / 6 / 7 / 9) with the auto-default-by-team_type effect (college → 9, else 7) ported from mobile. Closes **UX-NG-03** (web no longer silently defaults to 7).
- **CONVERTED** `lineup_size` from a `<TeamSelect>` dropdown to segmented chips (9 / 10 (EH) / 11 / 12). Closes **UX-NG-07**.
- **REPLACED** the inline-styled known-opponents button row with a clean `ChipRow` + `Chip` pattern that matches mobile's knownOpponents row. Closes **UX-NG-06**.
- **DELETED** the entire Step 2 Confirm preview (GamePreview + PreviewMatchup + ConfirmDetailsList + back-only edit semantics) — there's no Confirm step to edit-in-place because there's no Confirm step. Closes **UX-NG-12**.
- **DELETED** the multi-step `<FormActions>` Next/Back/Submit cluster. Single Cancel + Submit at the bottom; SubmitButton is disabled until `isValid()` (single-form check replacing per-step validation).
- `src/pages/GameSetup/styles.ts` — deleted unused wizard styles: `StepperContainer`, `StepItem`, `StepDot`, `StepLabel`, `StepConnector`, `GamePreview`, `PreviewTitle`, `PreviewMatchup`, `PreviewTeam`, `PreviewAt`, `PreviewDetails`, `PreviewBadge`, `ConfirmDetailsList`, `ConfirmDetailRow`, `ConfirmDetailKey`, `ConfirmDetailValue`, `NextButton`. Added `ChipRow` + `Chip` styled components for the new segmented + opponent rows.

Closes **UX-NG-04** implicitly — repeat coaches submit one form, not three.

### D2 — Mobile chartingMode description + last-location chip both platforms (`04f7cc2`, mobile 2.32.0 → 2.33.0, web 1.27.0 → 1.28.0)

Addresses **UX-NG-11, UX-NG-13**.

**packages/mobile**

- `app/game/new.tsx` — added a `CHARTING_MODE_DESCRIPTIONS` constant keyed by mode (copy mirrors the web GameSetup ModeCards verbatim) and rendered a `<Text variant="bodySmall">` below the chartingMode SegmentedButton. Description updates as the coach taps each mode. Closes **UX-NG-11**.
- `app/game/new.tsx` — added a `recentLocations` state + `useEffect` that calls `gamesApi.getGamesByTeam(selectedTeamId)`, dedupes by location, takes top 5. Renders a chip row below the Location TextInput using the same `opponentChip` styles. Tap chip → `setLocation(chip.text)`. Hidden when empty.
- Added `modeDesc` to the styles block.

**packages/web**

- `src/pages/GameSetup/GameSetup.tsx` — same recent-locations chip row below the Location input. Reuses the D1 `ChipRow` + `Chip` styled components. Same `gamesApi.getGamesByTeam` + dedupe pattern.

## Verification

- `cd packages/web && npx tsc --noEmit` clean after D1 + D2.
- `cd packages/web && npx eslint src/` clean after D1 + D2.
- `cd packages/mobile && npx tsc --noEmit` clean after D2.
- `cd packages/mobile && npm test` 12/12 pass after D2.
- `npx prettier --write` on all changed files — clean.

Manual (deferred to dev / TestFlight):

1. **Web new-game flow**: from dashboard click New Game → `/game/setup`. The page renders as a single scrollable form (no Stepper, no "Step 1 of 3"). Pick team, mode, opponent, lineup size, innings, date, time, location — all visible at once. Create Game button is enabled when valid. Submission routes correctly per mode (standard → `/my-lineup`, scouting `focus='both'` → `/scouting-lineup`, scouting non-both / scrimmage → `/game/:id`).
2. **Web parity**: opponent chip row appears below the input when team has known opponents. Lineup Size + Innings are segmented chips, not dropdowns.
3. **Mobile chartingMode description**: on `/game/new`, tap each mode → the line below the SegmentedButton updates to the matching copy.
4. **Last-location chip (both)**: on a team with ≥1 prior game with a non-blank location, a chip row appears below the Location input on both web and mobile; tap a chip → fills.
5. **Regression**: bullpen create flow (separate route), scrimmage create, scouting create — all still produce a valid game and route correctly.

## Phase 2 status after this batch

| Item  | Title                       | Status      |
| ----- | --------------------------- | ----------- |
| A     | Design tokens               | Shipped     |
| B     | Pitch calling consolidation | Shipped     |
| C     | Live screen refactor        | Shipped     |
| **D** | **New Game flow alignment** | **Shipped** |
| E     | In-play modal cleanup       | Shipped     |
| F     | Tendencies side-by-side     | Shipped     |
| G     | Snackbar lib eval           | Closed      |
| H     | Scoreboard aesthetic        | Declined    |
| I     | Bullpen feature parity      | Pending     |
| J     | Mobile role routing         | Shipped     |
| K     | Heat-zone parity            | Shipped     |

## Out of scope (deferred)

- **UX-NG-02** (smart defaults from last game — prefill opponent + lineup_size + innings + charting_mode) — explicitly deferred. Audit's "biggest setup-speed win"; deserves its own session.
- **UX-NG-05** (mobile validation `Alert.alert` → toast) — mobile already uses `toast.show()` for validation errors (lines 87, 92, 96, 101). Audit finding was stale; close.
- **UX-NG-08, UX-NG-09** (mobile native date/time pickers) — already shipped on mobile via `@react-native-community/datetimepicker`. Audit findings stale; close.
- **UX-NG-10** (mobile opponentChip hardcoded colors) — bundle with the global design-token pass, not D.
- **UX-NG-14** (post-create redirect helper extracted to shared) — code quality only; defer.
- **Hybrid wizard / fast-form** — user picked single-form for everyone.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
