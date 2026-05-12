-- Migration: Add jersey_number to batter_scouting_profiles so standalone
-- roster entry can capture it (matches the column already present on
-- opponent_pitcher_profiles, scouting_report_batters, opposing_pitchers).
--
-- Part of the 2026-05-12 "standalone opponent roster" feature
-- (docs/plans/2026-05-12-standalone-opponent-roster.md). Lets coaches add
-- opposing batters to an opponent team without a scouting report or game,
-- including the jersey for later in-game identification.

ALTER TABLE public.batter_scouting_profiles
    ADD COLUMN IF NOT EXISTS jersey_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_batter_scouting_profiles_jersey
    ON public.batter_scouting_profiles(opponent_team_id, jersey_number)
    WHERE jersey_number IS NOT NULL;
