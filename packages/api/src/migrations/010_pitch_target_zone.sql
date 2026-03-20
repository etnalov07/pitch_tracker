-- Add target_zone column to pitches table for zone-based targeting
ALTER TABLE pitches ADD COLUMN IF NOT EXISTS target_zone VARCHAR(20);
