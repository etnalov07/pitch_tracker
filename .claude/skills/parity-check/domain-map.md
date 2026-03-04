# Domain Map — Web / Mobile File Mapping

Canonical file locations and expected API surface for each domain.

## File Mapping

### auth

| Layer | Web | Mobile |
|-------|-----|--------|
| Service/API | `packages/web/src/services/authService.ts` | `packages/mobile/src/state/auth/api/authApi.ts` |
| State | — (localStorage direct) | `packages/mobile/src/state/auth/authSlice.ts` |
| Pages/Screens | `packages/web/src/pages/Login.tsx`, `Register.tsx` | `packages/mobile/app/(auth)/login.tsx`, `register.tsx` |

**Expected endpoints:** `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh`

### teams

| Layer | Web | Mobile |
|-------|-----|--------|
| Service/API | `packages/web/src/services/teamService.ts` | `packages/mobile/src/state/teams/api/teamsApi.ts` |
| State | `packages/web/src/state/teams/api/teamsApi.ts` | `packages/mobile/src/state/teams/teamsSlice.ts` |
| Components | `packages/web/src/components/team/` | `packages/mobile/src/components/teams/` |
| Pages/Screens | `packages/web/src/pages/Teams.tsx`, `TeamDetail.tsx` | `packages/mobile/app/(tabs)/teams/` |

**Expected endpoints:** `GET /teams`, `GET /teams/:id`, `POST /teams`, `PUT /teams/:id`, `DELETE /teams/:id`, `POST /teams/:id/logo`, `GET /teams/:id/roster`, `POST /teams/:id/players`, `PUT /teams/:id/players/:playerId`

### games

| Layer | Web | Mobile |
|-------|-----|--------|
| Service/API | `packages/web/src/services/gameService.ts`, `packages/web/src/services/pitchService.ts` | `packages/mobile/src/state/games/api/gamesApi.ts` |
| State | `packages/web/src/state/games/api/gamesApi.ts` | `packages/mobile/src/state/games/gamesSlice.ts` |
| Components | `packages/web/src/components/game/`, `packages/web/src/components/pitcher/` | `packages/mobile/src/components/games/`, `packages/mobile/src/components/pitcher/` |
| Pages/Screens | `packages/web/src/pages/Games.tsx`, `GameDetail.tsx`, `LiveGame.tsx` | `packages/mobile/app/(tabs)/games/`, `packages/mobile/app/live-game/` |

**Expected endpoints:** `GET /games`, `GET /games/:id`, `POST /games`, `PUT /games/:id`, `DELETE /games/:id`, `POST /games/:id/start`, `POST /games/:id/end`, `GET /games/:id/state`, `POST /games/:id/pitches`, `PUT /games/:id/pitches/:pitchId`, `POST /games/:id/at-bats`, `PUT /games/:id/at-bats/:atBatId`, `POST /games/:id/lineup`, `PUT /games/:id/pitcher`

**Known path inconsistency:** Web `gameService.ts` uses `/game/` prefix for some endpoints; web `gamesApi.ts` and all mobile files use `/games/`. Check both prefixes when analyzing.

### bullpen

| Layer | Web | Mobile |
|-------|-----|--------|
| Service/API | `packages/web/src/services/bullpenService.ts` | `packages/mobile/src/state/bullpen/api/bullpenApi.ts` |
| State | — | `packages/mobile/src/state/bullpen/bullpenSlice.ts` |
| Components | `packages/web/src/components/bullpen/` | `packages/mobile/src/components/bullpen/` |
| Pages/Screens | `packages/web/src/pages/BullpenSession.tsx` | `packages/mobile/app/bullpen/` |

**Expected endpoints:** `GET /bullpen/sessions`, `GET /bullpen/sessions/:id`, `POST /bullpen/sessions`, `PUT /bullpen/sessions/:id`, `DELETE /bullpen/sessions/:id`, `POST /bullpen/sessions/:id/pitches`, `GET /bullpen/plans`, `GET /bullpen/plans/:id`, `POST /bullpen/plans`, `PUT /bullpen/plans/:id`, `DELETE /bullpen/plans/:id`, `POST /bullpen/sessions/:id/assign-plan`

