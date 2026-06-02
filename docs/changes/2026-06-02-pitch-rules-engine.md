# Sanction-Aware Pitch Rules (PG + HS + PBR-stub)

- **Date:** 2026-06-02
- **Type:** `feat`
- **Commits:** `010dd96` (backend) · `3781983` (web selector) · `56c9581` (web forms + counter) · `f699f25` (mobile + change doc)
- **Versions:** `packages/api` 1.24.0 → 1.25.0, `packages/web` 1.33.0 → 1.34.0, `packages/mobile` 2.44.0 → 2.45.0

## Context

Two related asks from the user:

1. **"Allow pitchers to be selected in all games, no issues."** The user recalled a prior cross-day pitcher block. Exploration confirmed no such rule currently exists in code — the closest match was a misleading inline comment on `PitcherSelector.tsx:79`. The plan locks the permissive cross-day behavior with a regression test before layering rules.
2. **Implement Perfect Game tournament pitch rules** (the published table — age-bracketed daily max + tiered rest), **plus High School (NFHS) 110-pitch cap** for HS games and **PBR rules** for travel teams that play PBR events. The user also asked for a per-game sanction selector so a single travel team can switch between PG / PBR / Other across the season.

5-adviser council exercise + user locks:

- **Enforcement: HARD BLOCK** ineligible pitchers in the selector (over the Chairman's "warn" recommendation).
- **Age division on the TEAM**, copied to the game on create (overrideable per game for PG / PBR).
- **Sanction per game**, defaulted from `team_type`: `high_school` → `HS`; `travel` / `club` → user picks; `college` → `NONE`.
- **PBR rules table** not provided in this session — engine recognizes PBR and returns `'unknown_rules'` (no block, caveat chip). Swap the body of `pbr.ts` when the table arrives.

## Plan (Decisions)

Four coordinated changes (per `~/.claude/plans/looking-for-a-way-synchronous-puzzle.md`):

1. Verify and lock the existing permissive cross-day selection behavior with a regression test; fix the misleading comment.
2. Add `teams.age_division` + `games.age_division` + `games.sanction` with inheritance on game create.
3. Ship a sanction-pluggable rules engine (PG full impl, HS 110 cap, PBR stub, NONE pass-through).
4. Hard-block UI on `PitcherSelector` (web + mobile); sanction-aware live counter on `PitcherStats`.

Liability guard: missing data is never silent green. A PG game without an age division → `unknown_division`, caveat chip, no block. PBR sanction → `unknown_rules`, caveat chip, no block. Pitch entry is never blocked even at the cap (mid-AB grace).

## What shipped

### `packages/shared`

- `src/index.ts` — added `AgeDivision` (`'8U' | '10U' | '12U' | '14U' | '16U' | '18U'`) and `Sanction` (`'PG' | 'PBR' | 'HS' | 'NONE'`) types. Added `age_division` to `Team`; `age_division` + `sanction` to `Game`. Rebuilt shared. No shared version bump.

### `packages/api` (commits `010dd96` and follow-ups)

- `src/migrations/049_pitch_rules_metadata.sql` — `teams.age_division`, `games.age_division`, `games.sanction` with CHECK constraints. Indexes on the new columns + `idx_pitches_pitcher_game` for the history queries.
- New folder `src/services/pitchRules/`:
    - `types.ts` — shared `EligibilityInput` / `EligibilityResult` / `PitcherHistory` contracts.
    - `db.ts` — shared DB-backed history queries (`pitches today by game`, `last_appearance`, `consecutive_days_pitched`) plus `daysBetween` helper.
    - `pg.ts` — Perfect Game engine. `getDailyMax` per age div; three rest-tier tables (7-14 / 15-16 / 17-18); `evaluate` enforces the five rules in plan order: 3-days-in-a-row, 2-games-today, ≤20-escape, rest-still-active, already-at-max.
    - `hs.ts` — NFHS 110 cap. Selection is always `'eligible'` in v1; cap surfaces at pitch entry via the live counter. State-specific rest deferred.
    - `pbr.ts` — stub returning `'unknown_rules'`. Coaches not blocked; caveat chip shown.
    - `none.ts` — always eligible.
    - `index.ts` — `evaluatePitcherEligibility(pitcherId, gameId)` + `evaluatePitchersEligibility(pitcherIds, gameId)` for the bulk PitcherSelector path. Dispatcher switches on `game.sanction`.
- `src/controllers/pitchRules.controller.ts` + `src/routes/pitchRules.routes.ts` — `GET /bt-api/pitch-rules/eligibility/:gameId/:pitcherId` (single) and `GET /bt-api/pitch-rules/eligibility/:gameId/bulk?pitcher_ids=` (bulk). Both auth-gated.
- `src/app.ts` — registered at `/bt-api/pitch-rules`.
- `src/services/team.service.ts` — `createTeam` / `updateTeam` accept `age_division`.
- `src/services/game.service.ts::createGame` — defaults `sanction` from home team's `team_type` (`high_school` → `HS`, `college` → `NONE`, else `NONE`); defaults `age_division` from the home team if not provided.
- Tests:
    - `src/services/__tests__/pitchRules.pg.test.ts` — table-driven over every age × tier boundary; eligibility scenarios for all five PG rules.
    - `src/services/__tests__/pitchRules.others.test.ts` — HS (110 boundary), PBR (returns `unknown_rules`), NONE (always eligible).
    - `src/__tests__/pitchRules.routes.test.ts` — auth, 404 on missing game, dispatcher coverage for each sanction, bulk endpoint shape.
    - `src/__tests__/gamePitcher.routes.test.ts` — **regression lock**: the API must continue to accept a pitcher who pitched yesterday in a different game.
    - 63 new/extended tests; 100 % green.

### `packages/web` (commits `3781983`, `56c9581`)

- `src/components/game/PitcherSelector/PitcherSelector.tsx` — bulk eligibility fetch on open; ineligible cards greyed (opacity 0.45, `onClick` no-op) with rule reason; caveat chip for `unknown_division` / `unknown_rules`. Fixed misleading comment `// Players who have already pitched today` → `// Players who have pitched in this game so far`. Belt-and-suspenders guard in `handleSelectPitcher`.
- `src/components/game/PitcherSelector/styles.ts` — `PitcherCard` accepts `disabled`; new `IneligibleReason` + `CaveatChip` styled spans.
- `src/components/live/PitcherStats/PitcherStats.tsx` — fetches eligibility on `(gameId, pitcherId)` change; the total-pitches header now renders `X / max (PG 14U daily max)` with green/amber/red color thresholds (≥70 amber, ≥90 red). Falls back to the existing display when no rules apply.
- `src/pages/Teams/Teams.tsx` — `Age Division` dropdown on team-create, shown for travel + high_school + club, hidden for college. Persists via the existing `createTeam` thunk.
- `src/pages/GameSetup/GameSetup.tsx` — pitch-rules section keyed on home team's `team_type`. HS teams see an inline NFHS note; travel/club teams see a Sanction dropdown (`PG / PBR / Other`); when PG or PBR is picked, an Age Division override (defaulting to "Inherit from team (14U)") appears. College teams see nothing.

### `packages/mobile`

- `src/components/live/PitcherSelectorModal/PitcherSelectorModal.tsx` — new `gameId` prop; bulk eligibility fetch on `visible`; ineligible `Pressable`s `disabled` with red rule-reason text under the player name; yellow caveat chip for `unknown_*` states.
- `src/components/live/PitcherStats/PitcherStats.tsx` — new optional `gameId` + `pitcherId` props; when both present, fetches eligibility and renders `X / max` with the sanction label and the same green/amber/red thresholds.
- `src/components/live/PitcherStatsModal/PitcherStatsModal.tsx` — passes `gameId` + `pitcherId` through to `PitcherStats`.
- `app/game/[id]/LiveGameModals.tsx` — threads `id` (the game id) into the new `gameId` prop on `PitcherSelectorModal`.
- `app/game/new.tsx` — new sanction selector keyed on home team `team_type`. HS teams see an inline NFHS note; travel/club teams see a SegmentedButtons control (`Other / PG / PBR`) and, when PG or PBR, an Age Division override row (`<team default> / 12U / 14U / 16U / 18U`). College teams see nothing.

### Versions

- `packages/api` 1.24.0 → 1.25.0
- `packages/web` 1.33.0 → 1.34.0
- `packages/mobile` 2.44.0 → 2.45.0
- `app.json` intentionally not bumped (App Store version diverges from package.json per memory).

## Verification

1. **Backend tests** (`cd packages/api && npx jest pitchRules gamePitcher`) — 63 / 63 passing.
2. **TS clean** on api / web / mobile.
3. **Mobile jest** — 18 / 18 unchanged tests still pass.
4. **Behavior lock**: `gamePitcher.routes.test.ts` new case "accepts a pitcher who pitched yesterday in a different game" pins the permissive cross-day behavior.
5. **Manual web E2E (recommended)**:
   - Create an HS team → create a game → confirm sanction auto-set to `HS`, no dropdown shown, PitcherStats counter shows `X/110 (NFHS HS)`.
   - Create a 14U Travel team → create a game with `Sanction = PG` → PitcherSelector ineligibility chips fire for pitchers who pitched 95+ pitches yesterday. PitcherStats counter shows `X/95 (PG 14U)` with amber at 67, red at 86.
   - Switch the same game's sanction to `PBR` (via DB or future UI) → caveat chip "PBR rules not yet configured" replaces the PG warnings.
6. **Manual mobile E2E**:
   - Open Game New on a travel team → confirm sanction picker appears; pick PG → confirm Age Division row appears; create game → live PitcherSelectorModal shows greyed ineligible chips on rest-blocked pitchers.

## Out of scope (deferred)

- **PBR rules table** — `pbr.ts` is a stub. Paste the table → replace function body → ship as a 1-day follow-up.
- **Mobile team-create / team-edit age_division dropdown** — for now mobile coaches set team age via the web UI. The age inherits to mobile-created games automatically.
- **Mobile in-game live PitchBreakdown counter** — the daily-max counter only appears in the on-demand PitcherStatsModal on mobile, not in the always-visible PitchBreakdown summary. Trivial to add when needed.
- **USSSA / Little League / Cal Ripken** rule sets — engine is sanction-pluggable; each is a new file in `pitchRules/`.
- **NFHS state-specific rest rules** — v1 enforces only the 110 per-game cap.
- **Postgame compliance PDF / season-long pitch report**.
- **Timezone correctness for cross-midnight games**.
- **Soft-override "pitch anyway" path** — user picked HARD BLOCK; revisit if field experience shows real friction.
- **Player birth-date column for player-age fallback** — PG rule explicitly says "by tournament age division, not player age."
