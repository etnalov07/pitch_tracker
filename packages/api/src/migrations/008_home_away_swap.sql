-- 008: Add is_home_game flag to games table
-- When true (default), user's team is home. When false, user's team is away.
-- home_team_id and home_score always refer to user's team regardless of this flag.
ALTER TABLE games ADD COLUMN is_home_game BOOLEAN DEFAULT true NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bvolante_pitch_tracker;
