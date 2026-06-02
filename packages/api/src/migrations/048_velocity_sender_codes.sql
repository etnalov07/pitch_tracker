-- Migration 048: velocity_sender_codes
-- Backs the "Velocity Sender" feature: a no-install web page (or in-app viewer
-- panel) where a second person types a velocity that pre-fills the primary
-- charter's form via the existing WS pg_notify path. A short-lived code maps
-- the public sender to a game_id without giving the sender a JWT or any other
-- credential, so the radar holder doesn't need an account.

CREATE TABLE IF NOT EXISTS velocity_sender_codes (
    code VARCHAR(6) PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_velocity_sender_codes_game_id ON velocity_sender_codes(game_id);
CREATE INDEX IF NOT EXISTS idx_velocity_sender_codes_expires_at ON velocity_sender_codes(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON velocity_sender_codes TO bvolante_pitch_tracker;