### invites

| Layer | Web | Mobile |
|-------|-----|--------|
| Service/API | `packages/web/src/state/invites/api/invitesApi.ts` | `packages/mobile/src/state/invites/api/invitesApi.ts` |
| State | `packages/web/src/state/invites/invitesSlice.ts` | `packages/mobile/src/state/invites/invitesSlice.ts` |
| Components | `packages/web/src/components/invites/` | `packages/mobile/src/components/invites/` |

**Expected endpoints:** `GET /invites`, `POST /invites`, `PUT /invites/:id/accept`, `PUT /invites/:id/decline`, `DELETE /invites/:id`

### analytics

| Layer | Web | Mobile |
|-------|-----|--------|
| Service/API | `packages/web/src/services/pitchService.ts` (analytics methods), `packages/web/src/services/scoutingService.ts` | — (no dedicated mobile analytics API file) |
| Components | `packages/web/src/components/analytics/`, `packages/web/src/components/scouting/` | — |
| Pages/Screens | `packages/web/src/pages/Analytics.tsx`, `PitcherProfile.tsx`, `ScoutingReport.tsx` | — |

**Expected endpoints:** `GET /analytics/pitcher/:id`, `GET /analytics/game/:id/state`, `GET /analytics/team/:id`, `GET /analytics/heat-map`, `GET /analytics/spray-chart`, `GET /scouting/notes`, `POST /scouting/notes`, `PUT /scouting/notes/:id`, `DELETE /scouting/notes/:id`

## Feature-Specific Notes

### auth
- Token refresh logic: web uses axios interceptor, mobile uses Redux middleware. Both should handle 401 → refresh → retry.

### teams
- **Logo upload** (`POST /teams/:id/logo`): Web-only. Uses `multipart/form-data`. Mobile has no equivalent.
- **Team colors**: Web allows setting primary/secondary colors. Mobile displays them but has no edit UI.
- **Player management**: Both platforms should support add/edit players on roster.

### games
- **Game state endpoint**: Web calls `GET /games/:id/state`, mobile calls `GET /analytics/game/:id/state`. These may return different shapes — verify both work.
- **Pitcher change**: Web has a dedicated modal; mobile uses inline picker. Both should call `PUT /games/:id/pitcher`.
- **Opponent batter tracking**: Both platforms should send `opponent_batter_id` when logging pitches (fixed in commit `a027dc5`).
- **Team-at-bat modal**: Both platforms have this for visitor games (added in commit `bd09059`).
- **Add batter to lineup**: Both platforms support this during live games (added in commit `fc73f38`).

### bullpen
- **Plan CRUD** (create/update/delete plans): Web-only. Mobile only reads plans via `GET /bullpen/plans`.
- **Plan assignment** (`POST /bullpen/sessions/:id/assign-plan`): Web-only.
- **Session recording** (creating sessions and logging pitches): Both platforms.

### invites
- Feature parity expected across both platforms. Any gaps are likely bugs.

### analytics
- **Entirely web-only** currently. Heat maps, spray charts, pitcher profiles, scouting notes — none exist on mobile.
- Mobile's `GET /analytics/game/:id/state` call (from the games domain) is the only analytics endpoint mobile uses.

## Known Intentional Gaps

These differences are by design and should be flagged as LOW priority:

1. **Mobile offline queue** — Mobile has `offlineService.ts` for queuing pitches when offline. Web has no equivalent (always online assumed).
2. **Analytics suite** — Web-only by design. Mobile analytics planned for future release.
3. **Bullpen plan management** — Web-only. Mobile coaches view plans but manage them on web.
4. **Team logo/color editing** — Web-only. Mobile displays but doesn't edit.
5. **New Architecture disabled** — Mobile-specific (`newArchEnabled: false`), not a parity issue.
