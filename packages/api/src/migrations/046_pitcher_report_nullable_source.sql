-- Migration 046: allow NULL source_id on pitcher_report rows
-- Follow-up to 045. pitcher_report rows aren't pinned to a single game/bullpen
-- (the source is the pitcher + window), so source_id must be nullable.
-- All other source types continue to populate source_id; the partial unique
-- index on pitcher_report uses (pitcher_id, window_key) so the lack of
-- source_id doesn't break uniqueness.

ALTER TABLE performance_summaries
    ALTER COLUMN source_id DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON performance_summaries TO bvolante_pitch_tracker;
