-- Migration 049: pitch_rules_metadata
-- Adds the data the sanction-aware pitch-rules engine needs:
--   teams.age_division — PG / PBR age bracket; inherited by new games of the team
--   games.age_division — per-game copy (immutable from team after game create)
--   games.sanction     — which sanctioning body's rules apply ('PG'/'PBR'/'HS'/'NONE')
-- All NULL-able. NULL on games.sanction is treated as 'NONE' by the dispatcher.

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS age_division VARCHAR(10) NULL
        CHECK (age_division IS NULL OR age_division IN ('8U','10U','12U','14U','16U','18U'));

ALTER TABLE games
    ADD COLUMN IF NOT EXISTS age_division VARCHAR(10) NULL
        CHECK (age_division IS NULL OR age_division IN ('8U','10U','12U','14U','16U','18U'));

ALTER TABLE games
    ADD COLUMN IF NOT EXISTS sanction VARCHAR(8) NULL
        CHECK (sanction IS NULL OR sanction IN ('PG','PBR','HS','NONE'));

CREATE INDEX IF NOT EXISTS idx_games_sanction ON games(sanction);
CREATE INDEX IF NOT EXISTS idx_games_age_division ON games(age_division);

-- Speeds up the "pitches on date X by pitcher Y" + "consecutive days pitched"
-- queries the rules engine runs every time the selector opens.
CREATE INDEX IF NOT EXISTS idx_pitches_pitcher_game ON pitches(pitcher_id, game_id);
