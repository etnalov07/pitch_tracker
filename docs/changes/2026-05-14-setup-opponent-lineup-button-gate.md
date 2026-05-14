# Fix: "Setup Opponent Lineup" button hidden for away teams pre-game

| Date       | Type | Commit | Versions                                  |
| ---------- | ---- | ------ | ----------------------------------------- |
| 2026-05-14 | fix  | TBD    | web 1.1.0 → 1.2.0, mobile 1.96.0 → 1.97.0 |

## Context

Reported live: a user created a game where their team was the **away
team**, opened it, and saw a "Setup My Team Lineup" button but **no**
"Setup Opponent Lineup" button — so they had no way to enter the opposing
roster from the live-game screen.

Root cause: `LiveGame.tsx:671` gated the opponent-lineup button on
`!currentBatter && gameMode !== 'opp_pitcher'`. `deriveGameMode` is:

```ts
fielding = (isHomeGame && half === 'top') || (!isHomeGame && half === 'bottom');
return fielding ? 'our_pitcher' : 'opp_pitcher';
```

For a fresh away game with default `inning_half = 'top'`, that resolves
to `'opp_pitcher'` — meaning "this half-inning, your team is batting".
The button gate confused **"there's no opponent batter in the active
at-bat right now"** with **"the opponent lineup isn't set up at all"**,
so it suppressed the setup CTA exactly when the user most needed it.

The neighboring "Setup My Team Lineup" button at line 674 already used
the correct symmetric pattern: `charting_mode !== 'our_pitcher' &&
myTeamLineup.length === 0`. Just an asymmetry no one had noticed because
the home-team case happens to not trip the bad gate.

Mobile (`app/game/[id]/live.tsx`) had a worse version of the same
problem: there was a `Setup My Lineup` button in the `opp_pitcher`
pre-at-bat branch, but **no `Setup Opponent Lineup` button anywhere** on
the live screen. Pre-game opponent-lineup setup had to be done via the
opponent detail flow.

## Decisions

Mirror the my-team-lineup gating pattern on both platforms:

```
charting_mode !== 'opp_pitcher' && opponentLineup.length === 0
```

Opponent lineup is irrelevant when `charting_mode === 'opp_pitcher'`
(user only charts the opposing pitcher — they don't need the opponent
batting order). Otherwise, show the button until the lineup is set.

Mobile additions:

- New `Setup Opponent Lineup` button alongside the existing
  `Setup My Lineup` button in the `opp_pitcher`-mode pre-at-bat prompt.
- Both buttons (with the same gating) added to the non-`opp_pitcher`
  branch where previously only a text prompt showed.
- Tightened the existing `Setup My Lineup` gate to also require
  `charting_mode !== 'our_pitcher'`, matching web for symmetry.

Did **not** change `deriveGameMode` itself — the function is correct;
the consumer was using the wrong signal for a setup-CTA gate.

## What shipped

### packages/web

- `src/pages/LiveGame/LiveGame.tsx` — destructured `opponentLineup` from
  `useLiveGameState` (line 184); rewrote the button gate at line 671
  from `!currentBatter && gameMode !== 'opp_pitcher'` to
  `charting_mode !== 'opp_pitcher' && opponentLineup.length === 0`.
- `package.json` — `1.1.0 → 1.2.0`.

### packages/mobile

- `app/game/[id]/live.tsx` — added `Setup Opponent Lineup` button in two
  pre-at-bat branches (`opp_pitcher` and generic); tightened
  `Setup My Lineup` gate with the `charting_mode !== 'our_pitcher'`
  check for symmetry.
- `package.json` — `1.96.0 → 1.97.0`.

No shared types, API routes, or DB migrations touched.

## Verification

- [x] Prettier clean on changed files.
- [x] `npx tsc --noEmit` clean (web + mobile).
- [x] `cd packages/mobile && npm test` green.
- [x] `cd packages/web && npx eslint src/` clean.
- [ ] **Manual (web):** create a new game where your team is the **away**
      team, with `charting_mode = 'both'` (or `'our_pitcher'`). Open the
      game on the live screen before adding lineups. Both
      `Setup Opponent Lineup` and `Setup My Team Lineup` buttons appear.
- [ ] **Manual (web):** with `charting_mode = 'opp_pitcher'`, only the
      `Setup My Team Lineup` button appears; opponent button is hidden.
- [ ] **Manual (mobile):** same two scenarios on the mobile live screen.
- [ ] **Manual (regression):** create a game where your team is the
      **home** team; both buttons still behave correctly (the existing
      home-team flow shouldn't have shifted).

## Out of scope

- Re-thinking the `gameMode === 'opp_pitcher'` branch's use of the
  `Setup My Lineup` button as a "pick a batter" shortcut. That has its
  own UX considerations; the in-game batter-selection lives in the
  `BatterSelector` component and isn't part of this CTA bug.
- Surfacing the same buttons earlier (e.g., from the game-detail card on
  the dashboard before the user enters the live screen). The CTA now
  works once they open the live screen, which addresses the reported
  workflow; pre-live discovery is a separate UX cut.
- Mobile: only the live-screen path was patched; the dashboard's
  per-game tile and the opponent-detail flow already had their own
  lineup entry points and weren't affected by this bug.
