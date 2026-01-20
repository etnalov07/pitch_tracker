# Changelog

All notable changes to the @pitch-tracker/shared package will be documented in this file.

## [Unreleased]

### Added
- `OpponentLineupPlayer` type for tracking opponent batting order with substitution support
- `GamePitcher` type for tracking pitcher changes during games
- `GamePitcherWithPlayer` type that includes player details for display
- `opponent_name` field to `Game` type for storing opponent team name as free text

### Changed
- `away_team_id` in `Game` type is now optional (nullable) to support opponent-name-only games
- Games can now be created without linking to an away team in the teams table

### Database Migration
- New `opponent_lineup` table for game-specific opponent batting order
- New `game_pitchers` table for tracking pitcher usage per game
- `games.away_team_id` altered to be nullable
- `games.opponent_name` column added

## [1.0.0] - Initial Release
- Core shared types for Teams, Players, Games, AtBats, Pitches, and Innings
