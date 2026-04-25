-- Opponent Intelligence System: persistent opponent team registry,
-- pitcher profiles, tendencies, and links to existing scouting data.

-- Opponent team registry (per owning team)
CREATE TABLE IF NOT EXISTS opponent_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    level TEXT,
    notes TEXT,
    games_played INTEGER NOT NULL DEFAULT 0,
    last_game_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_opponent_teams_team_id ON opponent_teams(team_id);

-- Opponent pitcher profiles (persistent identity per opponent team)
CREATE TABLE IF NOT EXISTS opponent_pitcher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opponent_team_id UUID NOT NULL REFERENCES opponent_teams(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pitcher_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    jersey_number INTEGER,
    throws CHAR(1) NOT NULL DEFAULT 'R',
    games_pitched INTEGER NOT NULL DEFAULT 0,
    last_seen_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (opponent_team_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_opp_pitcher_profiles_team ON opponent_pitcher_profiles(opponent_team_id);
CREATE INDEX IF NOT EXISTS idx_opp_pitcher_profiles_owning_team ON opponent_pitcher_profiles(team_id);

-- Aggregated pitcher tendencies (updated after each scouted game)
CREATE TABLE IF NOT EXISTS opponent_pitcher_tendencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES opponent_pitcher_profiles(id) ON DELETE CASCADE,
    total_pitches INTEGER NOT NULL DEFAULT 0,
    total_at_bats INTEGER NOT NULL DEFAULT 0,
    strike_percentage NUMERIC(5,2),
    first_pitch_strike_pct NUMERIC(5,2),
    fastball_pct NUMERIC(5,2),
    offspeed_pct NUMERIC(5,2),
    breaking_pct NUMERIC(5,2),
    early_count_fastball_pct NUMERIC(5,2),
    two_strike_offspeed_pct NUMERIC(5,2),
    pitch_mix JSONB NOT NULL DEFAULT '{}',
    zone_tendencies JSONB NOT NULL DEFAULT '{}',
    last_calculated_at TIMESTAMPTZ,
    is_stale BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link games to opponent teams
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_team_id UUID REFERENCES opponent_teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_games_opponent_team_id ON games(opponent_team_id);

-- Link opposing_pitchers to their persistent profile
ALTER TABLE opposing_pitchers ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES opponent_pitcher_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_opposing_pitchers_profile_id ON opposing_pitchers(profile_id);

-- Link batter_scouting_profiles to opponent teams
ALTER TABLE batter_scouting_profiles ADD COLUMN IF NOT EXISTS opponent_team_id UUID REFERENCES opponent_teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_batter_scouting_profiles_opp_team ON batter_scouting_profiles(opponent_team_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON opponent_teams TO bvolante_pitch_tracker;
GRANT SELECT, INSERT, UPDATE, DELETE ON opponent_pitcher_profiles TO bvolante_pitch_tracker;
GRANT SELECT, INSERT, UPDATE, DELETE ON opponent_pitcher_tendencies TO bvolante_pitch_tracker;
