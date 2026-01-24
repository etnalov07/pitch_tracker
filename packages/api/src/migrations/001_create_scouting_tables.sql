-- Migration: Create Batter Scouting Tables
-- Run this against your PostgreSQL database to add scouting functionality

-- Table: batter_scouting_profiles
-- Purpose: Unique identifier for opponent batters across games
CREATE TABLE IF NOT EXISTS public.batter_scouting_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL,
    opponent_team_name character varying(255) NOT NULL,
    player_name character varying(200) NOT NULL,
    normalized_name character varying(200) NOT NULL,
    bats character varying(10) DEFAULT 'R'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT batter_scouting_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT batter_scouting_profiles_unique UNIQUE (team_id, opponent_team_name, normalized_name),
    CONSTRAINT batter_scouting_profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT batter_scouting_profiles_bats_check CHECK (((bats)::text = ANY ((ARRAY['R'::character varying, 'L'::character varying, 'S'::character varying])::text[])))
);

ALTER TABLE public.batter_scouting_profiles OWNER TO bvolante;
GRANT ALL ON TABLE public.batter_scouting_profiles TO bvolante_pitch_tracker;

-- Table: batter_scouting_notes
-- Purpose: Manual notes from coaches
CREATE TABLE IF NOT EXISTS public.batter_scouting_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    note_text text NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT batter_scouting_notes_pkey PRIMARY KEY (id),
    CONSTRAINT batter_scouting_notes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.batter_scouting_profiles(id) ON DELETE CASCADE,
    CONSTRAINT batter_scouting_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.batter_scouting_notes OWNER TO bvolante;
GRANT ALL ON TABLE public.batter_scouting_notes TO bvolante_pitch_tracker;

-- Table: batter_tendencies
-- Purpose: Cached auto-calculated tendencies
CREATE TABLE IF NOT EXISTS public.batter_tendencies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    total_pitches_seen integer DEFAULT 0,
    total_at_bats integer DEFAULT 0,
    pitches_outside_zone integer DEFAULT 0,
    swings_outside_zone integer DEFAULT 0,
    chase_rate numeric(5,4),
    pitches_inside_zone integer DEFAULT 0,
    takes_inside_zone integer DEFAULT 0,
    watch_rate numeric(5,4),
    early_count_pitches integer DEFAULT 0,
    early_count_swings integer DEFAULT 0,
    early_count_rate numeric(5,4),
    first_pitches integer DEFAULT 0,
    first_pitch_takes integer DEFAULT 0,
    first_pitch_take_rate numeric(5,4),
    breaking_outside integer DEFAULT 0,
    breaking_outside_swings integer DEFAULT 0,
    breaking_chase_rate numeric(5,4),
    zone_tendencies jsonb,
    last_calculated_at timestamp without time zone,
    is_stale boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT batter_tendencies_pkey PRIMARY KEY (id),
    CONSTRAINT batter_tendencies_profile_id_unique UNIQUE (profile_id),
    CONSTRAINT batter_tendencies_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.batter_scouting_profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.batter_tendencies OWNER TO bvolante;
GRANT ALL ON TABLE public.batter_tendencies TO bvolante_pitch_tracker;

-- Table: opponent_lineup_profiles
-- Purpose: Link opponent_lineup entries to scouting profiles
CREATE TABLE IF NOT EXISTS public.opponent_lineup_profiles (
    opponent_lineup_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    CONSTRAINT opponent_lineup_profiles_pkey PRIMARY KEY (opponent_lineup_id),
    CONSTRAINT opponent_lineup_profiles_lineup_fkey FOREIGN KEY (opponent_lineup_id) REFERENCES public.opponent_lineup(id) ON DELETE CASCADE,
    CONSTRAINT opponent_lineup_profiles_profile_fkey FOREIGN KEY (profile_id) REFERENCES public.batter_scouting_profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.opponent_lineup_profiles OWNER TO bvolante;
GRANT ALL ON TABLE public.opponent_lineup_profiles TO bvolante_pitch_tracker;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scouting_profiles_team ON public.batter_scouting_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_scouting_profiles_normalized ON public.batter_scouting_profiles(normalized_name);
CREATE INDEX IF NOT EXISTS idx_scouting_notes_profile ON public.batter_scouting_notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_tendencies_profile ON public.batter_tendencies(profile_id);
CREATE INDEX IF NOT EXISTS idx_tendencies_stale ON public.batter_tendencies(is_stale) WHERE is_stale = true;
CREATE INDEX IF NOT EXISTS idx_lineup_profiles_profile ON public.opponent_lineup_profiles(profile_id);

-- Create triggers for updated_at
CREATE TRIGGER update_batter_scouting_profiles_updated_at
    BEFORE UPDATE ON public.batter_scouting_profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_batter_scouting_notes_updated_at
    BEFORE UPDATE ON public.batter_scouting_notes
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_batter_tendencies_updated_at
    BEFORE UPDATE ON public.batter_tendencies
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
