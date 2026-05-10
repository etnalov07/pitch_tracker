# Mobile batter substitute — `player_name` API contract fix

- **Date:** 2026-05-10
- **Type:** fix
- **Commit:** `c84026e`
- **Versions:** mobile `1.87.0` → `1.88.0` (mobile-only)

## Context

User reported: "Substituting a batter results in an error during live mode."

Root cause: a name mismatch between mobile client and API. The mobile `BatterSelectorModal` posted `new_player_name` to `/opponent-lineup/player/:id/substitute`, but the API controller destructures `player_name`. The destructure yielded `undefined`, which failed the controller's "player_name and inning_entered are required" guard with a 400. Web already used `player_name` (correct) — the bug was mobile-only and silent until the user tried to substitute.

## What shipped

- `packages/mobile/src/components/live/BatterSelectorModal/BatterSelectorModal.tsx:130` — request body key renamed `new_player_name` → `player_name`.

## Verification

Mobile: in a live game, open the batter selector → tap the substitute icon on any starter → fill in name + inning → save. The new player should appear in the lineup at the same batting-order slot, with `is_starter=false` and the original starter's row marked `replaced_by_id`.

## Lesson saved as feedback memory

Two callers, one API contract — keep them in sync. Spec drift between platforms is silent until someone tries the broken path.
