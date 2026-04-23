-- Migration 023: Add advancement event types to baserunner_events
-- Adds stolen_base, wild_pitch, passed_ball, balk as non-out event types
-- and runner_to_base column to track where a runner advanced to.

-- Drop the old CHECK constraint so we can extend the allowed values
ALTER TABLE public.baserunner_events
    DROP CONSTRAINT IF EXISTS baserunner_events_type_check;

-- Add new constraint including advancement event types
ALTER TABLE public.baserunner_events
    ADD CONSTRAINT baserunner_events_type_check CHECK (
        event_type IN (
            'caught_stealing', 'pickoff', 'interference', 'passed_runner',
            'appeal_out', 'other',
            'stolen_base', 'wild_pitch', 'passed_ball', 'balk'
        )
    );

-- Add runner_to_base for advancement events (where the runner ended up)
ALTER TABLE public.baserunner_events
    ADD COLUMN IF NOT EXISTS runner_to_base varchar(10);

ALTER TABLE public.baserunner_events
    ADD CONSTRAINT baserunner_events_to_base_check CHECK (
        runner_to_base IS NULL OR runner_to_base IN ('first', 'second', 'third', 'home')
    );

GRANT ALL ON TABLE public.baserunner_events TO bvolante_pitch_tracker;
