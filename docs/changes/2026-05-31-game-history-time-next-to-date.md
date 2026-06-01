# Show game time next to the date on Games History

- **Date:** 2026-05-31
- **Type:** `style`
- **Commit:** _pending_
- **Versions:** `packages/web` 1.31.0 → 1.32.0, `packages/mobile` 2.42.0 → 2.43.0

## Context

The Games History screens on web and mobile only showed the calendar date for each game — the scheduled start time (`games.game_time`) was hidden. On web, a `TimeText` slot existed but was wired to `formatTime(game.game_date)`, which parsed a date-only string with `new Date()` and rendered timezone-dependent midnight (e.g., "8:00 PM" or "12:00 AM") rather than the real game time. On mobile, the time wasn't shown at all. Schedules with multiple games on the same day were indistinguishable.

## Plan (Decisions)

- Render the time **inline** next to the date (not stacked below) — the user explicitly asked for "next to the date."
- Source the time from `game.game_time` (the PG `time without time zone` column), not from `game.game_date`. The Game type already exposes `game_time?: string`.
- Format `HH:MM[:SS]` → `h:mm AM/PM` with a small helper local to each screen. Don't go through `Date` — the value is a wall-clock time, not a timestamp, and round-tripping through `new Date()` would re-introduce a timezone bug.
- Hide the time when `game_time` is missing/unparseable rather than showing a placeholder — keeps the row clean for old games created before time was captured.

## What shipped

### `packages/web`

- **`src/pages/GameHistory/GameHistory.tsx`** — Rewrote `formatTime` to take `game_time` (`HH:MM[:SS]`) and return a `h:mm AM/PM` string or `null`. Updated the row to pass `game.game_time` and conditionally render `<TimeText>` only when a time is present.
- **`src/pages/GameHistory/styles.ts`** — `DateCell` is now a flex row (`display: flex; align-items: baseline; gap: sm; flex-wrap: wrap`) so the date and time sit side-by-side; `DateText` / `TimeText` switched from `div` to `span` to flow inline.
- **`package.json`** — Bumped to `1.32.0`.

### `packages/mobile`

- **`app/games/history.tsx`** — Added a `formatTime(timeString)` helper matching the web parser. `GameRow` now renders `"<date> · <time>"` in the same `Text` line when `game.game_time` is set, falling back to the bare date otherwise.
- **`package.json`** — Bumped to `2.43.0`.

No shared/api changes — `Game.game_time` was already on the type and already returned by `game.service.ts` queries (`SELECT *` / `ORDER BY g.game_date DESC, g.game_time DESC`).

## Verification

1. `cd packages/web && npx tsc --noEmit` — clean.
2. `cd packages/mobile && npx tsc --noEmit` — clean.
3. `cd packages/web && npx eslint src/pages/GameHistory/` — clean.
4. Manual: open `/games/history` on web — each row shows e.g. `Sat, Oct 15, 2025  6:00 PM` with the time muted, inline to the right of the date. Resize the table narrow → the time wraps under the date (flex-wrap).
5. Manual: open the Games History tab on mobile — each row shows e.g. `Oct 15, 2025 · 6:00 PM` under the matchup. Games without `game_time` show only the date.
6. Manual regression: create a game in `GameSetup` with a non-default time (e.g., 13:30); confirm it renders as `1:30 PM` on both web and mobile.

## Out of scope (deferred)

- Localizing the AM/PM format for non-en-US locales — both helpers hard-code the en-US 12-hour convention to match the existing `formatDate` calls.
- Timezone display — `game_time` is a wall-clock value with no zone attached; we render it as entered. Surfacing a venue timezone is a separate feature.
- Editing the time from the history row — still requires going through `GameSetup`.
