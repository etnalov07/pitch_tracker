-- Add charting_mode to games
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS charting_mode VARCHAR(20) NOT NULL DEFAULT 'our_pitcher'
        CHECK (charting_mode IN ('our_pitcher', 'opp_pitcher', 'both'));

-- Add team_side to pitches
ALTER TABLE pitches
    ADD COLUMN IF NOT EXISTS team_side VARCHAR(20)
        CHECK (team_side IN ('our_team', 'opponent'));

-- Opposing pitchers table (lightweight, one row per opp pitcher per game)
CREATE TABLE IF NOT EXISTS opposing_pitchers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_name   VARCHAR(100) NOT NULL,
    pitcher_name VARCHAR(100) NOT NULL,
    jersey_number SMALLINT,
    throws      CHAR(1) NOT NULL CHECK (throws IN ('R', 'L')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opposing_pitchers_game_id ON opposing_pitchers(game_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON opposing_pitchers TO bvolante_pitch_tracker;
