# PitchChart — New Features: Opposing Pitcher Charting, Multi-Device Sync, Count-Based Breakdowns

**Date:** 2026-04-20
**Status:** Planned
**Source:** `docs/PitchChart_New_Features.pdf` — April 22 paper-chart review (vs Goosecreek)

---

## Summary

Three features extending PitchChart into a full-game charting platform. Feature 1 adds opposing-pitcher charting so the app captures data during our batting half, automatically switching mode based on inning half. Feature 3 adds count-bucket pitch breakdowns that mirror the paper chart coaches have used for years. Feature 2 adds a WebSocket transport so a dugout iPad can display live tendencies while a charter logs pitches behind the plate.

Build order: **Features 1 + 3 first** (no infrastructure risk), then **Feature 2** (WebSocket infra in isolation).

---

## Feature 1 — Opposing Pitcher Charting

### Motivation

Currently the app only tracks pitches thrown by *our* pitcher. The April 22 paper-chart had a full opposing-pitcher sheet (#20, Bryant-Borders). Feature 1 captures the same data in the app and persists it per opposing pitcher across the season.

### Design Decisions

- **Mode is derived, not user-selected mid-game.** `gameMode = fielding ? 'our_pitcher' : 'opp_pitcher'` where `fielding = (is_home_game && half === 'top') || (!is_home_game && half === 'bottom')`. This is a single source of truth — no toggle, no accidental mode changes.
- **`team_side` column on pitches** (not a separate table) keeps pitch storage uniform. All existing analytics queries continue to work; new queries simply filter on `team_side`.
- **Opposing pitchers are lightweight.** Jersey #, name, throws L/R, team name only — no full player profile. Identified by jersey # + team on resume/delay.
- **`charting_mode` on games** (`'our_pitcher' | 'opp_pitcher' | 'both'`) lets teams that only want to track their own pitcher skip the opposing-pitcher UI entirely.
- **Pitch Com / PTT / BT status bar hidden in `opp_pitcher` mode.** There is no pitch to call when we're batting — these controls are noise and would confuse the charter.

### Mode State Machine

```
fielding = (game.is_home_game && inning.half === 'top')
        || (!game.is_home_game && inning.half === 'bottom')

gameMode = fielding ? 'our_pitcher' : 'opp_pitcher'
```

| Context | Mode | Pitch Com | PTT | BT bar | Chart our P | Chart opp P |
|---------|------|-----------|-----|--------|-------------|-------------|
| Home · Top | our_pitcher | ● | ● | ● | ● | ○ |
| Home · Bottom | opp_pitcher | ○ | ○ | ○ | ○ | ● |
| Away · Top | opp_pitcher | ○ | ○ | ○ | ○ | ● |
| Away · Bottom | our_pitcher | ● | ● | ● | ● | ○ |

**Edge cases:**
- Extra innings: same rule, no special handling.
- Their pitcher substitution: prompt for new jersey # / name / throws; close out previous pitcher's data, start fresh.
- Our pitcher substitution: mode stays `our_pitcher`; existing roster-select prompt handles it.
- Rain delay: mode freezes; resume re-links opposing pitcher by jersey # + team.
- Charting started late: warn that earlier pitches won't be logged; no retroactive charting.

---

## Feature 3 — Count-Based Pitch Breakdowns

### Motivation

The paper chart groups pitches into four count buckets — 1st Pitch, Ahead, Even, Behind — giving coaches an at-a-glance read on what a pitcher throws in each situation. This feature replicates that layout digitally.

### Design Decisions

- **Full 12-count granularity stored; bucket grouping applied in view layer.** `balls_before` + `strikes_before` already exist on every pitch row. No migration needed. Bucket logic lives in shared utilities.
- **Count buckets:** `1st_pitch` (0-0) · `ahead` (0-1, 0-2) · `even` (1-1, 2-2) · `behind` (1-0, 2-0, 2-1, 3-0, 3-1, 3-2).
- **Two views:** (a) aggregate pitcher view ("on 0-0 throws FB 75%"), (b) per-batter matrix (rows = lineup, cols = count buckets, cells = pitch mix).
- **Filter by hitter handedness** (vs LHH / vs RHH) reuses existing `bats` field on `opponent_lineup`.
- **No new migration.** All data is derivable from existing pitch rows.

---

## Feature 2 — Real-Time Multi-Device Sync

### Motivation

Coaches want a live tendency dashboard on a dugout iPad while one or two charters log pitches behind the plate. The current HTTP-polling architecture is too coarse-grained for this.

### Design Decisions

- **WebSocket per `game_id`, backed by Postgres `LISTEN/NOTIFY`.** The API is already on Postgres; a trigger on `pitches` + `at_bats` emits `NOTIFY game_{game_id}` so the ws server pushes without polling.
- **Viewers are subscribe-only.** No write path, no conflict surface. Simplifies auth — viewer JWTs have a read-only scope flag.
- **Account-based join, no game codes.** Coach logs in, picks active game, selects role. iPad lives with the team.
- **Last-write-wins per `pitch_id` on charter side.** Offline queue on charter drains on reconnect; sequence keyed by `(game_id, inning, half, at_bat_seq, pitch_seq)` to minimize collision.
- **Phased build:** (1) WebSocket transport + viewer-only mode first — low risk, delivers iPad dashboard to coach. (2) Single-charter + multi-viewer. (3) Multi-charter conflict resolution only if needed.

---

## Changes by Package

### Shared — `packages/shared/`

| Change | Detail |
|--------|--------|
| Add `team_side` to `Pitch` | `'our_team' \| 'opponent'`, default `'our_team'` |
| Add `charting_mode` to `Game` | `'our_pitcher' \| 'opp_pitcher' \| 'both'`, default `'our_pitcher'` |
| Add `OpposingPitcher` type | `{ id, game_id, jersey_number, name, throws, team_name, inning_entered, inning_exited?, created_at }` |
| Add `GameMode` type | `'our_pitcher' \| 'opp_pitcher'` |
| Add `CountBucket` type | `'1st_pitch' \| 'ahead' \| 'even' \| 'behind'` |
| Add `CountBucketBreakdown` interface | Per-bucket pitch type percentages + totals |
| Add `GameRole` type | `'charter' \| 'viewer'` |
| Add `getCountBucket(balls, strikes)` utility | Maps raw count → bucket enum |
| Add `deriveGameMode(isHomeGame, half)` utility | Single source of truth for mode derivation |

### API — `packages/api/`

#### Migration 017 — `src/migrations/017_opposing_pitcher_charting.sql`
```sql
ALTER TABLE pitches ADD COLUMN team_side VARCHAR(20) NOT NULL DEFAULT 'our_team';
ALTER TABLE games ADD COLUMN charting_mode VARCHAR(20) NOT NULL DEFAULT 'our_pitcher';
CREATE TABLE opposing_pitchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    jersey_number VARCHAR(10),
    name VARCHAR(100) NOT NULL,
    throws VARCHAR(1) NOT NULL,         -- 'L' | 'R'
    team_name VARCHAR(100),
    inning_entered INT NOT NULL DEFAULT 1,
    inning_exited INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT ALL ON opposing_pitchers TO bvolante_pitch_tracker;
```

#### Migration 018 — `src/migrations/018_game_roles.sql`
```sql
CREATE TABLE game_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,          -- 'charter' | 'viewer'
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);
GRANT ALL ON game_roles TO bvolante_pitch_tracker;

-- NOTIFY trigger for WebSocket push
CREATE OR REPLACE FUNCTION notify_game_update() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('game_' || NEW.game_id::text, NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pitches_notify AFTER INSERT OR UPDATE ON pitches
    FOR EACH ROW EXECUTE FUNCTION notify_game_update();
CREATE TRIGGER at_bats_notify AFTER INSERT OR UPDATE ON at_bats
    FOR EACH ROW EXECUTE FUNCTION notify_game_update();
```

#### New API files

| File | Purpose |
|------|---------|
| `src/routes/opposingPitcher.routes.ts` | Register opposing pitcher CRUD routes |
| `src/controllers/opposingPitcher.controller.ts` | Request handlers |
| `src/services/opposingPitcher.service.ts` | DB queries for opposing_pitchers table |
| `src/routes/gameRole.routes.ts` | Role assignment routes |
| `src/controllers/gameRole.controller.ts` | Role handlers |
| `src/services/gameRole.service.ts` | game_roles queries |
| `src/websocket/wsServer.ts` | WebSocket server init, Postgres LISTEN setup |
| `src/websocket/gameChannel.ts` | Per-game channel: subscriber map, broadcast |

#### Opposing pitcher routes
- `POST /bt-api/opposing-pitchers` — create (called at game start or on pitcher entry)
- `GET /bt-api/opposing-pitchers/game/:gameId` — list all for a game
- `PUT /bt-api/opposing-pitchers/:id/exit` — record inning_exited on substitution

#### Game role routes
- `POST /bt-api/games/:gameId/role` — assign role for current user
- `GET /bt-api/games/:gameId/role` — get current user's role

#### WebSocket
- `ws://bt-api/ws/game/:gameId?token=JWT` — upgrade endpoint
- Messages pushed: `{ type: 'pitch_logged' | 'at_bat_ended' | 'inning_changed' | 'runners_updated', payload }`

#### Analytics endpoints (added to existing analytics routes)
- `GET /bt-api/analytics/pitcher/:pitcherId/count-breakdown?gameId=&teamSide=&batterHand=`
- `GET /bt-api/analytics/game/:gameId/batter-matrix?teamSide=opponent&batterHand=`
- `GET /bt-api/analytics/opposing-pitcher/:id/tendencies` — post-game tendency report

#### Modified API files
- `src/services/pitch.service.ts` — accept and persist `team_side` in `logPitch()`
- `src/services/analytics.service.ts` — add `getPitcherCountBreakdown()`, `getBatterMatrix()`
- `src/controllers/analytics.controller.ts` — add handlers for new analytics endpoints
- `src/routes/analytics.routes.ts` — register new endpoints
- `src/app.ts` — register `/bt-api/opposing-pitchers`, `/bt-api/game-roles` routes; init WS server

---

### Mobile — `packages/mobile/`

#### New mobile files

| File | Purpose |
|------|---------|
| `src/components/live/OpposingPitcherModal/OpposingPitcherModal.tsx` | Jersey # + name + throws entry for mid-inning substitution |
| `src/components/live/OpposingPitcherModal/index.ts` | Barrel export |
| `src/components/live/TendenciesModals/CountBreakdownModal.tsx` | Count-bucket breakdown display (tabbed: aggregate + per-batter matrix) |
| `src/state/games/api/opposingPitcherApi.ts` | API calls for opposing_pitchers endpoints |
| `src/hooks/useGameWebSocket.ts` | WS connection, reconnect logic, message dispatch |
| `src/hooks/useGameMode.ts` | Derives `gameMode` from game + inning state (wraps `deriveGameMode`) |

#### Modified mobile files

| File | Change |
|------|--------|
| `app/game/new.tsx` | Add `charting_mode` SegmentedButtons (Our Pitcher / Both / Opp Pitcher) |
| `app/game/[id]/live.tsx` | — Compute `gameMode` via `useGameMode` hook<br>— When `opp_pitcher`: hide Pitch Com / PTT / BT bar; show `OpposingPitcherSelector`<br>— Tag every `logPitch` call with `team_side`<br>— Show `OpposingPitcherModal` on inning-half change prompt<br>— Show `CountBreakdownModal` from tendencies row |
| `src/components/live/index.ts` | Export new components |
| `src/state/index.ts` | Export new thunks/actions |
| `src/state/games/gamesSlice.ts` | Add `currentGameRole`, `currentOpposingPitcher` state fields |

---

### Web — `packages/web/`

#### New web files

| File | Purpose |
|------|---------|
| `src/components/live/OpposingPitcherPanel/OpposingPitcherPanel.tsx` | Opposing pitcher selector + current pitcher info |
| `src/components/live/OpposingPitcherPanel/styles.ts` | Emotion styles |
| `src/components/live/OpposingPitcherPanel/index.ts` | Barrel export |
| `src/components/live/CountBreakdownPanel/CountBreakdownPanel.tsx` | Count-bucket breakdown panel for live sidebar |
| `src/components/live/CountBreakdownPanel/styles.ts` | Emotion styles |
| `src/components/live/CountBreakdownPanel/index.ts` | Barrel export |
| `src/components/live/BatterMatrix/BatterMatrix.tsx` | Per-batter × count-bucket matrix |
| `src/components/live/BatterMatrix/styles.ts` | Emotion styles |
| `src/components/live/BatterMatrix/index.ts` | Barrel export |
| `src/pages/LiveGame/ViewerDashboard.tsx` | iPad-optimized read-only live dashboard |
| `src/hooks/useGameWebSocket.ts` | WS connection hook for web |

#### Modified web files

| File | Change |
|------|--------|
| `src/pages/GameSetup/GameSetup.tsx` | Add `charting_mode` toggle (Our Pitcher / Both / Opp Pitcher) |
| `src/pages/LiveGame/useLiveGameState.ts` | Add `gameMode`, `currentOpposingPitcher`, `gameRole`, `wsConnection` state |
| `src/pages/LiveGame/useLiveGameActions.ts` | — Tag `logPitch` with `team_side`<br>— Handle opposing pitcher substitution<br>— `handleDiamondResult` aware of `opp_pitcher` mode |
| `src/pages/LiveGame/LiveGame.tsx` | — Conditional render: Pitch Com / PTT / BT based on `gameMode`<br>— Show `OpposingPitcherPanel` in `opp_pitcher` mode<br>— Add `CountBreakdownPanel` to sidebar<br>— Role check on load → route viewer to `ViewerDashboard` |
| `src/services/analyticsService.ts` (or equivalent) | Add `getPitcherCountBreakdown()`, `getBatterMatrix()` API calls |

---

## File Manifest

| File | Action | Feature |
|------|--------|---------|
| `packages/shared/src/index.ts` | Modified | 1, 2, 3 |
| `packages/shared/src/utils/atBatHelpers.ts` | Modified | 3 (add `getCountBucket`, `deriveGameMode`) |
| `packages/api/src/migrations/017_opposing_pitcher_charting.sql` | Added | 1 |
| `packages/api/src/migrations/018_game_roles.sql` | Added | 2 |
| `packages/api/src/routes/opposingPitcher.routes.ts` | Added | 1 |
| `packages/api/src/controllers/opposingPitcher.controller.ts` | Added | 1 |
| `packages/api/src/services/opposingPitcher.service.ts` | Added | 1 |
| `packages/api/src/routes/gameRole.routes.ts` | Added | 2 |
| `packages/api/src/controllers/gameRole.controller.ts` | Added | 2 |
| `packages/api/src/services/gameRole.service.ts` | Added | 2 |
| `packages/api/src/websocket/wsServer.ts` | Added | 2 |
| `packages/api/src/websocket/gameChannel.ts` | Added | 2 |
| `packages/api/src/services/pitch.service.ts` | Modified | 1 (add team_side) |
| `packages/api/src/services/analytics.service.ts` | Modified | 3 |
| `packages/api/src/controllers/analytics.controller.ts` | Modified | 3 |
| `packages/api/src/routes/analytics.routes.ts` | Modified | 3 |
| `packages/api/src/app.ts` | Modified | 1, 2 |
| `packages/mobile/app/game/new.tsx` | Modified | 1 |
| `packages/mobile/app/game/[id]/live.tsx` | Modified | 1, 2, 3 |
| `packages/mobile/src/components/live/OpposingPitcherModal/OpposingPitcherModal.tsx` | Added | 1 |
| `packages/mobile/src/components/live/OpposingPitcherModal/index.ts` | Added | 1 |
| `packages/mobile/src/components/live/TendenciesModals/CountBreakdownModal.tsx` | Added | 3 |
| `packages/mobile/src/state/games/api/opposingPitcherApi.ts` | Added | 1 |
| `packages/mobile/src/state/games/gamesSlice.ts` | Modified | 1, 2 |
| `packages/mobile/src/state/index.ts` | Modified | 1 |
| `packages/mobile/src/components/live/index.ts` | Modified | 1, 3 |
| `packages/mobile/src/hooks/useGameWebSocket.ts` | Added | 2 |
| `packages/mobile/src/hooks/useGameMode.ts` | Added | 1 |
| `packages/web/src/pages/GameSetup/GameSetup.tsx` | Modified | 1 |
| `packages/web/src/pages/LiveGame/useLiveGameState.ts` | Modified | 1, 2 |
| `packages/web/src/pages/LiveGame/useLiveGameActions.ts` | Modified | 1 |
| `packages/web/src/pages/LiveGame/LiveGame.tsx` | Modified | 1, 2, 3 |
| `packages/web/src/pages/LiveGame/ViewerDashboard.tsx` | Added | 2 |
| `packages/web/src/components/live/OpposingPitcherPanel/` (3 files) | Added | 1 |
| `packages/web/src/components/live/CountBreakdownPanel/` (3 files) | Added | 3 |
| `packages/web/src/components/live/BatterMatrix/` (3 files) | Added | 3 |
| `packages/web/src/hooks/useGameWebSocket.ts` | Added | 2 |

---

## Build Order

### Phase 1 — Features 1 + 3 (no infrastructure risk)

1. **Shared** — add types + utilities (`team_side`, `charting_mode`, `OpposingPitcher`, `GameMode`, `CountBucket`, `getCountBucket`, `deriveGameMode`); rebuild shared
2. **API migration 017** — run against DB
3. **API: opposing pitcher service/controller/routes** — CRUD for opposing_pitchers table
4. **API: patch `pitch.service.ts`** — persist `team_side`
5. **API: analytics count breakdown** — new endpoints + service methods
6. **Mobile: `useGameMode` hook** — derives mode from game state
7. **Mobile: game setup** — add `charting_mode` selector
8. **Mobile: live screen** — mode switching, opp pitcher selector, hide Pitch Com in opp mode, tag pitches
9. **Mobile: `OpposingPitcherModal`** — jersey # / name / throws entry
10. **Mobile: `CountBreakdownModal`** — aggregate + per-batter views
11. **Web: game setup** — add `charting_mode` selector
12. **Web: live game** — mode switching, `OpposingPitcherPanel`, hide Pitch Com in opp mode
13. **Web: `CountBreakdownPanel` + `BatterMatrix`** — sidebar analytics display

### Phase 2 — Feature 2 (WebSocket infra)

1. **API: install `ws` package**
2. **API migration 018** — game_roles table + Postgres NOTIFY trigger
3. **API: `wsServer.ts` + `gameChannel.ts`** — WS server init and LISTEN/NOTIFY wiring
4. **API: game role routes/controller/service**
5. **Mobile: `useGameWebSocket` hook** — connect, reconnect, message dispatch
6. **Mobile: viewer dashboard** — read-only live stats screen (landscape iPad)
7. **Web: `useGameWebSocket` hook**
8. **Web: `ViewerDashboard`** — iPad-optimized layout with count breakdowns, heat map, freshness indicator
9. **Test:** two-device session (charter phones in a pitch, viewer iPad receives it live)

---

## Prerequisite

Feature 1 (auto-mode switching) depends on the **Home/Away toggle fix** from the April 20 backlog. That fix is already implemented — the `is_home_game` field is set correctly in game setup and the label "Your team is playing: Home / Away" is in place.

---

## Known Limitations / Not in Scope

- No retroactive charting — if charting starts mid-game a warning is shown and earlier pitches are not backfilled.
- Opposing pitcher tendency reports are per-pitcher cross-game but require correct jersey # consistency across games for identity matching.
- Multi-charter conflict resolution (Phase 2, step 3) is explicitly deferred.
- No video sync for opposing pitcher charting.
- Export (Feature 3) mirrors paper chart layout — CSV/PDF export implementation details TBD.

---

## Testing

### Feature 1
1. Create game with `charting_mode = 'both'`, home game.
2. Start game (inning 1 top) → verify mode = `our_pitcher`, Pitch Com visible.
3. Advance to inning 1 bottom → verify mode = `opp_pitcher`, Pitch Com hidden, opposing pitcher selector shown.
4. Log a pitch → confirm `team_side = 'opponent'` on the pitch record.
5. Sub opposing pitcher mid-inning → confirm `OpposingPitcherModal` prompts for new jersey # and closes out previous pitcher.
6. Post-game: check tendency report for the opposing pitcher.

### Feature 3
1. Log 20+ pitches across varied counts for an opposing pitcher.
2. Open `CountBreakdownModal` → verify bucket totals sum to pitch count.
3. Toggle handedness filter (LHH / RHH) → verify filtered results.
4. Open `BatterMatrix` → verify each batter row shows correct per-bucket mix.

### Feature 2
1. Open game on two devices; one selects Charter, one selects Viewer.
2. Charter logs a pitch → verify Viewer receives update within ~1 second.
3. Kill Charter's network, log 2 offline pitches, restore network → verify offline queue drains and Viewer receives all pitches.
4. Verify Viewer cannot accidentally submit a pitch (no input UI rendered).
