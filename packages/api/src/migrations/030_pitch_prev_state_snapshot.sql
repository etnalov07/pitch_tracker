-- Migration 030: Snapshot pre-pitch state on each pitch row
-- Enables full undo of a pitch (count, baserunners, score, at-bat lifecycle).
-- Snapshot captures the at_bats and games fields that mutate downstream of a pitch.
-- Pre-existing pitches receive NULL and cannot be undone.

ALTER TABLE public.pitches
    ADD COLUMN IF NOT EXISTS prev_state jsonb;

GRANT ALL ON TABLE public.pitches TO bvolante_pitch_tracker;
