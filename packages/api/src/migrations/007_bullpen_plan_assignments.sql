-- Migration 007: Add max_pitches to plans + plan-to-pitcher assignments
-- Enables coaches to assign bullpen plans to specific pitchers

-- Add max_pitches to existing plans table (for count-only plans or sequence limits)
ALTER TABLE bullpen_plans ADD COLUMN IF NOT EXISTS max_pitches integer;

-- Persistent plan-to-pitcher assignments
CREATE TABLE IF NOT EXISTS bullpen_plan_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL REFERENCES bullpen_plans(id) ON DELETE CASCADE,
    pitcher_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, pitcher_id)
);

CREATE INDEX IF NOT EXISTS idx_bullpen_plan_assignments_pitcher ON bullpen_plan_assignments(pitcher_id);
CREATE INDEX IF NOT EXISTS idx_bullpen_plan_assignments_plan ON bullpen_plan_assignments(plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON bullpen_plan_assignments TO bvolante_pitch_tracker;
