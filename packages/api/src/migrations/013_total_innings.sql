-- Add total_innings to games table (7 = travel/HS default, 9 = college)
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_innings INTEGER NOT NULL DEFAULT 7;

GRANT ALL ON games TO bvolante_pitch_tracker;
