-- Migration: Opponent Scouting Reports (PLANS.md #22)
-- Pre-game scouting reports that sit alongside the existing batter_scouting_* tables.
-- Coaches create a report per opponent (optionally linked to an upcoming game) and
-- pre-fill batter-level notes / zone weakness / pitch vulnerabilities, plus team-level
-- tendencies (steal / bunt / hit-and-run).

CREATE TABLE IF NOT EXISTS public.scouting_reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL,
    opponent_name character varying(255) NOT NULL,
    game_id uuid,
    game_date date,
    notes text,
    steal_frequency character varying(10),
    bunt_frequency character varying(10),
    hit_and_run_frequency character varying(10),
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scouting_reports_pkey PRIMARY KEY (id),
    CONSTRAINT scouting_reports_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT scouting_reports_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL,
    CONSTRAINT scouting_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT scouting_reports_steal_check CHECK (steal_frequency IS NULL OR steal_frequency IN ('low','medium','high')),
    CONSTRAINT scouting_reports_bunt_check CHECK (bunt_frequency IS NULL OR bunt_frequency IN ('low','medium','high')),
    CONSTRAINT scouting_reports_hitrun_check CHECK (hit_and_run_frequency IS NULL OR hit_and_run_frequency IN ('low','medium','high'))
);

ALTER TABLE public.scouting_reports OWNER TO bvolante;
GRANT ALL ON TABLE public.scouting_reports TO bvolante_pitch_tracker;

CREATE TABLE IF NOT EXISTS public.scouting_report_batters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL,
    player_name character varying(200) NOT NULL,
    jersey_number integer,
    batting_order integer,
    bats character varying(10) DEFAULT 'R'::character varying,
    notes text,
    zone_weakness jsonb,
    pitch_vulnerabilities jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scouting_report_batters_pkey PRIMARY KEY (id),
    CONSTRAINT scouting_report_batters_report_fkey FOREIGN KEY (report_id) REFERENCES public.scouting_reports(id) ON DELETE CASCADE,
    CONSTRAINT scouting_report_batters_bats_check CHECK ((bats)::text = ANY ((ARRAY['R'::character varying, 'L'::character varying, 'S'::character varying])::text[]))
);

ALTER TABLE public.scouting_report_batters OWNER TO bvolante;
GRANT ALL ON TABLE public.scouting_report_batters TO bvolante_pitch_tracker;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scouting_reports_team ON public.scouting_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_scouting_reports_game ON public.scouting_reports(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scouting_report_batters_report ON public.scouting_report_batters(report_id);
CREATE INDEX IF NOT EXISTS idx_scouting_report_batters_jersey ON public.scouting_report_batters(report_id, jersey_number) WHERE jersey_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scouting_report_batters_name ON public.scouting_report_batters(report_id, lower(player_name));

-- Triggers for updated_at
CREATE TRIGGER update_scouting_reports_updated_at
    BEFORE UPDATE ON public.scouting_reports
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_scouting_report_batters_updated_at
    BEFORE UPDATE ON public.scouting_report_batters
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
