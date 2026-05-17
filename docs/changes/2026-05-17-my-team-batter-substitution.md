# My-team batter substitution (mobile + web)

- **Date:** 2026-05-17
- **Type:** feat
- **Commit:** _backfill on commit_
- **Versions:** api `1.7.0` → `1.8.0`, web `1.7.1` → `1.8.0`, mobile `2.3.0` → `2.4.0`

## Context

Substituting a hitter worked for the **opponent** lineup but not for the user's **own team's** lineup. Investigation found my-team substitution wasn't gated off — it didn't exist at any layer: no API endpoint, no service method, no client method, no UI on mobile or web. The data model was already ready: `my_team_lineup` has `replaced_by_id` + `inning_entered` columns (migration `019`), and `MyTeamLineupPlayer` declares them.

One key difference from the opponent flow: opponent substitutes are free-text names; **my-team substitutes reference a real roster `player_id`**, so the sub UI picks a bench player from the team roster rather than typing a name.

## Decisions

- **Mirror the opponent `substitutePlayer` server pattern.** New row for the incoming player (`is_starter=false`, same `batting_order`, `inning_entered`), original row's `replaced_by_id` set to the new row. Done in a transaction; returns the new row with its joined `player` so it matches `getByGame`'s shape.
- **Roster-player picker, not free text.** The sub endpoint takes `player_id`; both UIs show bench players = roster players not already active in the lineup.
- **Rotation fix (mobile).** `live.tsx`'s `handleEndAtBat` advanced the my-team batter via `myTeamLineup.filter((p) => p.is_starter)` — a substitute has `is_starter=false`, so the rotation would have **skipped** subs. Changed to `filter((p) => !p.replaced_by_id)` (one active row per slot). Web was already correct: it rotates via the shared `getNextBatter`, which already filters `!replaced_by_id`.
- **Mobile: extracted a `MyBatterSelectorModal` component.** The my-team batter picker was inline JSX in the 2600-line `live.tsx`; the substitution form belongs in a component (mirroring the opponent's `BatterSelectorModal`). The old inline modal + its now-unused styles were removed.
- **Post-substitution re-point.** If the batter being replaced was the current batter, both platforms re-point `currentMyBatter` to the incoming sub after the lineup refetches.
- **Hitters only.** Pitcher changes already have their own `changePitcher` flow — out of scope here.

## What shipped

### API

- `services/myTeamLineup.service.ts` — `substitutePlayer(originalId, newPlayerId, inningEntered, position?)`.
- `controllers/myTeamLineup.controller.ts` — `substitutePlayer` (validates `player_id` + `inning_entered`).
- `routes/myTeamLineup.routes.ts` — `POST /my-team-lineup/player/:id/substitute`.
- No migration — `my_team_lineup` already has `replaced_by_id` / `inning_entered`.

### Mobile

- `src/state/games/api/gamesApi.ts` — `substituteMyTeamPlayer()`.
- `src/components/live/MyBatterSelectorModal/` — new component: active-batter list, select, per-batter Substitute button, roster bench picker + inning. Exported from the `live` barrel.
- `app/game/[id]/live.tsx` — replaced the inline my-team batter modal with `MyBatterSelectorModal`; fixed the `handleEndAtBat` rotation filter; removed dead styles.

### Web

- `services/myTeamLineupService.ts` — `substitute()`.
- `pages/LiveGame/MyBatterSubModal.tsx` — new modal: replace-batter select, bench-player select, inning, confirm.
- `pages/LiveGame/LiveGame.tsx` — "Sub" button beside the my-team batter dropdown; the dropdown now filters to active players (`!replaced_by_id`); renders `MyBatterSubModal`.

## Verification

1. `/check` — TypeScript clean on api/web/mobile (mobile's pre-existing `deleteGame` import error is unrelated); web ESLint clean; mobile Jest 12/12; API Jest 522/522.
2. **Mobile manual:** in an `opp_pitcher` game, open the my-team batter modal → tap Substitute on a batter → pick a bench player + inning → confirm. The sub takes that batting slot; the replaced starter drops out of the list; the rotation includes the sub.
3. **Web manual:** same via the "Sub" button beside the Our Batter dropdown.
4. Substituting the current batter re-points the live "current batter" to the incoming sub.

## Out of scope (deferred)

- **My-team pitcher substitution** — pitchers already have the `changePitcher` flow.
- **Position changes on substitution** — the sub inherits the replaced slot's position; position edits remain the lineup screen's job.
- **Undo of a substitution** — delete + re-add as a workaround, matching the opponent flow.
- **`MyTeamLineupWithSub` hydration type** — not needed; the UIs only need the active rows.
