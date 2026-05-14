# Fix: lineup setup CTAs vanish after saving one lineup pre-game

| Date       | Type | Commit | Versions          |
| ---------- | ---- | ------ | ----------------- |
| 2026-05-14 | fix  | TBD    | web 1.2.0 → 1.3.0 |

## Context

Follow-up from `2026-05-14-setup-opponent-lineup-button-gate`. The user
opened a fresh away game on the live screen, saw both `Setup Opponent
Lineup` and `Setup My Team Lineup` CTAs (correctly, after the previous
fix), and clicked `Setup Opponent Lineup`. After saving the opposing
roster and returning, the `Setup My Team Lineup` button was gone — even
though the user hadn't pressed `Start Game` yet and the my-team lineup
was still empty.

Root cause: the `SetupPrompt` block in `LiveGame.tsx` was gated on
`needsSetup && !currentAtBat`. `needsSetup` is true when no pitcher /
batter is selected for active charting. Saving the opponent lineup
auto-selects the first opposing pitcher (in `opp_pitcher` gameMode),
flipping `needsSetup` to `false` — which collapsed the entire prompt,
taking the still-applicable my-team CTA with it.

The CTAs are pre-game discovery, not in-game selection. They should
remain visible until `game.status` flips from `'scheduled'` to
`'in_progress'` via the `Start Game` button.

## Decisions

Split the gating so the same `SetupPrompt` covers both phases:

- **Pre-game** (`status === 'scheduled'`): show whichever lineup CTAs
  are still applicable (relevant `charting_mode` and lineup empty),
  regardless of `needsSetup`. No "select your pitcher" copy — that text
  is in-game guidance only.
- **In-game** (`needsSetup && !currentAtBat`): show the existing select
  prompt copy plus the same CTAs if their lineups happen to be empty.

Extracted four named locals next to the existing `needsSetup` to keep
the JSX readable:

```ts
const showOpponentLineupCTA = !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && opponentLineup.length === 0;
const showMyLineupCTA = !isScoutingMode && game?.charting_mode !== 'our_pitcher' && myTeamLineup.length === 0;
const showSetupSelectPrompt = needsSetup && !currentAtBat;
const showPreGameLineupCTAs = game?.status === 'scheduled' && (showOpponentLineupCTA || showMyLineupCTA);
```

The outer JSX gate became `(showSetupSelectPrompt || showPreGameLineupCTAs)`
so the empty container case (pre-game with all lineups configured) is
avoided.

Scouting-mode `Setup Lineups` button still gates on
`showSetupSelectPrompt` to preserve the existing scouting flow. No
deliberate behavior change there.

## What shipped

### packages/web

- `src/pages/LiveGame/LiveGame.tsx` — added four CTA locals next to
  `needsSetup` (line 247); rewrote the `SetupPrompt` block (line 652) to
  use them and conditionally render `SetupText` only when the in-game
  prompt is needed.
- `package.json` — `1.2.0 → 1.3.0`.

### packages/mobile

- **Not touched in this commit.** Mobile's `Setup Opponent Lineup` and
  `Setup My Lineup` buttons live inside `renderAtBatControls()`, which
  returns `null` when `game.status !== 'in_progress'`. Mobile's
  `Start Game` button is on the separate game-detail screen
  (`app/game/[id]/index.tsx`), not the live screen, so the pre-game UX
  is fundamentally a different shape. Pre-game CTAs on mobile would
  belong on the detail screen and are scoped as a follow-up; see
  **Out of scope** below.

## Verification

- [x] Prettier clean on changed files.
- [x] `npx tsc --noEmit` clean (web).
- [x] `npx eslint src/pages/LiveGame/LiveGame.tsx` clean.
- [ ] **Manual (web):** create an away game with `charting_mode = 'both'`.
      Open the live screen pre-game. Both CTAs visible. Click
      `Setup Opponent Lineup`, save the roster, return. The
      `Setup My Team Lineup` button is still visible.
- [ ] **Manual (web):** with both lineups configured pre-game, the
      `SetupPrompt` block is hidden entirely (no empty container).
- [ ] **Manual (web):** press `Start Game`. CTAs disappear; the in-game
      select prompt + (still-applicable) CTAs behave as before.
- [ ] **Manual (regression, scouting mode):** the `Setup Lineups` button
      still appears with the in-game select prompt only.

## Out of scope

- **Mobile pre-game lineup CTAs.** Mobile lineup setup currently only
  works after `Start Game` (in-game). A symmetric pre-game CTA pair
  would live on the game-detail screen alongside the existing
  `Start Game` button. Not in this fix to keep the diff surgical and
  because the user reported the bug from the web app; can be picked up
  as a follow-up.
- Reworking the auto-selection behavior on lineup save. The first
  opposing pitcher being picked automatically is convenient; the bug
  was the CTA-gating reading too much into that auto-selection, not the
  auto-selection itself.
- Renaming `needsSetup` to disambiguate it from the lineup setup CTAs.
  The variable is widely used (line 245 + `disabled={needsSetup}` on
  the Start-At-Bat button) and the rename would balloon the diff.
