-- Allow pitches to be logged without a roster pitcher (opp_pitcher mode)
ALTER TABLE public.pitches
    ALTER COLUMN pitcher_id DROP NOT NULL;
