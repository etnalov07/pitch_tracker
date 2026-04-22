-- Allow at_bats to reference an opposing_pitcher when charting opp_pitcher mode.
-- pitcher_id is made nullable so rows without a roster pitcher can be inserted.
ALTER TABLE public.at_bats
    ALTER COLUMN pitcher_id DROP NOT NULL;

ALTER TABLE public.at_bats
    ADD COLUMN IF NOT EXISTS opposing_pitcher_id UUID REFERENCES opposing_pitchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_at_bats_opposing_pitcher ON public.at_bats(opposing_pitcher_id);
