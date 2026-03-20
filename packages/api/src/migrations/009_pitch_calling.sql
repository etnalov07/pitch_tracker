-- Migration 009: Pitch Calling
-- Coach-to-catcher pitch call system with Bluetooth audio delivery.
-- Captures intended pitch call alongside actual result for call-vs-execution analytics.

CREATE TABLE IF NOT EXISTS pitch_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    at_bat_id UUID REFERENCES at_bats(id) ON DELETE SET NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pitcher_id UUID REFERENCES players(id) ON DELETE SET NULL,
    batter_id UUID REFERENCES players(id) ON DELETE SET NULL,
    opponent_batter_id UUID REFERENCES opponent_lineup(id) ON DELETE SET NULL,
    call_number INT NOT NULL,
    pitch_type VARCHAR(20) NOT NULL,
    zone VARCHAR(20) NOT NULL,
    is_change BOOLEAN NOT NULL DEFAULT false,
    original_call_id UUID REFERENCES pitch_calls(id) ON DELETE SET NULL,
    result VARCHAR(20),
    pitch_id UUID REFERENCES pitches(id) ON DELETE SET NULL,
    bt_transmitted BOOLEAN NOT NULL DEFAULT false,
    called_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inning INT,
    balls_before INT NOT NULL DEFAULT 0,
    strikes_before INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result_logged_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX idx_pitch_calls_game_id ON pitch_calls(game_id);
CREATE INDEX idx_pitch_calls_at_bat_id ON pitch_calls(at_bat_id);
CREATE INDEX idx_pitch_calls_team_id ON pitch_calls(team_id);
CREATE INDEX idx_pitch_calls_pitcher_id ON pitch_calls(pitcher_id);
CREATE INDEX idx_pitch_calls_game_call_number ON pitch_calls(game_id, call_number);
CREATE INDEX idx_pitch_calls_original_call_id ON pitch_calls(original_call_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pitch_calls TO bvolante_pitch_tracker;
