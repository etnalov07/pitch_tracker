-- Migration 047: Expand pitch_calls.result enum to match PitchResult (UX-PC-04).
-- Before: 'strike' | 'ball' | 'foul' | 'in_play'  (4 buckets, lossy)
-- After:  'called_strike' | 'swinging_strike' | 'ball' | 'foul' | 'in_play' | 'hit_by_pitch'  (6, 1:1 with PitchResult)
--
-- The lossy old bucket collapsed both called_strike and swinging_strike into 'strike',
-- and hit_by_pitch into 'ball'. Backfill the legacy 'strike' rows to 'called_strike'
-- (conservative — without the original pitch context we can't recover swinging_strike).
-- The 'ball' rows stay as-is; if any of them were actually HBP, that information is lost.

UPDATE pitch_calls SET result = 'called_strike' WHERE result = 'strike';

-- No CHECK constraint existed previously (column is VARCHAR(20)). Add one now so the DB
-- enforces the new enum alongside the service-layer validation in pitchCall.service.ts.
ALTER TABLE pitch_calls
    ADD CONSTRAINT pitch_calls_result_check
    CHECK (result IS NULL OR result IN ('called_strike', 'swinging_strike', 'ball', 'foul', 'in_play', 'hit_by_pitch'));
