-- Add lineup_size to games table (default 9, supports travel ball expanded lineups)
ALTER TABLE games ADD COLUMN IF NOT EXISTS lineup_size INTEGER NOT NULL DEFAULT 9;

-- Drop the hardcoded batting_order <= 9 constraint and replace with a generous ceiling
ALTER TABLE opponent_lineup DROP CONSTRAINT IF EXISTS opponent_lineup_batting_order_check;
ALTER TABLE opponent_lineup ADD CONSTRAINT opponent_lineup_batting_order_check
    CHECK (batting_order >= 1 AND batting_order <= 15);
