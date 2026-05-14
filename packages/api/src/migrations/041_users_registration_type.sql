-- Migration 041: users.registration_type
-- Nullable VARCHAR holding the mode the user signed up under.
-- Existing rows stay NULL and are treated as 'coach' by the dashboard branching
-- shell, preserving every current user's behavior exactly. New rows always
-- carry one of: 'coach' | 'player' | 'org_admin'. Validation lives at the
-- application layer (auth.routes.ts) so we can evolve the set without a
-- schema migration each time.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS registration_type VARCHAR(16);

CREATE INDEX IF NOT EXISTS idx_users_registration_type ON users(registration_type) WHERE registration_type IS NOT NULL;
