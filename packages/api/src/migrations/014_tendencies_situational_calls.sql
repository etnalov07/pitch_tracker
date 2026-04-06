-- Migration 014: Situational call types and shake count
-- Adds category, situational_type, pickoff_base to pitch_calls
-- Adds shake_count to games

-- pitch_calls: add category (default 'pitch' to preserve existing rows)
ALTER TABLE pitch_calls
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'pitch',
    ADD COLUMN IF NOT EXISTS situational_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS pickoff_base VARCHAR(5);

-- Relax the NOT NULL constraints on pitch_type and zone so situational calls
-- (which have no pitch type or zone) can be inserted cleanly.
ALTER TABLE pitch_calls ALTER COLUMN pitch_type DROP NOT NULL;
ALTER TABLE pitch_calls ALTER COLUMN zone DROP NOT NULL;

-- games: track cumulative shake count per game
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS shake_count INTEGER NOT NULL DEFAULT 0;
