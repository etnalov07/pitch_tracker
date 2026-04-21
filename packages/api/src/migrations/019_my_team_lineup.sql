CREATE TABLE IF NOT EXISTS my_team_lineup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    batting_order INT NOT NULL CHECK (batting_order >= 1 AND batting_order <= 20),
    position VARCHAR(10),
    is_starter BOOLEAN NOT NULL DEFAULT true,
    replaced_by_id UUID REFERENCES my_team_lineup(id),
    inning_entered INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_team_lineup_game_id ON my_team_lineup(game_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON my_team_lineup TO bvolante_pitch_tracker;
