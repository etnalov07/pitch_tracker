# Changelog

All notable changes to the @pitch-tracker/web package will be documented in this file.

## [Unreleased]

### Added
- **Opponent Lineup Page** (`/game/:gameId/lineup`)
  - Enter opponent batting order (1-9) before starting a game
  - Set player name, position, and batting hand for each slot
  - Skip option to add lineup during the game

- **Pitcher Selector Component** (`components/game/PitcherSelector.tsx`)
  - Modal to select pitcher from team roster
  - Shows pitchers who have already pitched in the game
  - Displays "Active" badge for current pitcher
  - Tracks inning entered/exited for pitcher changes

- **Batter Selector Component** (`components/game/BatterSelector.tsx`)
  - Modal to select current opponent batter
  - Shows batting order with "Next Up" indicator
  - Highlights expected next batter based on batting order

- **LiveGame Enhancements**
  - Pitcher and batter display row showing current selections
  - Setup prompt when pitcher/batter not selected
  - Quick link to opponent lineup setup page
  - Automatic batting order advancement after at-bat ends
  - "Start New At-Bat" button disabled until pitcher and batter selected

- New styled components in `LiveGame/styles.ts`:
  - `PlayerDisplay`, `PlayerInfo`, `PlayerLabel`, `PlayerName`, `PlayerNumber`
  - `ChangeButton`, `PlayersRow`
  - `SetupPrompt`, `SetupText`, `SetupButton`

### Changed
- **GameSetup Page**
  - Now filters teams to show only user's owned teams
  - Auto-selects team if user has only one
  - Opponent is now entered as free text (not linked to teams table)
  - Navigates to opponent lineup page after game creation

- **Dashboard**
  - Updated to handle nullable `away_team_id`
  - Shows `opponent_name` when available instead of away team lookup

- **GameHistory**
  - Updated to handle nullable `away_team_id`
  - Shows `opponent_name` when available

- **LiveGame**
  - GameHeader now shows opponent name and "Your Team" labels
  - Replaced hardcoded batter/pitcher IDs with actual selected players

### Fixed
- TypeScript errors with nullable `away_team_id` in game displays
- Team filtering to properly use `owner_id` for user's teams

## [1.0.0] - Initial Release
- Dashboard with active games and quick actions
- Game setup and live game tracking
- Team and player management
- Pitch logging with strike zone visualization
- At-bat tracking with count management
