-- Enforce one starter per batting-order slot per team side per game.
-- Replaced players (replaced_by_id IS NOT NULL) are excluded so substitutions
-- during a live game can still insert new rows for the same slot.
CREATE UNIQUE INDEX IF NOT EXISTS opponent_lineup_starter_slot_idx
    ON opponent_lineup (game_id, batting_order, team_side)
    WHERE is_starter = true AND replaced_by_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON opponent_lineup TO bvolante_pitch_tracker;
