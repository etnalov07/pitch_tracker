-- Migration 035: Widen performance_summaries.source_type
-- Migration 033 added 'team_offense' (12 chars) to the source_type CHECK
-- constraint but left the column as VARCHAR(10) from migration 011, so any
-- INSERT with source_type='team_offense' fails with 22001
-- "value too long for type character varying(10)".
-- Widen to VARCHAR(32) for headroom on future source types.

ALTER TABLE performance_summaries
    ALTER COLUMN source_type TYPE VARCHAR(32);
