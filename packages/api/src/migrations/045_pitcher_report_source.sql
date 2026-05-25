-- Migration 045: pitcher_report source type
-- Stores cross-game pitcher performance reports (aggregated stats + Claude
-- narrative + velocity trend + trend call-outs) keyed by (pitcher_id, window_key).
-- source_id is NULL because the report is not pinned to a single game.

ALTER TABLE performance_summaries
    DROP CONSTRAINT IF EXISTS performance_summaries_source_type_check;

ALTER TABLE performance_summaries
    ADD CONSTRAINT performance_summaries_source_type_check
    CHECK (source_type IN ('game', 'bullpen', 'scouting', 'team_offense', 'pitcher_report'));

-- window_key stores the report window ('last5' | 'last10' | 'last20' | 'season' | 'all').
-- Nullable because existing source types don't use it.
ALTER TABLE performance_summaries
    ADD COLUMN IF NOT EXISTS window_key VARCHAR(16);

-- One pitcher_report per (pitcher_id, window_key). source_id stays NULL on these rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_summaries_pitcher_report
    ON performance_summaries(pitcher_id, window_key)
    WHERE source_type = 'pitcher_report';

GRANT SELECT, INSERT, UPDATE, DELETE ON performance_summaries TO bvolante_pitch_tracker;
