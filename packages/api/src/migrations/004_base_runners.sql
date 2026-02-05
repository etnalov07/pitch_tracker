-- Migration 004: Base Runners
-- Adds base runner tracking to games and a table for baserunner events (caught stealing, pickoffs, etc.)

-- Add base_runners column to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS base_runners jsonb DEFAULT '{"first": false, "second": false, "third": false}'::jsonb;

-- Create baserunner_events table for caught stealing, pickoffs, etc.
CREATE TABLE IF NOT EXISTS baserunner_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    inning_id uuid NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
    at_bat_id uuid REFERENCES at_bats(id) ON DELETE SET NULL,
    event_type varchar(50) NOT NULL,
    runner_base varchar(10) NOT NULL,
    out_recorded boolean DEFAULT true,
    outs_before integer NOT NULL,
    outs_after integer NOT NULL,
    notes text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT baserunner_events_type_check CHECK (
        event_type IN ('caught_stealing', 'pickoff', 'interference', 'passed_runner', 'appeal_out', 'other')
    ),
    CONSTRAINT baserunner_events_base_check CHECK (
        runner_base IN ('first', 'second', 'third')
    )
);

CREATE INDEX IF NOT EXISTS idx_baserunner_events_game ON baserunner_events(game_id);
CREATE INDEX IF NOT EXISTS idx_baserunner_events_inning ON baserunner_events(inning_id);

-- Grant permissions
GRANT ALL ON TABLE baserunner_events TO bvolante_pitch_tracker;
