CREATE TABLE IF NOT EXISTS game_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('charter', 'viewer')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_game_roles_game_id ON game_roles(game_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON game_roles TO bvolante_pitch_tracker;

CREATE OR REPLACE FUNCTION notify_game_update() RETURNS trigger AS $$
DECLARE
    msg_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'pitches' THEN
        msg_type := 'pitch_logged';
    ELSE
        msg_type := 'at_bat_ended';
    END IF;
    PERFORM pg_notify(
        'game_' || NEW.game_id::text,
        json_build_object('type', msg_type, 'id', NEW.id::text, 'game_id', NEW.game_id::text)::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pitches_notify ON pitches;
CREATE TRIGGER pitches_notify
    AFTER INSERT OR UPDATE ON pitches
    FOR EACH ROW EXECUTE PROCEDURE notify_game_update();

DROP TRIGGER IF EXISTS at_bats_notify ON at_bats;
CREATE TRIGGER at_bats_notify
    AFTER INSERT OR UPDATE ON at_bats
    FOR EACH ROW EXECUTE PROCEDURE notify_game_update();
