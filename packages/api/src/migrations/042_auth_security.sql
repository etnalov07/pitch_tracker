-- Migration 042: Auth security hardening
-- Adds: password-reset tokens, account-lockout after repeated failed logins,
-- a password-change timestamp for session invalidation, and an auth-event log
-- (failed logins / lockouts / resets) separate from admin_audit — auth events
-- can be anonymous (a failed login for an unknown email) which admin_audit's
-- NOT NULL actor + restricted actor_role cannot represent.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    event_type VARCHAR(48) NOT NULL,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_email ON auth_events(email);

GRANT SELECT, INSERT, UPDATE, DELETE ON password_resets TO bvolante_pitch_tracker;
GRANT SELECT, INSERT ON auth_events TO bvolante_pitch_tracker;
