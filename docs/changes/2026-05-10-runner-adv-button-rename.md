# Live-game advance button rename → "Runner Adv"

- **Date:** 2026-05-10
- **Type:** style
- **Commit:** `c1ddff2`
- **Versions:** web `0.91.0` → `0.92.0`, mobile `1.86.0` → `1.87.0`

## Context

The live-game button that opens the standalone runner-event modal was labeled `SB / WP / PB / BLK` — unfriendly to read mid-game and out of date once the new `advance_on_throw` chip was added (the abbreviations no longer covered every option).

## Decision

Rename the button to a single human-readable label: **"Runner Adv"**.

## What shipped

- `packages/web/src/pages/LiveGame/LiveGame.tsx` — button text updated.
- `packages/mobile/app/game/[id]/live.tsx` — button text updated.

## Verification

Open the live game on web and mobile; the runner-advance button reads "Runner Adv" instead of the abbreviation list. Tapping it still opens the same modal.
