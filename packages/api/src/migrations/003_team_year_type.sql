-- Migration 003: Team Year & Team Type
-- Adds: team_type and year columns to teams table

ALTER TABLE public.teams
    ADD COLUMN IF NOT EXISTS team_type VARCHAR(20)
        CHECK (team_type IN ('high_school', 'travel', 'club', 'college'));

ALTER TABLE public.teams
    ADD COLUMN IF NOT EXISTS year INTEGER;

CREATE INDEX IF NOT EXISTS idx_teams_type ON public.teams(team_type);
CREATE INDEX IF NOT EXISTS idx_teams_year ON public.teams(year);

-- Ensure app user has permissions (in case tables were created by different user)
GRANT ALL ON TABLE public.teams TO bvolante_pitch_tracker;
