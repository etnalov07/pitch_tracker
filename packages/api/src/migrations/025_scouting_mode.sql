-- Add scouting charting mode and per-team-side player storage

-- 1. Extend charting_mode on games
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_charting_mode_check;
ALTER TABLE games ADD CONSTRAINT games_charting_mode_check
    CHECK (charting_mode IN ('our_pitcher', 'opp_pitcher', 'both', 'scouting'));

-- 2. Free-text home team name for scouting sessions
--    (opponent_name stores the away team; this stores the home team)
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS scouting_home_team TEXT;

-- 3. Allow opposing_pitchers to store pitchers from either scouted team
ALTER TABLE opposing_pitchers
    ADD COLUMN IF NOT EXISTS team_side TEXT CHECK (team_side IN ('home', 'away'));

-- 4. Allow opponent_lineup to store batters from either scouted team
ALTER TABLE opponent_lineup
    ADD COLUMN IF NOT EXISTS team_side TEXT CHECK (team_side IN ('home', 'away'));

CREATE INDEX IF NOT EXISTS idx_opposing_pitchers_team_side ON opposing_pitchers(game_id, team_side);
CREATE INDEX IF NOT EXISTS idx_opponent_lineup_team_side ON opponent_lineup(game_id, team_side);

GRANT SELECT, INSERT, UPDATE, DELETE ON games TO bvolante_pitch_tracker;
GRANT SELECT, INSERT, UPDATE, DELETE ON opposing_pitchers TO bvolante_pitch_tracker;
GRANT SELECT, INSERT, UPDATE, DELETE ON opponent_lineup TO bvolante_pitch_tracker;
