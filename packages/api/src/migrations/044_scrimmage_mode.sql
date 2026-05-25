-- Add 'scrimmage' to charting_mode for intrasquad / practice games where
-- innings don't auto-end on 3 outs, score is hidden, and only our team's
-- pitcher is charted. Treated as 'our_pitcher'-equivalent in the UI for
-- everything except the auto-inning-end + score gating.

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_charting_mode_check;
ALTER TABLE games ADD CONSTRAINT games_charting_mode_check
    CHECK (charting_mode IN ('our_pitcher', 'opp_pitcher', 'both', 'scouting', 'scrimmage'));

GRANT SELECT, INSERT, UPDATE, DELETE ON games TO bvolante_pitch_tracker;
