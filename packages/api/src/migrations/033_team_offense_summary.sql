-- Migration 033: team_offense source type
-- Stores per-game opponent attack narrative + summary for our hitters.
-- pitcher_id is NULL (the summary is team-wide, not pitcher-specific).

ALTER TABLE performance_summaries
    DROP CONSTRAINT IF EXISTS performance_summaries_source_type_check;

ALTER TABLE performance_summaries
    ADD CONSTRAINT performance_summaries_source_type_check
    CHECK (source_type IN ('game', 'bullpen', 'scouting', 'team_offense'));

-- One team_offense summary per game (pitcher_id is NULL so the existing
-- (source_type, source_id, pitcher_id) unique index doesn't apply).
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_summaries_team_offense
    ON performance_summaries(source_id)
    WHERE source_type = 'team_offense';

GRANT SELECT, INSERT, UPDATE, DELETE ON performance_summaries TO bvolante_pitch_tracker;
