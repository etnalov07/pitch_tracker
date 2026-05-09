-- Migration 029: Baserunner thrown out attempting to advance on a hit
-- Adds thrown_out_advancing event type and a fielder_sequence column for the
-- putout/assist sequence (e.g., 9-2 for "throw from RF, putout by C").

-- Replace the CHECK constraint to include the new event type
ALTER TABLE public.baserunner_events
    DROP CONSTRAINT IF EXISTS baserunner_events_type_check;

ALTER TABLE public.baserunner_events
    ADD CONSTRAINT baserunner_events_type_check CHECK (
        event_type IN (
            'caught_stealing', 'pickoff', 'interference', 'passed_runner',
            'appeal_out', 'other',
            'stolen_base', 'wild_pitch', 'passed_ball', 'balk',
            'thrown_out_advancing'
        )
    );

-- Fielder sequence: smallint[] preserves order (assists then putout).
-- e.g. [9, 2] for a runner thrown out at home from right field.
ALTER TABLE public.baserunner_events
    ADD COLUMN IF NOT EXISTS fielder_sequence smallint[];

-- Validate values are baseball positions 1-9 and length is reasonable
ALTER TABLE public.baserunner_events
    ADD CONSTRAINT baserunner_events_fielder_seq_check CHECK (
        fielder_sequence IS NULL OR (
            array_length(fielder_sequence, 1) BETWEEN 1 AND 5
            AND fielder_sequence <@ ARRAY[1,2,3,4,5,6,7,8,9]::smallint[]
        )
    );

GRANT ALL ON TABLE public.baserunner_events TO bvolante_pitch_tracker;
