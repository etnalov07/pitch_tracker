-- Add 'scouting' summary type and make pitcher_id optional (scouting summaries cover whole game)
ALTER TABLE performance_summaries
    DROP CONSTRAINT IF EXISTS performance_summaries_source_type_check;
ALTER TABLE performance_summaries
    ADD CONSTRAINT performance_summaries_source_type_check
    CHECK (source_type IN ('game', 'bullpen', 'scouting'));

-- pitcher_id is null for scouting summaries (no single my-team pitcher)
ALTER TABLE performance_summaries
    ALTER COLUMN pitcher_id DROP NOT NULL;

ALTER TABLE performance_summaries
    DROP CONSTRAINT IF EXISTS performance_summaries_pitcher_id_fkey;
ALTER TABLE performance_summaries
    ADD CONSTRAINT performance_summaries_pitcher_id_fkey
    FOREIGN KEY (pitcher_id) REFERENCES players(id) ON DELETE CASCADE;

-- One scouting summary per game (pitcher_id is NULL so the existing unique index won't help)
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_summaries_scouting
    ON performance_summaries(source_id)
    WHERE source_type = 'scouting';

GRANT SELECT, INSERT, UPDATE, DELETE ON performance_summaries TO bvolante_pitch_tracker;
