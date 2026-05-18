-- Migration 043: one charter per game
-- game_roles previously allowed any number of users to hold role='charter' for
-- the same game. Demote all but the earliest charter of each game to viewer,
-- then enforce the rule with a partial unique index.

UPDATE game_roles
SET role = 'viewer'
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY assigned_at, id) AS rn
        FROM game_roles
        WHERE role = 'charter'
    ) ranked
    WHERE ranked.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_roles_one_charter
    ON game_roles (game_id)
    WHERE role = 'charter';
