-- Migration 032: Add advance_on_throw event type
-- Captures runners (or batters) who advanced extra bases on a throwing or
-- fielding error, including pickoff attempts where the throw got away. The
-- batter's origin is recorded as runner_base = 'home'.

ALTER TABLE public.baserunner_events
    DROP CONSTRAINT IF EXISTS baserunner_events_type_check;

ALTER TABLE public.baserunner_events
    ADD CONSTRAINT baserunner_events_type_check CHECK (
        event_type IN (
            'caught_stealing', 'pickoff', 'interference', 'passed_runner',
            'appeal_out', 'other',
            'stolen_base', 'wild_pitch', 'passed_ball', 'balk',
            'thrown_out_advancing',
            'advance_on_throw'
        )
    );

-- Allow 'home' as a runner_base origin so we can record the batter advancing
-- on a throw (e.g., single, took 2nd on the throw) using runner_base='home'.
ALTER TABLE public.baserunner_events
    DROP CONSTRAINT IF EXISTS baserunner_events_base_check;

ALTER TABLE public.baserunner_events
    ADD CONSTRAINT baserunner_events_base_check CHECK (
        runner_base IN ('first', 'second', 'third', 'home')
    );

GRANT ALL ON TABLE public.baserunner_events TO bvolante_pitch_tracker;
