-- Allow one performance summary per pitcher per game/session (was one per game/session).
-- Drop the old unique index and replace it with one that includes pitcher_id.
DROP INDEX IF EXISTS idx_performance_summaries_source;

CREATE UNIQUE INDEX idx_performance_summaries_source_pitcher
    ON performance_summaries(source_type, source_id, pitcher_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON performance_summaries TO bvolante_pitch_tracker;
