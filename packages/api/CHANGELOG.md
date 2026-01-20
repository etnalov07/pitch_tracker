# Changelog

All notable changes to the @pitch-tracker/api package will be documented in this file.

## [Unreleased]

### Added
- **Opponent Lineup API** (`/bt-api/opponent-lineup/`)
  - `GET /game/:gameId` - Get opponent lineup for a game
  - `POST /game/:gameId` - Add player to opponent lineup
  - `POST /game/:gameId/bulk` - Add multiple players to opponent lineup
  - `PUT /:id` - Update opponent lineup player
  - `POST /:id/substitute` - Substitute a player in the lineup
  - `DELETE /:id` - Remove player from opponent lineup

- **Game Pitchers API** (`/bt-api/game-pitchers/`)
  - `GET /game/:gameId` - Get all pitchers used in a game
  - `GET /game/:gameId/current` - Get current active pitcher
  - `POST /game/:gameId` - Add pitcher to game
  - `POST /game/:gameId/change` - Change pitcher (marks previous as exited)
  - `PUT /:id` - Update game pitcher record
  - `DELETE /:id` - Remove pitcher from game

- New service layer files:
  - `opponentLineup.service.ts` - Business logic for opponent lineup management
  - `gamePitcher.service.ts` - Business logic for game pitcher management

### Changed
- `game.service.ts` - Updated to support optional `away_team_id` and new `opponent_name` field
- `createGame` now accepts `opponent_name` parameter
- Game queries use LEFT JOIN for away_team to handle null values

## [1.0.0] - Initial Release
- Core API endpoints for authentication, teams, players, games, at-bats, pitches, and innings
