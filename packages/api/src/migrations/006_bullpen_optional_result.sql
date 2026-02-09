-- Migration 006: Make bullpen pitch result optional
-- In bullpen sessions there is no batter, so ball/strike/foul result is not applicable

-- Drop the CHECK constraint first
ALTER TABLE bullpen_pitches DROP CONSTRAINT IF EXISTS bullpen_pitches_result_check;

-- Make result nullable
ALTER TABLE bullpen_pitches ALTER COLUMN result DROP NOT NULL;

-- Re-add CHECK constraint that also allows NULL
ALTER TABLE bullpen_pitches ADD CONSTRAINT bullpen_pitches_result_check CHECK (
    result IS NULL OR result IN ('ball', 'called_strike', 'swinging_strike', 'foul')
);
