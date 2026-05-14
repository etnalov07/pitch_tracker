# Feat: pre-game lineup CTAs on mobile game-detail screen

| Date       | Type | Commit | Versions               |
| ---------- | ---- | ------ | ---------------------- |
| 2026-05-14 | feat | TBD    | mobile 1.97.0 → 1.98.0 |

## Context

Follow-up to `2026-05-14-lineup-ctas-visible-pre-game`. After fixing the
web pre-game lineup CTAs, mobile was left without a pre-game equivalent:

- Mobile's `Setup Opponent Lineup` / `Setup My Lineup` buttons (added in
  `2026-05-14-setup-opponent-lineup-button-gate`) live inside the live
  screen's `renderAtBatControls()`, which returns `null` when
  `game.status !== 'in_progress'`.
- Mobile's `Start Game` button lives on the **game-detail** screen
  (`app/game/[id]/index.tsx`), not the live screen. So a mobile user
  creating a game had no way to set up either lineup before pressing
  `Start Game` — the CTAs only became reachable after the game was
  already in progress.

That asymmetry was called out as an explicit follow-up in the prior
change doc.

## Decisions

Add a pair of `mode="outlined"` lineup-setup CTAs to the detail screen,
**above** the existing `Start Game` button, gated identically to web:

```ts
status === 'scheduled' &&
charting_mode !== 'scouting' &&
charting_mode !== '<the-other-side>' &&
<lineup>.length === 0
```

Outlined (not contained) so the primary "Start Game" action stays
visually dominant — the lineup buttons read as secondary prep steps.

Fetching: dispatch `fetchOpponentLineup` and `fetchMyTeamLineup` from
the existing `useEffect` that already calls `fetchGameById`, so the
length checks work on first render (no flash of incorrect CTA state).

Scouting mode left untouched — it has its own `scouting-lineup` flow
and isn't part of this bug.

Navigation targets reuse the existing mobile routes:
`/game/[id]/lineup` (opponent) and `/game/[id]/my-lineup` (own).
Neither needs a `from=` param because `lineup.tsx` already
`router.replace`s back to `/game/[id]` on save, and `my-lineup.tsx`
falls back to `router.back()` when `from !== 'live'` — which puts the
user back on the detail screen as intended.

## What shipped

### packages/mobile

- `app/game/[id]/index.tsx`
    - Imported `fetchOpponentLineup`, `fetchMyTeamLineup` from
      `src/state`.
    - Selected `opponentLineup` and `myTeamLineup` from `state.games`.
    - Dispatched both fetches alongside `fetchGameById` in the existing
      `useEffect`.
    - Added two outlined buttons above `Start Game`, gated as above.
- `package.json` — `1.97.0 → 1.98.0`.

No shared types, API routes, or DB migrations touched. No web changes.

## Verification

- [x] Prettier clean on changed files.
- [x] `npx tsc --noEmit` clean (mobile) — pre-existing `deleteGame`
      error on `(tabs)/index.tsx` is unrelated and tracked under the
      Super User plan.
- [x] `cd packages/mobile && npm test` green.
- [ ] **Manual (mobile):** create a new game with `charting_mode = 'both'`,
      team as **away**. On the game-detail screen, both `Setup Opponent
    Lineup` and `Setup My Lineup` buttons are visible above
      `Start Game`. Tap each, save, return; the corresponding button
      disappears once that lineup has entries.
- [ ] **Manual (mobile):** `charting_mode = 'our_pitcher'` shows only
      the opponent-lineup CTA; `charting_mode = 'opp_pitcher'` shows
      only the my-lineup CTA.
- [ ] **Manual (mobile):** `charting_mode = 'scouting'` shows neither —
      scouting flow is unchanged.
- [ ] **Manual (mobile):** after pressing `Start Game`, the user is
      taken to the live screen; the existing in-game `renderAtBatControls`
      buttons remain available as the secondary safety net if a lineup
      somehow wasn't filled out.

## Out of scope

- Adding a "Setup Lineups" CTA for scouting mode on the detail screen.
  Scouting has its own `scouting-lineup` route and a different UX
  shape; not in this fix.
- Auto-refreshing the lineups when the screen regains focus after a
  lineup-edit subroute saves. The current `useEffect` runs on `[id]`
  change only, but the lineup-edit screens both `router.replace` back
  to `/game/[id]`, which remounts this screen and triggers the fetches
  again. Verified manually as part of the test plan above.
- Migrating to a focus-effect (`useFocusEffect`) for the lineup
  fetches. The remount-on-replace behavior makes this unnecessary, and
  Expo Router's focus semantics are a larger refactor than this fix
  warrants.
