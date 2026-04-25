--
-- PostgreSQL database dump
--

-- Dumped from database version 10.23
-- Dumped by pg_dump version 10.23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: gen_random_uuid(); Type: FUNCTION; Schema: public; Owner: bvolante
--

CREATE FUNCTION public.gen_random_uuid() RETURNS uuid
    LANGUAGE sql
    AS $$
            SELECT md5(random()::text || clock_timestamp()::text)::uuid;
        $$;


ALTER FUNCTION public.gen_random_uuid() OWNER TO bvolante;

--
-- Name: notify_game_update(); Type: FUNCTION; Schema: public; Owner: bvolante
--

CREATE FUNCTION public.notify_game_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    msg_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'pitches' THEN
        msg_type := 'pitch_logged';
    ELSE
        msg_type := 'at_bat_ended';
    END IF;
    PERFORM pg_notify(
        'game_' || NEW.game_id::text,
        json_build_object('type', msg_type, 'id', NEW.id::text, 'game_id', NEW.game_id::text)::text
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_game_update() OWNER TO bvolante;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: bvolante
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO bvolante;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: at_bats; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.at_bats (
    id uuid NOT NULL,
    game_id uuid NOT NULL,
    inning_id uuid NOT NULL,
    batter_id uuid,
    pitcher_id uuid NOT NULL,
    batting_order integer,
    balls integer DEFAULT 0,
    strikes integer DEFAULT 0,
    outs_before integer NOT NULL,
    outs_after integer NOT NULL,
    result character varying(50),
    rbi integer DEFAULT 0,
    runs_scored integer DEFAULT 0,
    ab_start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ab_end_time timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    opponent_batter_id uuid
);


ALTER TABLE public.at_bats OWNER TO bvolante;

--
-- Name: baserunner_events; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.baserunner_events (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    inning_id uuid NOT NULL,
    at_bat_id uuid,
    event_type character varying(50) NOT NULL,
    runner_base character varying(10) NOT NULL,
    out_recorded boolean DEFAULT true,
    outs_before integer NOT NULL,
    outs_after integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT baserunner_events_base_check CHECK (((runner_base)::text = ANY ((ARRAY['first'::character varying, 'second'::character varying, 'third'::character varying])::text[]))),
    CONSTRAINT baserunner_events_type_check CHECK (((event_type)::text = ANY ((ARRAY['caught_stealing'::character varying, 'pickoff'::character varying, 'interference'::character varying, 'passed_runner'::character varying, 'appeal_out'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.baserunner_events OWNER TO bvolante;

--
-- Name: batter_scouting_notes; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.batter_scouting_notes (
    id uuid NOT NULL,
    profile_id uuid NOT NULL,
    note_text text NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.batter_scouting_notes OWNER TO bvolante;

--
-- Name: batter_scouting_profiles; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.batter_scouting_profiles (
    id uuid NOT NULL,
    team_id uuid,
    opponent_team_name character varying(255) NOT NULL,
    player_name character varying(200) NOT NULL,
    normalized_name character varying(200) NOT NULL,
    bats character varying(10) DEFAULT 'R'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.batter_scouting_profiles OWNER TO bvolante;

--
-- Name: batter_tendencies; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.batter_tendencies (
    id uuid NOT NULL,
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.batter_tendencies OWNER TO bvolante;

--
-- Name: bullpen_pitches; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.bullpen_pitches (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    pitch_number integer NOT NULL,
    pitch_type character varying(20) NOT NULL,
    target_x numeric(6,4),
    target_y numeric(6,4),
    actual_x numeric(6,4),
    actual_y numeric(6,4),
    velocity numeric(5,1),
    result character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bullpen_pitches_result_check CHECK (((result IS NULL) OR ((result)::text = ANY ((ARRAY['ball'::character varying, 'called_strike'::character varying, 'swinging_strike'::character varying, 'foul'::character varying])::text[]))))
);


ALTER TABLE public.bullpen_pitches OWNER TO bvolante;

--
-- Name: bullpen_plan_assignments; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.bullpen_plan_assignments (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    pitcher_id uuid NOT NULL,
    assigned_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bullpen_plan_assignments OWNER TO bvolante;

--
-- Name: bullpen_plan_pitches; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.bullpen_plan_pitches (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    sequence integer NOT NULL,
    pitch_type character varying(20) NOT NULL,
    target_x numeric(6,4),
    target_y numeric(6,4),
    instruction text
);


ALTER TABLE public.bullpen_plan_pitches OWNER TO bvolante;

--
-- Name: bullpen_plans; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.bullpen_plans (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    max_pitches integer
);


ALTER TABLE public.bullpen_plans OWNER TO bvolante;

--
-- Name: bullpen_sessions; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.bullpen_sessions (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    pitcher_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    intensity character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    notes text,
    plan_id uuid,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bullpen_sessions_intensity_check CHECK (((intensity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT bullpen_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.bullpen_sessions OWNER TO bvolante;

--
-- Name: game_pitchers; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.game_pitchers (
    id uuid NOT NULL,
    game_id uuid NOT NULL,
    player_id uuid NOT NULL,
    pitching_order integer NOT NULL,
    inning_entered integer DEFAULT 1 NOT NULL,
    inning_exited integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT game_pitchers_pitching_order_check CHECK ((pitching_order >= 1))
);


ALTER TABLE public.game_pitchers OWNER TO bvolante;

--
-- Name: game_roles; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.game_roles (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    game_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT game_roles_role_check CHECK (((role)::text = ANY ((ARRAY['charter'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.game_roles OWNER TO bvolante;

--
-- Name: games; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.games (
    id uuid NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid,
    game_date date NOT NULL,
    game_time time without time zone,
    location character varying(255),
    status character varying(50) DEFAULT 'scheduled'::character varying,
    home_score integer DEFAULT 0,
    away_score integer DEFAULT 0,
    current_inning integer DEFAULT 1,
    inning_half character varying(10) DEFAULT 'top'::character varying,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    opponent_name character varying(255),
    base_runners jsonb DEFAULT '{"first": false, "third": false, "second": false}'::jsonb,
    is_home_game boolean DEFAULT true NOT NULL,
    lineup_size integer DEFAULT 9 NOT NULL,
    total_innings integer DEFAULT 7 NOT NULL,
    shake_count integer DEFAULT 0 NOT NULL,
    charting_mode character varying(20) DEFAULT 'our_pitcher'::character varying NOT NULL,
    CONSTRAINT games_charting_mode_check CHECK (((charting_mode)::text = ANY ((ARRAY['our_pitcher'::character varying, 'opp_pitcher'::character varying, 'both'::character varying])::text[]))),
    CONSTRAINT games_inning_half_check CHECK (((inning_half)::text = ANY ((ARRAY['top'::character varying, 'bottom'::character varying])::text[]))),
    CONSTRAINT games_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.games OWNER TO bvolante;

--
-- Name: innings; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.innings (
    id uuid NOT NULL,
    game_id uuid NOT NULL,
    inning_number integer NOT NULL,
    half character varying(10) NOT NULL,
    batting_team_id uuid NOT NULL,
    pitching_team_id uuid NOT NULL,
    runs_scored integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_opponent_batting boolean DEFAULT false,
    CONSTRAINT innings_half_check CHECK (((half)::text = ANY ((ARRAY['top'::character varying, 'bottom'::character varying])::text[])))
);


ALTER TABLE public.innings OWNER TO bvolante;

--
-- Name: invites; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.invites (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    token character varying(128) NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid,
    invited_by uuid NOT NULL,
    invited_email character varying(255),
    role character varying(20) DEFAULT 'player'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    accepted_by uuid,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invites_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'coach'::character varying, 'assistant'::character varying, 'player'::character varying])::text[]))),
    CONSTRAINT invites_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'expired'::character varying, 'revoked'::character varying])::text[])))
);


ALTER TABLE public.invites OWNER TO bvolante;

--
-- Name: join_requests; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.join_requests (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    linked_player_id uuid,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT join_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'denied'::character varying])::text[])))
);


ALTER TABLE public.join_requests OWNER TO bvolante;

--
-- Name: my_team_lineup; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.my_team_lineup (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    player_id uuid NOT NULL,
    batting_order integer NOT NULL,
    "position" character varying(10),
    is_starter boolean DEFAULT true NOT NULL,
    replaced_by_id uuid,
    inning_entered integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT my_team_lineup_batting_order_check CHECK (((batting_order >= 1) AND (batting_order <= 20)))
);


ALTER TABLE public.my_team_lineup OWNER TO bvolante;

--
-- Name: opponent_lineup; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.opponent_lineup (
    id uuid NOT NULL,
    game_id uuid NOT NULL,
    player_name character varying(200) NOT NULL,
    batting_order integer NOT NULL,
    "position" character varying(20),
    bats character varying(10) DEFAULT 'R'::character varying,
    is_starter boolean DEFAULT true,
    replaced_by_id uuid,
    inning_entered integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT opponent_lineup_bats_check CHECK (((bats)::text = ANY ((ARRAY['R'::character varying, 'L'::character varying, 'S'::character varying])::text[]))),
    CONSTRAINT opponent_lineup_batting_order_check CHECK (((batting_order >= 1) AND (batting_order <= 15)))
);


ALTER TABLE public.opponent_lineup OWNER TO bvolante;

--
-- Name: opponent_lineup_profiles; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.opponent_lineup_profiles (
    opponent_lineup_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


ALTER TABLE public.opponent_lineup_profiles OWNER TO bvolante;

--
-- Name: opposing_pitchers; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.opposing_pitchers (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    team_name character varying(100) NOT NULL,
    pitcher_name character varying(100) NOT NULL,
    jersey_number smallint,
    throws character(1) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT opposing_pitchers_throws_check CHECK ((throws = ANY (ARRAY['R'::bpchar, 'L'::bpchar])))
);


ALTER TABLE public.opposing_pitchers OWNER TO bvolante;

--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'coach'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organization_members_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'coach'::character varying])::text[])))
);


ALTER TABLE public.organization_members OWNER TO bvolante;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.organizations (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    logo_path character varying(500),
    primary_color character varying(7),
    secondary_color character varying(7),
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.organizations OWNER TO bvolante;

--
-- Name: performance_summaries; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.performance_summaries (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    source_type character varying(10) NOT NULL,
    source_id uuid NOT NULL,
    pitcher_id uuid NOT NULL,
    team_id uuid NOT NULL,
    narrative text,
    narrative_generated_at timestamp with time zone,
    total_pitches integer DEFAULT 0 NOT NULL,
    strikes integer DEFAULT 0 NOT NULL,
    balls integer DEFAULT 0 NOT NULL,
    strike_percentage numeric(5,2) DEFAULT 0,
    target_accuracy_percentage numeric(5,2),
    batters_faced integer,
    innings_pitched numeric(4,1),
    runs_allowed integer,
    hits_allowed integer,
    intensity character varying(10),
    plan_name character varying(255),
    metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
    pitch_type_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    highlights jsonb DEFAULT '[]'::jsonb NOT NULL,
    concerns jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT performance_summaries_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['game'::character varying, 'bullpen'::character varying])::text[])))
);


ALTER TABLE public.performance_summaries OWNER TO bvolante;

--
-- Name: pitch_calls; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.pitch_calls (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    at_bat_id uuid,
    team_id uuid NOT NULL,
    pitcher_id uuid,
    batter_id uuid,
    opponent_batter_id uuid,
    call_number integer NOT NULL,
    pitch_type character varying(20),
    zone character varying(20),
    is_change boolean DEFAULT false NOT NULL,
    original_call_id uuid,
    result character varying(20),
    pitch_id uuid,
    bt_transmitted boolean DEFAULT false NOT NULL,
    called_by uuid NOT NULL,
    inning integer,
    balls_before integer DEFAULT 0 NOT NULL,
    strikes_before integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    result_logged_at timestamp with time zone,
    category character varying(20) DEFAULT 'pitch'::character varying NOT NULL,
    situational_type character varying(30),
    pickoff_base character varying(5)
);


ALTER TABLE public.pitch_calls OWNER TO bvolante;

--
-- Name: pitcher_pitch_types; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.pitcher_pitch_types (
    id uuid NOT NULL,
    player_id uuid NOT NULL,
    pitch_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pitcher_pitch_types OWNER TO bvolante;

--
-- Name: pitches; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.pitches (
    id uuid NOT NULL,
    at_bat_id uuid NOT NULL,
    game_id uuid NOT NULL,
    pitcher_id uuid NOT NULL,
    batter_id uuid,
    pitch_number integer NOT NULL,
    pitch_type character varying(50) NOT NULL,
    velocity numeric(5,2),
    location_x numeric(5,4),
    location_y numeric(5,4),
    zone character varying(20),
    balls_before integer NOT NULL,
    strikes_before integer NOT NULL,
    pitch_result character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    opponent_batter_id uuid,
    target_location_x numeric(5,4),
    target_location_y numeric(5,4),
    target_zone character varying(20),
    team_side character varying(20),
    CONSTRAINT pitches_team_side_check CHECK (((team_side)::text = ANY ((ARRAY['our_team'::character varying, 'opponent'::character varying])::text[])))
);


ALTER TABLE public.pitches OWNER TO bvolante;

--
-- Name: players; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.players (
    id uuid NOT NULL,
    team_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    jersey_number character varying(10),
    primary_position character varying(50) NOT NULL,
    bats character varying(10),
    throws character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id uuid,
    CONSTRAINT players_bats_check CHECK (((bats)::text = ANY ((ARRAY['R'::character varying, 'L'::character varying, 'S'::character varying])::text[]))),
    CONSTRAINT players_throws_check CHECK (((throws)::text = ANY ((ARRAY['R'::character varying, 'L'::character varying])::text[])))
);


ALTER TABLE public.players OWNER TO bvolante;

--
-- Name: plays; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.plays (
    id uuid NOT NULL,
    pitch_id uuid NOT NULL,
    at_bat_id uuid NOT NULL,
    contact_type character varying(50) NOT NULL,
    contact_quality character varying(50),
    hit_direction character varying(50),
    field_location character varying(50),
    hit_depth character varying(50),
    hit_result character varying(50),
    out_type character varying(50),
    fielded_by_position character varying(20),
    is_error boolean DEFAULT false,
    is_out boolean NOT NULL,
    runs_scored integer DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plays_contact_quality_check CHECK (((contact_quality)::text = ANY ((ARRAY['hard'::character varying, 'medium'::character varying, 'soft'::character varying, 'weak'::character varying])::text[]))),
    CONSTRAINT plays_contact_type_check CHECK (((contact_type)::text = ANY ((ARRAY['ground_ball'::character varying, 'fly_ball'::character varying, 'line_drive'::character varying, 'pop_up'::character varying, 'bunt'::character varying])::text[]))),
    CONSTRAINT plays_field_location_check CHECK (((field_location)::text = ANY ((ARRAY['left_field_line'::character varying, 'left_field'::character varying, 'left_center_gap'::character varying, 'center_field'::character varying, 'right_center_gap'::character varying, 'right_field'::character varying, 'right_field_line'::character varying, 'infield_left'::character varying, 'infield_middle'::character varying, 'infield_right'::character varying, 'foul_territory'::character varying])::text[]))),
    CONSTRAINT plays_hit_depth_check CHECK (((hit_depth)::text = ANY ((ARRAY['infield'::character varying, 'shallow_outfield'::character varying, 'medium_outfield'::character varying, 'deep_outfield'::character varying, 'warning_track'::character varying])::text[]))),
    CONSTRAINT plays_hit_direction_check CHECK (((hit_direction)::text = ANY ((ARRAY['pull_side'::character varying, 'center'::character varying, 'opposite_field'::character varying])::text[])))
);


ALTER TABLE public.plays OWNER TO bvolante;

--
-- Name: scouting_report_batters; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.scouting_report_batters (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
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
    CONSTRAINT scouting_report_batters_bats_check CHECK (((bats)::text = ANY (ARRAY[('R'::character varying)::text, ('L'::character varying)::text, ('S'::character varying)::text])))
);


ALTER TABLE public.scouting_report_batters OWNER TO bvolante;

--
-- Name: scouting_reports; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.scouting_reports (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
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
    CONSTRAINT scouting_reports_bunt_check CHECK (((bunt_frequency IS NULL) OR ((bunt_frequency)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))),
    CONSTRAINT scouting_reports_hitrun_check CHECK (((hit_and_run_frequency IS NULL) OR ((hit_and_run_frequency)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))),
    CONSTRAINT scouting_reports_steal_check CHECK (((steal_frequency IS NULL) OR ((steal_frequency)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))))
);


ALTER TABLE public.scouting_reports OWNER TO bvolante;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.team_members (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'player'::character varying NOT NULL,
    player_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'coach'::character varying, 'assistant'::character varying, 'player'::character varying])::text[])))
);


ALTER TABLE public.team_members OWNER TO bvolante;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.teams (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    owner_id uuid NOT NULL,
    organization character varying(255),
    age_group character varying(50),
    season character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logo_path character varying(500),
    primary_color character varying(7) DEFAULT '#3b82f6'::character varying,
    secondary_color character varying(7) DEFAULT '#1f2937'::character varying,
    accent_color character varying(7) DEFAULT '#22c55e'::character varying,
    organization_id uuid,
    team_type character varying(20),
    year integer,
    CONSTRAINT teams_team_type_check CHECK (((team_type)::text = ANY ((ARRAY['high_school'::character varying, 'travel'::character varying, 'club'::character varying, 'college'::character varying])::text[])))
);


ALTER TABLE public.teams OWNER TO bvolante;

--
-- Name: users; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO bvolante;

--
-- Data for Name: at_bats; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.at_bats (id, game_id, inning_id, batter_id, pitcher_id, batting_order, balls, strikes, outs_before, outs_after, result, rbi, runs_scored, ab_start_time, ab_end_time, created_at, opponent_batter_id) FROM stdin;
1ca25042-1a7a-4f8b-8fb5-730d2d0c0822	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	single	0	0	2026-01-21 22:51:52.246363	\N	2026-01-21 22:51:52.246363	d687b69b-cbbe-4122-af75-7e786a1cf1a7
1b5ee1cf-6859-44c2-84c2-285929af91ab	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	2	lineout	0	0	2026-01-22 23:50:44.76881	\N	2026-01-22 23:50:44.76881	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
2a32c6d7-7fb3-4e67-8dd1-106372114976	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	1	groundout	0	0	2026-01-21 22:52:39.184801	\N	2026-01-21 22:52:39.184801	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	76949c6c-843e-4522-a1a6-a84bae6b0d6e	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	3	0	0	strikeout	0	0	2026-01-20 23:44:16.731844	\N	2026-01-20 23:44:16.731844	3d9b8c8f-3652-4e5f-8a6a-5556285445fe
79e778c0-f83b-4811-9189-eed55891dffb	e233efaa-5749-4c7f-9647-2db19d4a9f0b	76949c6c-843e-4522-a1a6-a84bae6b0d6e	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	in_play	0	0	2026-01-20 23:58:26.642265	\N	2026-01-20 23:58:26.642265	7be31580-ae60-4282-8f4d-9796b2002ad8
a80440ad-acb9-4d95-8ece-1401fd21db99	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	1	home_run	0	0	2026-01-21 22:53:33.468828	\N	2026-01-21 22:53:33.468828	d687b69b-cbbe-4122-af75-7e786a1cf1a7
f5794d8e-4f51-4600-a292-a906d4a1ea33	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	1	\N	0	0	2026-01-21 22:54:23.512653	\N	2026-01-21 22:54:23.512653	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
23ce0076-952d-47bd-afc8-4cf86e6d2dfc	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	0	0	0	\N	0	0	2026-01-21 23:58:50.768924	\N	2026-01-21 23:58:50.768924	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	3	0	0	strikeout	0	0	2026-01-21 00:17:10.046499	\N	2026-01-21 00:17:10.046499	e3afda0f-473b-4aa5-85f4-9b652c492a80
7e09826d-ada8-47de-9efd-c4d2db0f7177	e233efaa-5749-4c7f-9647-2db19d4a9f0b	76949c6c-843e-4522-a1a6-a84bae6b0d6e	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	1	0	0	\N	0	0	2026-01-23 22:08:51.686143	\N	2026-01-23 22:08:51.686143	3d9b8c8f-3652-4e5f-8a6a-5556285445fe
8e976ac0-1b7a-4194-8418-b11ee106673b	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	\N	0	0	2026-01-23 22:45:39.319059	\N	2026-01-23 22:45:39.319059	e3afda0f-473b-4aa5-85f4-9b652c492a80
dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	3	2	3	strikeout	0	0	2026-01-22 23:51:01.225241	\N	2026-01-22 23:51:01.225241	d687b69b-cbbe-4122-af75-7e786a1cf1a7
b96e0e75-a1b1-4097-a22f-ae85ea2ed985	634fd53a-11f5-415e-88d9-db923f545bad	9f43a090-1737-4a10-b4fb-8a4058b644fa	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	\N	0	0	2026-01-22 23:52:04.814734	\N	2026-01-22 23:52:04.814734	e3afda0f-473b-4aa5-85f4-9b652c492a80
35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	2	0	0	walk	0	0	2026-01-21 00:30:43.592121	\N	2026-01-21 00:30:43.592121	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
101ebfcd-1795-48d9-946c-0013af115c22	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	in_play	0	0	2026-01-21 00:42:35.1222	\N	2026-01-21 00:42:35.1222	e3afda0f-473b-4aa5-85f4-9b652c492a80
ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2	0	1	popout	0	0	2026-01-22 00:02:24.098406	\N	2026-01-22 00:02:24.098406	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	2	0	0	\N	0	0	2026-01-21 00:43:18.005681	\N	2026-01-21 00:43:18.005681	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
4835a84b-71fa-4c73-881a-aa3ce35bc177	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	1	flyout	0	0	2026-01-21 22:39:30.868245	\N	2026-01-21 22:39:30.868245	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
cd89ef63-da1a-4d87-a3a9-128b567b7f3b	634fd53a-11f5-415e-88d9-db923f545bad	9f43a090-1737-4a10-b4fb-8a4058b644fa	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	1	lineout	0	0	2026-01-23 00:00:04.470306	\N	2026-01-23 00:00:04.470306	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
fa85d054-2cff-424c-9d38-ea6cf07feff0	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	2	groundout	0	0	2026-01-21 22:45:20.46595	\N	2026-01-21 22:45:20.46595	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
be2b9521-7b69-4ce2-b8f8-485a98840cdd	634fd53a-11f5-415e-88d9-db923f545bad	e098f799-fd69-4a97-a77c-d65019ab5ef9	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	2	3	popout	0	0	2026-01-21 22:45:51.046204	\N	2026-01-21 22:45:51.046204	d687b69b-cbbe-4122-af75-7e786a1cf1a7
a53c2728-d4cd-46c7-be89-d128cd560f34	634fd53a-11f5-415e-88d9-db923f545bad	9f43a090-1737-4a10-b4fb-8a4058b644fa	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	2	groundout	0	0	2026-01-23 00:00:17.129498	\N	2026-01-23 00:00:17.129498	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	3	0	1	strikeout	0	0	2026-01-22 22:41:00.982044	\N	2026-01-22 22:41:00.982044	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
f9a58a1f-20d0-47f8-ad12-56a29941cf78	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	1	0	0	\N	0	0	2026-01-22 22:50:49.633639	\N	2026-01-22 22:50:49.633639	d687b69b-cbbe-4122-af75-7e786a1cf1a7
84081899-e3a4-4b41-ba93-2ed559101db6	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	\N	0	0	2026-01-22 22:57:32.754483	\N	2026-01-22 22:57:32.754483	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
476dabaa-1b9c-4def-bfce-980d6ac71f92	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	1	0	0	\N	0	0	2026-01-22 23:09:05.332708	\N	2026-01-22 23:09:05.332708	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
03ed91c3-7f69-4c0b-8615-13b7c9d8fd6b	634fd53a-11f5-415e-88d9-db923f545bad	9f43a090-1737-4a10-b4fb-8a4058b644fa	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	2	3	groundout	0	0	2026-01-23 00:00:36.343362	\N	2026-01-23 00:00:36.343362	d687b69b-cbbe-4122-af75-7e786a1cf1a7
0c90c67b-bae8-428c-9525-35e1c4e79a71	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	\N	0	0	2026-01-23 00:00:57.493906	\N	2026-01-23 00:00:57.493906	e3afda0f-473b-4aa5-85f4-9b652c492a80
a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	cb4efa38-cafa-42b6-8885-b6556492eab2	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	3	0	1	strikeout	0	0	2026-01-22 23:37:49.967669	\N	2026-01-22 23:37:49.967669	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
b51af127-cf10-4489-bd45-64d00926b7a8	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	1	0	0	\N	0	0	2026-01-23 11:54:35.700638	\N	2026-01-23 11:54:35.700638	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
fd080331-7147-436c-8eee-349ddc48b21b	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	0	0	\N	0	0	2026-01-23 22:48:23.890674	\N	2026-01-23 22:48:23.890674	e3afda0f-473b-4aa5-85f4-9b652c492a80
a0938b80-5e21-40a3-846c-a421f9d6a31e	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	1	0	0	\N	0	0	2026-01-27 22:13:25.642675	\N	2026-01-27 22:13:25.642675	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
adb0cd0d-6159-4d9c-9e23-023b82281a04	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	4	0	0	0	0	\N	0	0	2026-01-29 23:09:37.578372	\N	2026-01-29 23:09:37.578372	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	3	0	1	strikeout	0	0	2026-01-23 15:12:27.264917	\N	2026-01-23 15:12:27.264917	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
1edf74da-bff8-4948-bb27-7ed1fe38f03d	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	1	\N	0	0	2026-01-23 15:13:38.241488	\N	2026-01-23 15:13:38.241488	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
368aaade-dd4b-48a7-a772-1ff4bb0e512d	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	4	0	0	0	0	\N	0	0	2026-01-29 23:19:04.550935	\N	2026-01-29 23:19:04.550935	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	3	0	1	strikeout	0	0	2026-01-23 22:43:37.182998	\N	2026-01-23 22:43:37.182998	e3afda0f-473b-4aa5-85f4-9b652c492a80
b3b82072-0219-4544-9aa6-0863f6360576	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	1	error	0	0	2026-01-23 22:44:36.794225	\N	2026-01-23 22:44:36.794225	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
7f986991-e524-413b-b7f2-3cdc6a2ba13a	634fd53a-11f5-415e-88d9-db923f545bad	a084a8ff-161a-413e-aaea-5bc1c5b92f84	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	0	1	3	double_play	0	0	2026-01-23 22:45:14.910758	\N	2026-01-23 22:45:14.910758	d687b69b-cbbe-4122-af75-7e786a1cf1a7
6acefdbf-4d43-4b58-99bc-745ac1d2e15c	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	4	0	0	0	1	strikeout	0	0	2026-01-29 23:35:24.23319	\N	2026-01-29 23:35:24.23319	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92
6460c488-6810-4eab-b3ed-512af946cc98	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	5	0	0	1	2	flyout	0	0	2026-01-29 23:35:43.007689	\N	2026-01-29 23:35:43.007689	a4ec5dc3-de54-4032-8f63-10b368cdacc8
3895753e-ff9f-4b11-b336-8e9251e9c4bf	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	6	0	0	2	2	single	0	0	2026-01-29 23:36:04.628298	\N	2026-01-29 23:36:04.628298	8e21c4ad-da7a-4eca-87a1-5fc413245196
15ca7c41-5c2d-4918-806e-95edd9ebd394	634fd53a-11f5-415e-88d9-db923f545bad	c657c598-a091-49a6-9252-12f406edfe10	\N	51e16641-e136-455a-80ee-4a07873b79e5	7	0	0	2	3	groundout	0	0	2026-01-29 23:36:31.963192	\N	2026-01-29 23:36:31.963192	b2a034c5-80cc-406c-8737-9ba09e217e26
d4a20eaf-8cc6-47e3-b18d-d432bc05549f	634fd53a-11f5-415e-88d9-db923f545bad	eeb12d78-460c-49dd-abe8-ce602f01527c	\N	51e16641-e136-455a-80ee-4a07873b79e5	1	0	0	0	0	\N	0	0	2026-01-29 23:36:48.890868	\N	2026-01-29 23:36:48.890868	e3afda0f-473b-4aa5-85f4-9b652c492a80
45bf3f90-d4ec-46d1-b7ab-f5c0628f295a	634fd53a-11f5-415e-88d9-db923f545bad	eeb12d78-460c-49dd-abe8-ce602f01527c	\N	51e16641-e136-455a-80ee-4a07873b79e5	\N	0	1	0	0	\N	0	0	2026-01-31 19:43:02.629106	\N	2026-01-31 19:43:02.629106	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2	0	0	walk	0	0	2026-02-02 20:32:55.8519	\N	2026-02-02 20:32:55.8519	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1
f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	3	0	1	strikeout	0	0	2026-02-02 20:35:40.516377	\N	2026-02-02 20:35:40.516377	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628
c3615983-d255-4ab6-9c41-411e28a5dde0	4e141044-1db9-4114-b901-961f8198be85	f3ebeb00-71a2-47db-a3c6-ccbe9397f4b7	\N	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	2	3	0	1	strikeout	0	0	2026-02-13 17:12:15.694033	\N	2026-02-13 17:12:15.694033	bfaff040-ac17-408b-a706-12f5e99a323f
1050059d-7e79-42f9-9358-3350d5364ba8	4e141044-1db9-4114-b901-961f8198be85	f3ebeb00-71a2-47db-a3c6-ccbe9397f4b7	\N	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	0	1	1	1	\N	0	0	2026-02-13 17:14:28.723851	\N	2026-02-13 17:14:28.723851	753857ca-ccc5-48fc-8e53-c269ec6b0ef9
546ceff4-ac12-4376-bf12-08bb55d852da	976d8be2-e7be-46c1-8d31-4166938055e8	13635562-2fba-469c-947d-ad21be800ace	\N	51e16641-e136-455a-80ee-4a07873b79e5	1	0	0	0	0	\N	0	0	2026-03-02 23:33:01.057873	\N	2026-03-02 23:33:01.057873	e47853c4-097c-4857-a5a8-12b262aea5fe
c759c354-b296-4bfb-aa92-e4221ebcd789	a5a1479f-a177-4479-87d8-fe8c8660aa29	5a7100ed-f68e-4f29-afc1-1095576b7864	\N	51e16641-e136-455a-80ee-4a07873b79e5	1	0	0	0	0	\N	0	0	2026-03-03 09:24:57.435174	\N	2026-03-03 09:24:57.435174	c8570706-5564-4fd6-b4ad-b4a3f0be13fb
aeab017a-1b7a-4da7-b519-002acc10a63a	a5a1479f-a177-4479-87d8-fe8c8660aa29	5a7100ed-f68e-4f29-afc1-1095576b7864	\N	51e16641-e136-455a-80ee-4a07873b79e5	2	0	0	0	0	\N	0	0	2026-03-04 22:45:44.719131	\N	2026-03-04 22:45:44.719131	84087b62-c439-409a-bde7-54791abe9c27
adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2	1	1	walk	0	0	2026-02-02 20:38:07.300944	\N	2026-02-02 20:38:07.300944	fe099dde-7555-47ae-b3ec-72120f6b4fda
9cf2cbb1-9df9-4325-baee-dbcc6b1f3cc5	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	51e16641-e136-455a-80ee-4a07873b79e5	2	0	0	0	0	\N	0	0	2026-03-04 22:48:51.798011	\N	2026-03-04 22:48:51.798011	63ff096c-0595-4314-b725-aaf8280e2c19
c9c11c3f-f0eb-43b0-a977-617d57bc9338	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	1	1	2	popout	0	0	2026-02-02 20:40:00.946706	\N	2026-02-02 20:40:00.946706	be9d483f-4d8c-4104-9e50-f4cbbb36e0b6
8ecf4e87-05af-435e-81e5-69bfc21ae40b	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	2	2	\N	0	0	2026-02-02 20:41:58.565393	\N	2026-02-02 20:41:58.565393	1f17134b-d9fa-4559-aae0-c2d3cbfc6fb5
ca7f5b46-1719-42e6-830d-449774864643	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 22:46:51.822298	\N	2026-03-15 22:46:51.822298	61a0a8b0-9e5c-491c-bafb-a41de7949f59
e9e86f03-46eb-45ee-ba96-8753d8b26898	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 23:08:38.312163	\N	2026-03-15 23:08:38.312163	61a0a8b0-9e5c-491c-bafb-a41de7949f59
0f2eb886-29cf-4cc3-adb5-304984f946e7	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	\N	351ac884-2701-4be0-a855-071557cb07d0	\N	0	2	0	0	double	0	0	2026-02-05 00:41:21.300314	\N	2026-02-05 00:41:21.300314	7dafc19a-198f-4701-b37b-d63ca107dac1
a05e95db-7565-41c5-bd55-8aa58de72a0a	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	\N	351ac884-2701-4be0-a855-071557cb07d0	\N	0	0	0	0	single	0	0	2026-02-05 00:41:55.982602	\N	2026-02-05 00:41:55.982602	8c07d735-d4c4-4bd2-a34d-fc45e68dcaad
5d979ca7-6890-41bb-8e67-fd7aa35a8f9b	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	\N	351ac884-2701-4be0-a855-071557cb07d0	\N	0	0	0	0	home_run	0	0	2026-02-05 00:42:25.795323	\N	2026-02-05 00:42:25.795323	9f110a54-32bf-4ac7-978c-2801aed6fdcb
31e43892-f592-417f-b4cf-8cb9563cc053	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	\N	351ac884-2701-4be0-a855-071557cb07d0	\N	0	0	0	0	double	0	0	2026-02-05 00:42:47.504581	\N	2026-02-05 00:42:47.504581	1f781ed5-2c9f-4d85-982f-34f6aeefde2e
0fdb71d2-402b-4a73-98c3-caed60644ebc	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	\N	351ac884-2701-4be0-a855-071557cb07d0	\N	0	0	0	0	\N	0	0	2026-02-05 00:43:48.663181	\N	2026-02-05 00:43:48.663181	21b6d76e-d25c-411e-975c-a7d072d0438d
ff1bc6a0-7ee3-4d50-b9be-be3a62bfaa06	634fd53a-11f5-415e-88d9-db923f545bad	eeb12d78-460c-49dd-abe8-ce602f01527c	\N	51e16641-e136-455a-80ee-4a07873b79e5	2	0	0	0	0	\N	0	0	2026-02-08 22:55:20.759443	\N	2026-02-08 22:55:20.759443	cabfb8c4-99a8-4882-8eac-6827b6cec2f7
f40bc34a-0731-48b7-8fd5-daf4308a4a59	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 23:19:03.297277	\N	2026-03-15 23:19:03.297277	61a0a8b0-9e5c-491c-bafb-a41de7949f59
2c9b0f52-1e84-47ca-8ce8-69d5da4e2fe1	8c2af398-28db-4eba-b765-58158c5902c9	3122e6fe-7f0f-405c-911c-859e1487d774	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	3	0	1	strikeout	0	0	2026-03-12 22:49:24.048943	2026-03-12 22:49:56.218127	2026-03-12 22:49:24.048943	c1d687c0-d0c8-4e16-897f-ad5afe353af0
2387a23b-b36f-4738-b778-6f9601d40dc7	87e627cd-6475-4920-8631-cde341d811df	3b250dd6-a645-4dbd-b353-e439ab3fdddf	\N	9d973e4d-32eb-4b78-af3c-682d622ceccc	\N	0	2	0	0	triple	0	0	2026-02-09 13:36:56.465277	\N	2026-02-09 13:36:56.465277	2377fb0a-da7f-4562-9e6f-fda99c878cf5
3cd320d6-629b-42aa-bc9b-ac7ec0b172fa	87e627cd-6475-4920-8631-cde341d811df	3b250dd6-a645-4dbd-b353-e439ab3fdddf	\N	9d973e4d-32eb-4b78-af3c-682d622ceccc	\N	0	0	0	0	\N	0	0	2026-02-09 14:00:09.972874	\N	2026-02-09 14:00:09.972874	aa54fd9b-4bd2-4ad0-a9ba-b75401fdec57
76f4e4b0-4d17-4209-9ecc-e6d7d4f15de5	87e627cd-6475-4920-8631-cde341d811df	3b250dd6-a645-4dbd-b353-e439ab3fdddf	\N	9d973e4d-32eb-4b78-af3c-682d622ceccc	2	0	0	0	0	\N	0	0	2026-02-09 14:04:12.297743	\N	2026-02-09 14:04:12.297743	aa54fd9b-4bd2-4ad0-a9ba-b75401fdec57
f70588bc-533c-4af0-834b-6516998627be	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	\N	351ac884-2701-4be0-a855-071557cb07d0	\N	0	0	0	0	\N	0	0	2026-02-09 23:52:15.402502	\N	2026-02-09 23:52:15.402502	7dafc19a-198f-4701-b37b-d63ca107dac1
bdb24ba2-3b59-4667-8cbc-bc939377f6f2	8c2af398-28db-4eba-b765-58158c5902c9	3122e6fe-7f0f-405c-911c-859e1487d774	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	1	1	\N	0	0	2026-03-12 22:49:56.513684	\N	2026-03-12 22:49:56.513684	c25c7c6f-39ed-4f94-8945-11be7631e18b
72150695-30ca-4556-a36f-b3c9de5963c3	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 23:29:53.265607	\N	2026-03-15 23:29:53.265607	61a0a8b0-9e5c-491c-bafb-a41de7949f59
e7cafb91-d222-4f7a-87d0-5d6fd7b01dbf	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 23:30:18.990266	\N	2026-03-15 23:30:18.990266	61a0a8b0-9e5c-491c-bafb-a41de7949f59
6dd640cc-1547-4a71-8c7a-f365b05ea83c	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	97d78e20-46ee-458f-bd27-a4d780f4bc58	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	1	lineout	0	0	2026-03-15 21:55:44.153054	2026-03-15 21:56:04.280397	2026-03-15 21:55:44.153054	61a0a8b0-9e5c-491c-bafb-a41de7949f59
f7b771db-d54e-41af-a263-97d647e7cbe2	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 23:48:19.571048	\N	2026-03-15 23:48:19.571048	61a0a8b0-9e5c-491c-bafb-a41de7949f59
ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	f3ebeb00-71a2-47db-a3c6-ccbe9397f4b7	\N	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	4	2	0	0	walk	0	0	2026-02-13 17:09:16.233763	\N	2026-02-13 17:09:16.233763	008496cd-9ad8-4761-8206-a60c57c94d2f
9b9346bb-e72f-4e4e-bcb0-4c5b47de136c	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 23:55:21.152801	\N	2026-03-15 23:55:21.152801	61a0a8b0-9e5c-491c-bafb-a41de7949f59
5b172646-0540-4e50-ae73-d4ebf8874b3f	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	97d78e20-46ee-458f-bd27-a4d780f4bc58	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	1	3	1	2	strikeout	0	0	2026-03-15 21:56:04.4673	2026-03-15 21:56:36.993601	2026-03-15 21:56:04.4673	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32
ca3f9b72-3a77-4713-9da6-26435a3ca1a4	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	1	0	0	\N	0	0	2026-03-16 00:15:40.146868	\N	2026-03-16 00:15:40.146868	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32
a5d03c3d-b4e6-4281-99b0-9eccadc2658d	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	0	0	0	\N	0	0	2026-03-16 00:02:16.395672	\N	2026-03-16 00:02:16.395672	61a0a8b0-9e5c-491c-bafb-a41de7949f59
40ff69a7-2021-4019-8e00-6caf2d7083ac	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	97d78e20-46ee-458f-bd27-a4d780f4bc58	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	3	0	0	2	3	popout	0	0	2026-03-15 21:56:37.151898	2026-03-15 21:56:48.334507	2026-03-15 21:56:37.151898	e76bcd26-4fa4-42ee-88bf-b57239ba2123
f428280c-42c1-465f-bb56-6970d8514886	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	4	0	0	0	0	\N	0	0	2026-03-15 21:56:50.92393	\N	2026-03-15 21:56:50.92393	4d648849-e475-48fd-8480-28f6f6069a95
c9d3b9e4-9b67-4ec5-a26a-d6cea40c49c2	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 22:24:25.863679	\N	2026-03-15 22:24:25.863679	ea7730c0-2016-4f46-8fc8-c91be3d05be4
1071db76-2fa8-4459-8615-479bbf6b3d5a	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 22:24:45.324202	\N	2026-03-15 22:24:45.324202	61a0a8b0-9e5c-491c-bafb-a41de7949f59
0b0c0509-856a-477f-81bf-70801e18e2af	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-15 22:46:13.930625	\N	2026-03-15 22:46:13.930625	61a0a8b0-9e5c-491c-bafb-a41de7949f59
97d1c56d-e181-4a3f-8ec0-13dffc906ce9	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-16 00:22:04.849644	\N	2026-03-16 00:22:04.849644	61a0a8b0-9e5c-491c-bafb-a41de7949f59
ed6d3ca2-ae7a-4bf8-9107-4bd40a012f20	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	1	0	0	\N	0	0	2026-03-16 00:34:37.846302	\N	2026-03-16 00:34:37.846302	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32
2a2cbc2f-cc4a-46ad-8108-5d5197031d02	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	a19c90d3-ed39-4cfe-9467-599b3d608bce	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	1	0	0	\N	0	0	2026-03-20 16:40:18.518699	\N	2026-03-20 16:40:18.518699	6e83c4de-d823-4ce4-892e-d1f3983e9002
adbbf247-2181-4d2c-bf5c-21dc0206717a	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	a19c90d3-ed39-4cfe-9467-599b3d608bce	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	0	\N	0	0	2026-03-20 16:46:06.850788	\N	2026-03-20 16:46:06.850788	6e83c4de-d823-4ce4-892e-d1f3983e9002
2a94d2c1-bcec-4ccf-adf7-1f725e3113d0	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	3	0	1	strikeout	0	0	2026-03-20 14:04:10.592725	2026-03-20 14:04:37.496725	2026-03-20 14:04:10.592725	61a0a8b0-9e5c-491c-bafb-a41de7949f59
61bf71cc-9a48-48a2-bce2-60f10068e89a	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	737c7860-17ac-4309-ad75-2fcd80c2a49d	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	0	1	1	\N	0	0	2026-03-20 14:04:37.662537	\N	2026-03-20 14:04:37.662537	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32
ffe96a8b-20bf-446c-910d-d3d2764c18fe	a131e300-b856-4fa5-bc35-b1be4040129e	edd02fa2-2583-463a-a6de-d9e76fde59e6	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-20 16:53:26.564441	\N	2026-03-20 16:53:26.564441	df9cb11e-03de-4efe-a36a-957be2f75a19
928939fd-39c8-4d38-8d66-0afbf5602401	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-20 16:53:55.646628	\N	2026-03-20 16:53:55.646628	ea7730c0-2016-4f46-8fc8-c91be3d05be4
5a8bf2df-7433-443f-b59e-b679ba711de7	a131e300-b856-4fa5-bc35-b1be4040129e	edd02fa2-2583-463a-a6de-d9e76fde59e6	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-20 17:00:58.986793	\N	2026-03-20 17:00:58.986793	df9cb11e-03de-4efe-a36a-957be2f75a19
8e0cd2bc-2e81-4650-b0f7-4fcaece2a584	a131e300-b856-4fa5-bc35-b1be4040129e	edd02fa2-2583-463a-a6de-d9e76fde59e6	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-20 17:14:06.842878	\N	2026-03-20 17:14:06.842878	df9cb11e-03de-4efe-a36a-957be2f75a19
0247db5b-1759-46b7-baef-9bc825517ff2	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	0	0	\N	0	0	2026-03-21 01:18:56.408975	\N	2026-03-21 01:18:56.408975	ea7730c0-2016-4f46-8fc8-c91be3d05be4
eab7d575-e82c-4f7f-a71e-aef047d80552	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	f660d9b8-d770-4254-96a5-9a506f7408ef	\N	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	0	0	0	0	\N	0	0	2026-03-21 01:30:03.408328	\N	2026-03-21 01:30:03.408328	3a330c61-0d90-4496-b0af-549cb8da50e3
0049be9b-028e-4e5c-94e4-bc72947120d6	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	f660d9b8-d770-4254-96a5-9a506f7408ef	\N	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	0	0	0	0	\N	0	0	2026-03-21 01:38:40.443949	\N	2026-03-21 01:38:40.443949	3a330c61-0d90-4496-b0af-549cb8da50e3
3a4e05b3-3dbd-4a27-b138-ac337977a67e	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	0	\N	0	0	2026-03-21 01:49:57.279331	\N	2026-03-21 01:49:57.279331	ea7730c0-2016-4f46-8fc8-c91be3d05be4
c8e11f0c-fa5b-44cb-8806-525f27beb03b	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	f660d9b8-d770-4254-96a5-9a506f7408ef	\N	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	0	1	0	0	\N	0	0	2026-03-21 02:08:01.289116	\N	2026-03-21 02:08:01.289116	3a330c61-0d90-4496-b0af-549cb8da50e3
38960cd9-7cfb-4189-b258-52a8cd468aa5	33f5e62c-befd-4a85-813d-758fb5b1b29b	56bd40d8-3fa8-446e-9a38-0a9d328824b5	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	0	\N	0	0	2026-03-21 02:19:38.948607	\N	2026-03-21 02:19:38.948607	039f65c5-444c-4e0d-af25-7bcc2331afe0
566028ec-63ed-4529-80b1-84598b47ef53	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	0	\N	0	0	2026-03-21 09:32:10.737193	\N	2026-03-21 09:32:10.737193	ea7730c0-2016-4f46-8fc8-c91be3d05be4
60a9c686-2794-441e-be34-8cdd722fb3d9	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-21 13:10:49.33373	\N	2026-03-21 13:10:49.33373	ea7730c0-2016-4f46-8fc8-c91be3d05be4
39c87a4d-1207-4b81-864f-ceb449b420e2	1e64745e-4bac-454a-8095-de423ed085c0	a45894c9-b274-43d4-adb6-8c303b730b76	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	1	groundout	0	0	2026-03-29 23:58:54.967764	2026-03-29 23:59:10.948858	2026-03-29 23:58:54.967764	9ca52c4a-b026-4b42-bfb4-4912855f36e0
07eca636-604d-4155-b499-0cf41670fc0e	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	3	0	3	2	3	strikeout	0	0	2026-03-29 20:16:29.758588	2026-03-29 20:16:48.959095	2026-03-29 20:16:29.758588	7a1ee07d-dc91-483d-b698-561f8d0f9362
5a4eed9c-a7b2-4800-8c85-2d919f9b3c24	90026341-347a-4f0a-b995-ab1373d67c57	d3965ff0-fbe1-4c2f-8c01-3cf149490373	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	4	0	0	0	0	\N	0	0	2026-03-29 20:17:00.139634	\N	2026-03-29 20:17:00.139634	6005e8ee-7b5c-45ff-83c6-afc933222b99
2f38f521-2a95-498d-a224-c22e5f544e18	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	3	0	1	strikeout	0	0	2026-03-22 01:48:03.875333	2026-03-22 01:49:38.428221	2026-03-22 01:48:03.875333	ea7730c0-2016-4f46-8fc8-c91be3d05be4
f93eecd0-815c-4ddd-80bb-9fd36e8cfef8	22f56c6b-093e-47f5-af95-daa5a8a7373e	c3b722e2-01f9-4458-aa39-988e05ed8863	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	0	1	1	\N	0	0	2026-03-22 01:49:38.59137	\N	2026-03-22 01:49:38.59137	3817f318-0fa6-490b-907f-2e2866bd7860
3cc45f55-c5b6-40f3-bbb3-2634ff522cfb	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-22 11:59:23.306626	\N	2026-03-22 11:59:23.306626	88f16340-616c-402c-bb1e-5ee07d6d0a42
8cf59f04-5e8f-4aef-aa36-71a8bc854f87	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-23 21:30:29.790064	\N	2026-03-23 21:30:29.790064	88f16340-616c-402c-bb1e-5ee07d6d0a42
3e597028-c8e7-47ae-acad-dc5575ca0b31	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-25 00:33:10.082884	\N	2026-03-25 00:33:10.082884	88f16340-616c-402c-bb1e-5ee07d6d0a42
bcdee466-9c7f-4b09-992c-4db18443b320	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	1	0	0	\N	0	0	2026-03-25 01:06:52.486176	\N	2026-03-25 01:06:52.486176	63ff096c-0595-4314-b725-aaf8280e2c19
6bbb74bb-1266-45c3-bd3b-691fc0c2880b	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-25 01:08:22.31975	\N	2026-03-25 01:08:22.31975	88f16340-616c-402c-bb1e-5ee07d6d0a42
f679c3f8-0594-44a9-81c4-3a48a6a2af4d	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-25 01:31:51.635266	\N	2026-03-25 01:31:51.635266	88f16340-616c-402c-bb1e-5ee07d6d0a42
5aa8b118-9885-4dd7-936e-98db06d3202c	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-25 01:32:21.381156	\N	2026-03-25 01:32:21.381156	88f16340-616c-402c-bb1e-5ee07d6d0a42
7b917869-3af0-4844-acc9-0da4ccbaa0c1	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-25 01:55:38.07046	\N	2026-03-25 01:55:38.07046	88f16340-616c-402c-bb1e-5ee07d6d0a42
517c2bc3-3ba7-4ab9-8bda-870582f42083	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-25 02:09:36.78638	\N	2026-03-25 02:09:36.78638	88f16340-616c-402c-bb1e-5ee07d6d0a42
91a7dfd0-7fa2-4a59-9c4d-70632fc5baf8	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-29 15:11:31.186637	\N	2026-03-29 15:11:31.186637	88f16340-616c-402c-bb1e-5ee07d6d0a42
8fdfe099-bc8d-4acb-b19d-954785da423d	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	0	\N	0	0	2026-03-29 18:28:09.493736	\N	2026-03-29 18:28:09.493736	88f16340-616c-402c-bb1e-5ee07d6d0a42
7cd4b302-be5b-4449-9233-79d8b1a64620	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-29 19:21:03.199066	\N	2026-03-29 19:21:03.199066	88f16340-616c-402c-bb1e-5ee07d6d0a42
408fc664-9346-489a-be2b-fa24e9511fd9	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-29 19:51:51.835849	\N	2026-03-29 19:51:51.835849	88f16340-616c-402c-bb1e-5ee07d6d0a42
2d313a53-39c6-4577-acc0-86ac36cb8e41	1e64745e-4bac-454a-8095-de423ed085c0	f921c7cd-a0d3-47f0-9d6b-feb0a1f050ca	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	7	1	3	0	1	strikeout	0	0	2026-03-30 00:04:32.691727	2026-03-30 00:04:51.70524	2026-03-30 00:04:32.691727	2b45a0d5-3f16-420e-a385-93a390d5f5f0
6eef3bfc-f000-4662-abfc-c2f6df14e9cd	a5a1479f-a177-4479-87d8-fe8c8660aa29	5a7100ed-f68e-4f29-afc1-1095576b7864	\N	51e16641-e136-455a-80ee-4a07873b79e5	1	0	1	0	1	groundout	0	0	2026-03-29 20:18:55.332635	2026-03-29 20:19:14.598641	2026-03-29 20:18:55.332635	c8570706-5564-4fd6-b4ad-b4a3f0be13fb
630af788-e50e-4ec0-9dd1-e24872ed2419	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	3	0	1	strikeout	0	0	2026-03-29 20:15:32.840964	2026-03-29 20:16:11.422119	2026-03-29 20:15:32.840964	88f16340-616c-402c-bb1e-5ee07d6d0a42
dfeeb687-722b-48d5-ab0b-8c8ed91a875c	1e64745e-4bac-454a-8095-de423ed085c0	a45894c9-b274-43d4-adb6-8c303b730b76	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	0	1	2	groundout	0	0	2026-03-29 23:59:11.149676	2026-03-29 23:59:49.130108	2026-03-29 23:59:11.149676	96722c55-d598-4bc7-93d3-a2b7c09b225a
c983125f-1850-445f-8b10-a53716b3af28	90026341-347a-4f0a-b995-ab1373d67c57	43cc420d-e3d4-48b7-bfa6-781e966630f8	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	0	1	2	popout	0	0	2026-03-29 20:16:11.633139	2026-03-29 20:16:29.535609	2026-03-29 20:16:11.633139	63ff096c-0595-4314-b725-aaf8280e2c19
933cacc0-61ea-4f8a-9f76-63203715413e	1e64745e-4bac-454a-8095-de423ed085c0	4d065102-a652-4a45-b4de-dc4cab3d63f0	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	4	1	1	0	0	single	0	0	2026-03-30 00:00:19.269713	2026-03-30 00:00:48.451151	2026-03-30 00:00:19.269713	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1
be7d815b-eaeb-416f-85d7-1cec710507de	a5a1479f-a177-4479-87d8-fe8c8660aa29	5a7100ed-f68e-4f29-afc1-1095576b7864	\N	51e16641-e136-455a-80ee-4a07873b79e5	2	0	3	1	2	strikeout	0	0	2026-03-29 20:19:14.857645	2026-03-29 20:19:35.74364	2026-03-29 20:19:14.857645	84087b62-c439-409a-bde7-54791abe9c27
dac4ebe6-09af-46d2-aa1b-8b640a16d067	1e64745e-4bac-454a-8095-de423ed085c0	6ce84258-3aed-4178-87a4-25bb38c39a82	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	3	0	0	1	3	double_play	0	0	2026-03-30 00:03:24.219871	2026-03-30 00:03:32.908536	2026-03-30 00:03:24.219871	31af3047-e71b-493a-a3b3-877092d4692d
8876900e-a598-4181-82e2-a883c38d6115	a5a1479f-a177-4479-87d8-fe8c8660aa29	5a7100ed-f68e-4f29-afc1-1095576b7864	\N	51e16641-e136-455a-80ee-4a07873b79e5	3	0	0	2	3	flyout	0	0	2026-03-29 20:20:01.134287	2026-03-29 20:20:08.72157	2026-03-29 20:20:01.134287	862048b7-c054-44ea-ace2-a11cefbd86b1
5dc24b40-10f2-404b-9e90-ef372db06055	0b9002d3-75c3-424f-ac44-52aa7b203b70	c3c550a3-cd1c-4996-b9d8-f23a23980911	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	1	0	0	\N	0	0	2026-03-29 22:01:11.397392	\N	2026-03-29 22:01:11.397392	d1e8e930-c005-44d5-8d4c-0a00b1dcc339
d0f31e33-0a19-47fc-b9c9-775c6dc4676a	1e64745e-4bac-454a-8095-de423ed085c0	4d065102-a652-4a45-b4de-dc4cab3d63f0	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	5	0	0	0	2	double_play	0	0	2026-03-30 00:00:48.633633	2026-03-30 00:01:00.864584	2026-03-30 00:00:48.633633	e07da3a0-df5f-4484-8d7c-d1416c6addeb
17f89fd9-9ebd-4c58-8c73-47261fc57584	1e64745e-4bac-454a-8095-de423ed085c0	a45894c9-b274-43d4-adb6-8c303b730b76	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	3	1	3	2	3	strikeout	0	0	2026-03-29 23:59:49.320423	2026-03-30 00:00:15.070527	2026-03-29 23:59:49.320423	31af3047-e71b-493a-a3b3-877092d4692d
14cd24b5-dd5b-4463-9a03-1cb07ce4fd0b	1e64745e-4bac-454a-8095-de423ed085c0	9c02065c-783e-439d-b8ee-c0cb61152d02	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	8	0	1	1	2	groundout	0	0	2026-03-30 00:01:56.394499	2026-03-30 00:02:14.772996	2026-03-30 00:01:56.394499	0c04737c-7eb7-4fa1-b1d5-a45df318a685
696cf327-049d-4e3f-a212-a1cd2952b471	1e64745e-4bac-454a-8095-de423ed085c0	6ce84258-3aed-4178-87a4-25bb38c39a82	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	3	0	1	strikeout	0	0	2026-03-30 00:03:01.242066	2026-03-30 00:03:24.040974	2026-03-30 00:03:01.242066	96722c55-d598-4bc7-93d3-a2b7c09b225a
7636abab-fb9d-430c-a089-937a0a9787d9	1e64745e-4bac-454a-8095-de423ed085c0	4d065102-a652-4a45-b4de-dc4cab3d63f0	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	6	0	1	2	3	groundout	0	0	2026-03-30 00:01:01.06353	2026-03-30 00:01:21.580497	2026-03-30 00:01:01.06353	a625a9e1-3559-410d-9ba4-aff10d1459ae
3df61964-e869-4ece-b31c-1e3ff6958fe6	1e64745e-4bac-454a-8095-de423ed085c0	9c02065c-783e-439d-b8ee-c0cb61152d02	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	7	2	3	0	1	strikeout	0	0	2026-03-30 00:01:24.986593	2026-03-30 00:01:56.226479	2026-03-30 00:01:24.986593	2b45a0d5-3f16-420e-a385-93a390d5f5f0
a97b4c99-df9b-43cf-be5b-99d1aa276f6e	1e64745e-4bac-454a-8095-de423ed085c0	9c02065c-783e-439d-b8ee-c0cb61152d02	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	9	0	0	2	3	popout	0	0	2026-03-30 00:02:14.955349	2026-03-30 00:02:24.68965	2026-03-30 00:02:14.955349	c7758c42-7e26-4adb-ad8d-2d77a8d5327c
29c74a75-44d0-49e3-9028-4e86d06c4561	1e64745e-4bac-454a-8095-de423ed085c0	6ce84258-3aed-4178-87a4-25bb38c39a82	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	3	1	0	0	single	0	0	2026-03-30 00:02:27.996344	2026-03-30 00:03:01.0625	2026-03-30 00:02:27.996344	9ca52c4a-b026-4b42-bfb4-4912855f36e0
f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	117de2ee-aa7b-476e-ba05-01813871fa79	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	4	2	3	0	1	strikeout	0	0	2026-03-30 00:03:35.50955	2026-03-30 00:04:12.938954	2026-03-30 00:03:35.50955	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1
b3104319-3a89-4947-98a6-4634ee017323	1e64745e-4bac-454a-8095-de423ed085c0	117de2ee-aa7b-476e-ba05-01813871fa79	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	5	0	0	1	2	flyout	0	0	2026-03-30 00:04:13.120206	2026-03-30 00:04:20.604311	2026-03-30 00:04:13.120206	e07da3a0-df5f-4484-8d7c-d1416c6addeb
c9291902-df4a-4804-ab4f-33f44e738776	1e64745e-4bac-454a-8095-de423ed085c0	117de2ee-aa7b-476e-ba05-01813871fa79	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	6	0	0	2	3	groundout	0	0	2026-03-30 00:04:20.790429	2026-03-30 00:04:30.129379	2026-03-30 00:04:20.790429	a625a9e1-3559-410d-9ba4-aff10d1459ae
bf337e63-b0f8-4a37-83ac-ae123e145eac	b1b19f92-72ea-4b11-b28a-f322d936a379	24b6df51-b648-424c-929a-2b3fc85598a7	\N	18aa761f-ad20-488a-afaf-017d8b82edf4	1	0	1	0	0	\N	0	0	2026-04-18 12:22:18.287261	\N	2026-04-18 12:22:18.287261	6eb4bb44-1d30-4f06-9029-cc4f7b1415f0
fe52d673-a2f2-4e41-9882-098124c7a206	1e64745e-4bac-454a-8095-de423ed085c0	f921c7cd-a0d3-47f0-9d6b-feb0a1f050ca	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	8	2	0	1	2	lineout	0	0	2026-03-30 00:04:51.872998	2026-03-30 00:05:09.302017	2026-03-30 00:04:51.872998	0c04737c-7eb7-4fa1-b1d5-a45df318a685
21f95795-7ecd-42e3-9cfe-df6b1851bdd6	42a394d5-36c4-48d1-9c94-e916432e4855	45326376-e4c0-42b1-aa09-ec603d591ab9	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	4	0	3	0	1	strikeout	0	0	2026-04-13 23:34:01.334383	2026-04-13 23:34:22.373138	2026-04-13 23:34:01.334383	d9f51a9c-fac2-4b7d-80c9-775c4b3e1594
fabba153-c157-4d8d-b826-5722523cb19f	1e64745e-4bac-454a-8095-de423ed085c0	f921c7cd-a0d3-47f0-9d6b-feb0a1f050ca	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	9	0	0	2	3	popout	0	0	2026-03-30 00:05:09.502962	2026-03-30 00:05:20.900837	2026-03-30 00:05:09.502962	c7758c42-7e26-4adb-ad8d-2d77a8d5327c
4c24c5ed-1b7c-4fcc-bb70-68954d36ea2c	7937c2ca-f234-41de-b723-c616911bb04d	92976d96-dfcd-4760-a55d-be0d5b20c2da	\N	88809758-99ac-475e-b2dd-6f0f16470634	1	0	0	2	3	popout	0	0	2026-04-18 14:00:55.425297	2026-04-18 14:01:32.293022	2026-04-18 14:00:55.425297	58d2c817-5174-4351-9af7-02d9242a67dc
fa4779d2-eb8d-4b64-9336-d475d5fb0c64	1e64745e-4bac-454a-8095-de423ed085c0	f1d6098f-37d5-49dc-9994-818039b09d96	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	1	0	1	flyout	0	0	2026-03-30 00:05:22.888334	2026-03-30 00:05:39.251848	2026-03-30 00:05:22.888334	9ca52c4a-b026-4b42-bfb4-4912855f36e0
b7b6665f-3230-4e4d-bff4-cc3f32fa2144	42a394d5-36c4-48d1-9c94-e916432e4855	45326376-e4c0-42b1-aa09-ec603d591ab9	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	5	0	0	1	1	single	0	0	2026-04-13 23:34:22.523544	2026-04-13 23:34:33.5036	2026-04-13 23:34:22.523544	4e3d3099-a400-4b8f-b8d1-d5ec90f3bb75
e61aa079-0db8-4494-82a5-9a66f564a863	1e64745e-4bac-454a-8095-de423ed085c0	f1d6098f-37d5-49dc-9994-818039b09d96	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2	0	0	1	2	groundout	0	0	2026-03-30 00:05:39.453207	2026-03-30 00:05:49.623323	2026-03-30 00:05:39.453207	96722c55-d598-4bc7-93d3-a2b7c09b225a
4413cd2f-e598-4582-89be-71dacbd2b4b7	42a394d5-36c4-48d1-9c94-e916432e4855	45326376-e4c0-42b1-aa09-ec603d591ab9	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	6	0	0	1	3	double_play	0	0	2026-04-13 23:34:33.68382	2026-04-13 23:34:51.903257	2026-04-13 23:34:33.68382	e12034fc-0cbc-4309-b240-88f8c3201659
4b7cd85a-4fa3-4dd5-8b43-5f41e7fec14b	1e64745e-4bac-454a-8095-de423ed085c0	f1d6098f-37d5-49dc-9994-818039b09d96	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	3	0	3	2	3	strikeout	0	0	2026-03-30 00:05:49.821844	2026-03-30 00:06:04.566744	2026-03-30 00:05:49.821844	31af3047-e71b-493a-a3b3-877092d4692d
de08959f-65e3-4a48-80dc-06b014f69fe3	1e64745e-4bac-454a-8095-de423ed085c0	42864526-3f27-4488-874f-5a9cdeffa3df	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	4	0	0	0	0	\N	0	0	2026-03-30 00:06:07.225929	\N	2026-03-30 00:06:07.225929	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1
ebef7553-bebc-46b0-bae2-c2cde2641749	0b9002d3-75c3-424f-ac44-52aa7b203b70	c3c550a3-cd1c-4996-b9d8-f23a23980911	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-03-30 21:11:20.501169	\N	2026-03-30 21:11:20.501169	d1e8e930-c005-44d5-8d4c-0a00b1dcc339
de1c3dd1-2765-492c-b8e5-1dedb29489b9	0b9002d3-75c3-424f-ac44-52aa7b203b70	c3c550a3-cd1c-4996-b9d8-f23a23980911	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-04-06 00:02:02.880066	\N	2026-04-06 00:02:02.880066	d1e8e930-c005-44d5-8d4c-0a00b1dcc339
47efa0a4-4e2f-4901-940e-55cf8dd6deca	0b9002d3-75c3-424f-ac44-52aa7b203b70	c3c550a3-cd1c-4996-b9d8-f23a23980911	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	0	0	0	\N	0	0	2026-04-08 18:04:32.888834	\N	2026-04-08 18:04:32.888834	d1e8e930-c005-44d5-8d4c-0a00b1dcc339
94685490-1865-4ef4-9e65-53dab322ed83	7937c2ca-f234-41de-b723-c616911bb04d	b2f493cc-c39b-40aa-9a12-bb48f126601a	\N	88809758-99ac-475e-b2dd-6f0f16470634	6	2	1	2	3	popout	0	0	2026-04-18 14:11:37.307972	2026-04-18 14:12:39.377044	2026-04-18 14:11:37.307972	73ec00f4-6f42-4ac9-805b-082fc25033c0
bb6c04f7-6655-4e06-9813-4d57de24f60c	7937c2ca-f234-41de-b723-c616911bb04d	92976d96-dfcd-4760-a55d-be0d5b20c2da	\N	88809758-99ac-475e-b2dd-6f0f16470634	1	0	2	0	0	error	0	0	2026-04-18 13:55:37.80241	2026-04-18 13:56:51.294805	2026-04-18 13:55:37.80241	58d2c817-5174-4351-9af7-02d9242a67dc
e5874ee4-8773-494f-9ee8-79fdf8bb84e3	0b9002d3-75c3-424f-ac44-52aa7b203b70	c3c550a3-cd1c-4996-b9d8-f23a23980911	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	0	3	0	1	strikeout	0	0	2026-04-13 23:22:48.072585	2026-04-13 23:23:20.93358	2026-04-13 23:22:48.072585	d1e8e930-c005-44d5-8d4c-0a00b1dcc339
9e4620dd-b36e-4b6b-a7c5-21b07bb57040	42a394d5-36c4-48d1-9c94-e916432e4855	c181c052-1582-4449-a4c3-6b377fcab07f	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	7	1	3	0	1	strikeout	0	0	2026-04-13 23:34:55.416956	2026-04-13 23:35:31.095727	2026-04-13 23:34:55.416956	a9f571b4-4e17-44e8-839a-3b2a4321ad3a
3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	1464e395-31da-4746-afef-de2feae09e5b	\N	88809758-99ac-475e-b2dd-6f0f16470634	3	3	2	2	3	groundout	0	0	2026-04-18 14:34:07.504532	2026-04-18 14:36:10.070815	2026-04-18 14:34:07.504532	9f0bbac7-9861-44ab-8fae-5179816f6151
74ea488b-6dba-464b-846b-a80b5c6b2c43	42a394d5-36c4-48d1-9c94-e916432e4855	c181c052-1582-4449-a4c3-6b377fcab07f	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	8	0	0	1	2	lineout	0	0	2026-04-13 23:35:31.249233	2026-04-13 23:35:43.436106	2026-04-13 23:35:31.249233	578a0aa3-74f9-4e26-8b1e-7b833b7ce39e
76fee768-4f96-4606-8d4d-874c996abfb3	0b9002d3-75c3-424f-ac44-52aa7b203b70	c3c550a3-cd1c-4996-b9d8-f23a23980911	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	3	1	1	strikeout	0	0	2026-04-13 23:23:29.885798	2026-04-13 23:33:19.730729	2026-04-13 23:23:29.885798	d1e8e930-c005-44d5-8d4c-0a00b1dcc339
b3a1418f-6d72-4c88-8b53-235b9e719766	7937c2ca-f234-41de-b723-c616911bb04d	b2f493cc-c39b-40aa-9a12-bb48f126601a	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	1	1	0	1	flyout	0	0	2026-04-18 14:07:13.811335	2026-04-18 14:10:03.658781	2026-04-18 14:07:13.811335	ecef8da8-79ce-4322-a835-a468d5663394
20acd3ac-91e6-43c2-b447-3884ff5652bc	42a394d5-36c4-48d1-9c94-e916432e4855	40195514-b275-4d1e-8f29-a3f6be756bc4	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	2	0	1	1	2	flyout	0	0	2026-04-13 23:33:19.890645	2026-04-13 23:33:38.769492	2026-04-13 23:33:19.890645	ad4bff9e-78d3-4e46-80d7-fa45de5c99f8
7d3390a3-7228-4b1f-8e7e-943e6afbccbb	7937c2ca-f234-41de-b723-c616911bb04d	79dcc091-43a3-426f-ad52-13837065b041	\N	88809758-99ac-475e-b2dd-6f0f16470634	8	0	3	1	2	strikeout	0	0	2026-04-18 14:21:21.260588	2026-04-18 14:21:57.571057	2026-04-18 14:21:21.260588	1cd1f6ca-23d2-4f35-877a-869e499b3d2c
6e93115c-1b2a-4096-b941-2c1bf39f4d31	42a394d5-36c4-48d1-9c94-e916432e4855	40195514-b275-4d1e-8f29-a3f6be756bc4	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	3	0	1	2	3	groundout	0	0	2026-04-13 23:33:38.965967	2026-04-13 23:33:55.948602	2026-04-13 23:33:38.965967	8ba8d012-284c-4840-97ba-4804b07f3449
3f13df78-be03-4846-acb0-5c16271615ee	42a394d5-36c4-48d1-9c94-e916432e4855	c181c052-1582-4449-a4c3-6b377fcab07f	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	9	0	3	2	3	strikeout	0	0	2026-04-13 23:35:43.627156	2026-04-13 23:36:04.018731	2026-04-13 23:35:43.627156	9261036d-ac02-42ac-bf2a-f8cba7549148
5149a29d-92a9-44ab-b712-df649c83c8fb	7937c2ca-f234-41de-b723-c616911bb04d	92976d96-dfcd-4760-a55d-be0d5b20c2da	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	1	3	0	1	strikeout	0	0	2026-04-18 13:57:10.594516	2026-04-18 13:59:06.816066	2026-04-18 13:57:10.594516	ecef8da8-79ce-4322-a835-a468d5663394
5125936a-7997-49aa-97e4-0b62daa17647	42a394d5-36c4-48d1-9c94-e916432e4855	67da5c7a-6b62-4a86-b360-ff44063e88f4	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	1	0	3	0	1	strikeout	0	0	2026-04-13 23:36:06.629586	2026-04-13 23:36:34.953168	2026-04-13 23:36:06.629586	ff78f40d-6187-4f2d-a47a-eb928ca115ca
aedeb98d-5c27-4560-a64f-7916d5dd137f	42a394d5-36c4-48d1-9c94-e916432e4855	67da5c7a-6b62-4a86-b360-ff44063e88f4	\N	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	2	0	0	1	1	\N	0	0	2026-04-13 23:36:35.106565	\N	2026-04-13 23:36:35.106565	ad4bff9e-78d3-4e46-80d7-fa45de5c99f8
19109550-2cfe-4f8f-b3fd-2bf4e5525250	7937c2ca-f234-41de-b723-c616911bb04d	5a832e9a-33bd-4ed2-8f33-fbe5e70c110c	\N	88809758-99ac-475e-b2dd-6f0f16470634	4	1	3	0	1	strikeout	0	0	2026-04-18 14:50:11.299707	2026-04-18 14:53:17.305826	2026-04-18 14:50:11.299707	3539b425-cb5b-43f0-bf7a-685f26022c7e
b9bbb023-d4c9-4bd0-ae62-e3e41a2febe4	7937c2ca-f234-41de-b723-c616911bb04d	b2f493cc-c39b-40aa-9a12-bb48f126601a	\N	88809758-99ac-475e-b2dd-6f0f16470634	5	1	3	1	2	strikeout	0	0	2026-04-18 14:10:25.037778	2026-04-18 14:11:21.052834	2026-04-18 14:10:25.037778	97c0431d-f710-4e36-9cd8-790825dde339
659edd55-67e7-4939-8c8d-f8e8242155a9	7937c2ca-f234-41de-b723-c616911bb04d	92976d96-dfcd-4760-a55d-be0d5b20c2da	\N	88809758-99ac-475e-b2dd-6f0f16470634	3	1	3	1	2	strikeout	0	0	2026-04-18 13:59:23.173353	2026-04-18 14:00:22.193282	2026-04-18 13:59:23.173353	9f0bbac7-9861-44ab-8fae-5179816f6151
2b68671a-5d91-4cf8-a614-5be2b81d77b8	7937c2ca-f234-41de-b723-c616911bb04d	5a832e9a-33bd-4ed2-8f33-fbe5e70c110c	\N	88809758-99ac-475e-b2dd-6f0f16470634	8	1	0	2	3	groundout	0	0	2026-04-18 14:57:02.76387	2026-04-18 14:57:53.210904	2026-04-18 14:57:02.76387	1cd1f6ca-23d2-4f35-877a-869e499b3d2c
45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	79dcc091-43a3-426f-ad52-13837065b041	\N	88809758-99ac-475e-b2dd-6f0f16470634	7	3	2	0	1	groundout	0	0	2026-04-18 14:19:16.268421	2026-04-18 14:21:05.985403	2026-04-18 14:19:16.268421	fa92c880-1d31-437f-a3c4-0b3a49a6c460
a10cfec8-2cb1-4f1e-89a2-84dc5d00dc64	7937c2ca-f234-41de-b723-c616911bb04d	79dcc091-43a3-426f-ad52-13837065b041	\N	88809758-99ac-475e-b2dd-6f0f16470634	9	1	3	2	3	strikeout	0	0	2026-04-18 14:22:09.890681	2026-04-18 14:23:03.342105	2026-04-18 14:22:09.890681	e7cb5e29-795b-496b-9d38-2d9eb5382696
0bb5c41d-f0f8-4246-9116-9e4543c0f54c	7937c2ca-f234-41de-b723-c616911bb04d	5a832e9a-33bd-4ed2-8f33-fbe5e70c110c	\N	88809758-99ac-475e-b2dd-6f0f16470634	6	1	2	1	1	single	0	0	2026-04-18 14:54:23.645765	2026-04-18 14:56:36.942781	2026-04-18 14:54:23.645765	73ec00f4-6f42-4ac9-805b-082fc25033c0
f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	1464e395-31da-4746-afef-de2feae09e5b	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	3	2	1	2	groundout	0	0	2026-04-18 14:32:16.272036	2026-04-18 14:34:06.918538	2026-04-18 14:32:16.272036	ecef8da8-79ce-4322-a835-a468d5663394
5db7a65d-eacc-42a8-93ae-b36ad8b77b55	7937c2ca-f234-41de-b723-c616911bb04d	1464e395-31da-4746-afef-de2feae09e5b	\N	88809758-99ac-475e-b2dd-6f0f16470634	1	0	0	0	1	lineout	0	0	2026-04-18 14:29:57.736646	2026-04-18 14:32:15.870357	2026-04-18 14:29:57.736646	58d2c817-5174-4351-9af7-02d9242a67dc
4cd28416-314d-42ce-b1fb-b851ccf52b7c	7937c2ca-f234-41de-b723-c616911bb04d	5a832e9a-33bd-4ed2-8f33-fbe5e70c110c	\N	88809758-99ac-475e-b2dd-6f0f16470634	7	0	0	1	2	sacrifice_fly	0	0	2026-04-18 14:56:37.358147	2026-04-18 14:57:02.075579	2026-04-18 14:56:37.358147	fa92c880-1d31-437f-a3c4-0b3a49a6c460
8b0bfce1-29c9-4dde-b20d-7ebf905d5188	7937c2ca-f234-41de-b723-c616911bb04d	5a832e9a-33bd-4ed2-8f33-fbe5e70c110c	\N	88809758-99ac-475e-b2dd-6f0f16470634	5	1	1	1	1	single	0	0	2026-04-18 14:53:17.694089	2026-04-18 14:54:23.219989	2026-04-18 14:53:17.694089	97c0431d-f710-4e36-9cd8-790825dde339
b141821a-c921-40f2-86ed-e75ab83df0ff	7937c2ca-f234-41de-b723-c616911bb04d	709c0cbc-0e37-4055-99d8-642a398bf1e9	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	0	0	0	0	\N	0	0	2026-04-18 15:08:34.96653	\N	2026-04-18 15:08:34.96653	ecef8da8-79ce-4322-a835-a468d5663394
f8f3e212-af2c-4de0-ac5f-17449710c158	7937c2ca-f234-41de-b723-c616911bb04d	caeb1589-ea3c-4f4c-ab90-efb0ab549f85	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	0	0	0	0	\N	0	0	2026-04-18 15:08:43.096195	\N	2026-04-18 15:08:43.096195	ecef8da8-79ce-4322-a835-a468d5663394
d003df01-42b1-412c-aba5-0c2ad18a4c81	7937c2ca-f234-41de-b723-c616911bb04d	4f788aeb-aadf-4cd2-a076-a75b64d3b488	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	0	0	0	0	\N	0	0	2026-04-18 15:08:49.049846	\N	2026-04-18 15:08:49.049846	ecef8da8-79ce-4322-a835-a468d5663394
566846c5-3e96-4135-bb34-1565ec13eed9	7937c2ca-f234-41de-b723-c616911bb04d	a7d9e873-610e-46ec-8027-255ff71aed82	\N	88809758-99ac-475e-b2dd-6f0f16470634	2	0	0	0	0	\N	0	0	2026-04-18 15:08:49.483445	\N	2026-04-18 15:08:49.483445	ecef8da8-79ce-4322-a835-a468d5663394
d40b9921-5d23-4f92-8fb3-d0b69c0d4cb6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	c83c8933-f5dd-4e6c-955d-3dcab120cfb2	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	1	1	3	0	1	strikeout	0	0	2026-04-20 22:08:08.357379	2026-04-20 22:09:03.505011	2026-04-20 22:08:08.357379	e2995a92-2246-4497-b99f-04ae060f476e
c700452e-74b2-4abd-91a9-226438bb0a1b	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	c83c8933-f5dd-4e6c-955d-3dcab120cfb2	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	2	0	0	1	2	groundout	0	0	2026-04-20 22:09:03.824833	2026-04-20 22:09:34.165911	2026-04-20 22:09:03.824833	d234fc41-3f80-4a6c-b0ba-f3af8bfbb18b
971c95ad-5ef0-47b6-bbeb-a66546b6dcd6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	c83c8933-f5dd-4e6c-955d-3dcab120cfb2	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	3	0	0	2	3	popout	0	0	2026-04-20 22:09:34.527923	2026-04-20 22:09:46.461722	2026-04-20 22:09:34.527923	7ca6976d-2558-4e98-a13c-b3a99f6fb7e6
debd307f-3959-427e-a377-df3f6c065d21	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	56bb3a82-0f60-46d5-91cb-ed7f60d17568	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	4	0	0	0	0	\N	0	0	2026-04-20 22:09:54.475105	\N	2026-04-20 22:09:54.475105	b7647a23-7ee8-4490-abf7-f74d408a34bc
165e4760-51fc-4156-b2b8-3008a3d743b8	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	56bb3a82-0f60-46d5-91cb-ed7f60d17568	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	4	0	3	0	1	strikeout	0	0	2026-04-20 22:42:12.293544	2026-04-20 22:42:41.265888	2026-04-20 22:42:12.293544	b7647a23-7ee8-4490-abf7-f74d408a34bc
89ee374e-5da2-42c0-8cb8-0bb4adcbf861	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	56bb3a82-0f60-46d5-91cb-ed7f60d17568	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	5	0	0	1	1	\N	0	0	2026-04-20 22:42:41.460155	\N	2026-04-20 22:42:41.460155	d16fb7e7-9425-4e03-9373-d32be18dcb56
01e9cd46-514d-4f11-9b73-5c657f0006e7	2a83067c-022d-4dcb-9682-dff5b0b83956	6dc2ca09-7497-466b-8096-e64d301ca794	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	1	0	0	0	1	lineout	0	0	2026-04-21 20:00:26.413714	2026-04-21 20:00:47.765192	2026-04-21 20:00:26.413714	f0140070-929e-48d3-a4bd-683b061bfc16
d3a92c04-f55f-4313-ba85-9d8dbea1be5a	2a83067c-022d-4dcb-9682-dff5b0b83956	6dc2ca09-7497-466b-8096-e64d301ca794	\N	1ed97449-4736-42e1-8e76-8838ea0c4530	2	0	1	1	1	\N	0	0	2026-04-21 20:01:26.555551	\N	2026-04-21 20:01:26.555551	788fbc6c-08f3-42ce-adb0-f8c598520887
09a1f00d-b7d6-48c1-ae3a-556049a9bc68	2a83067c-022d-4dcb-9682-dff5b0b83956	6dc2ca09-7497-466b-8096-e64d301ca794	\N	7dc1a211-fbb8-4d00-8b20-03469e026785	\N	0	3	0	0	\N	0	0	2026-04-21 22:43:50.869269	\N	2026-04-21 22:43:50.869269	f0140070-929e-48d3-a4bd-683b061bfc16
\.


--
-- Data for Name: baserunner_events; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.baserunner_events (id, game_id, inning_id, at_bat_id, event_type, runner_base, out_recorded, outs_before, outs_after, notes, created_at) FROM stdin;
90a633d2-b7b6-424f-a0a3-fdbe1a9bccdf	9fecd787-6a95-48b5-92d4-11abc07b49ae	a6ffef2f-30b7-4d86-b18c-046ffd43ae70	0fdb71d2-402b-4a73-98c3-caed60644ebc	pickoff	second	t	0	1	\N	2026-02-05 00:43:56.681558
\.


--
-- Data for Name: batter_scouting_notes; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.batter_scouting_notes (id, profile_id, note_text, created_by, created_at, updated_at) FROM stdin;
f27a5f54-550c-4fc5-8d05-6fcb5a21fcd7	ee4a8fe1-aaa9-45a2-99b2-6e5de1ef9fac	Takes a lot of pitches	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-23 22:48:16.353539	2026-01-23 22:48:16.353539
\.


--
-- Data for Name: batter_scouting_profiles; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.batter_scouting_profiles (id, team_id, opponent_team_name, player_name, normalized_name, bats, created_at, updated_at) FROM stdin;
ee4a8fe1-aaa9-45a2-99b2-6e5de1ef9fac	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Test	Batter 1	batter 1	R	2026-01-23 22:47:28.905459	2026-01-23 22:47:28.905459
302c95c4-6f33-42a4-bda0-24dcef061867	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Test	Batter 4	batter 4	R	2026-01-27 22:13:24.543243	2026-01-27 22:13:24.543243
1ef42cd1-9e16-4f1d-8f31-dc753ce2c460	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Test	Batter 2	batter 2	L	2026-01-31 19:43:01.90395	2026-01-31 19:43:01.90395
d3a05c7e-09ad-4661-8f85-130e0a5f2dde	0afb754c-95f0-4296-96f8-528cc689f0d7	Klein cain	1	1	R	2026-02-02 19:52:43.373672	2026-02-02 19:52:43.373672
a113e999-0a4e-48f3-bac2-afbcf3e099cb	0afb754c-95f0-4296-96f8-528cc689f0d7	Klein cain	2	2	R	2026-02-02 20:35:40.509649	2026-02-02 20:35:40.509649
a90c1c38-4c98-4b41-a844-afef236c0c5f	0afb754c-95f0-4296-96f8-528cc689f0d7	Klein cain	3	3	R	2026-02-02 20:38:07.304628	2026-02-02 20:38:07.304628
da739c62-903d-4ee7-8f1c-904fe556a94d	0afb754c-95f0-4296-96f8-528cc689f0d7	Klein cain	4	4	R	2026-02-02 20:40:00.937653	2026-02-02 20:40:00.937653
76ef4460-5f00-4651-b19d-b0b1e0492e1c	0afb754c-95f0-4296-96f8-528cc689f0d7	Klein cain	5	5	R	2026-02-02 20:41:58.563981	2026-02-02 20:41:58.563981
53b1646e-349e-41c3-b58c-288d1bce9094	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test	1	1	R	2026-02-05 00:41:05.003071	2026-02-05 00:41:05.003071
192d181f-94e7-4409-8027-3834eeee353a	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test	2	2	R	2026-02-05 00:41:55.992322	2026-02-05 00:41:55.992322
745adafd-9f99-4958-aa7c-0bc7a8d49b36	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test	3	3	R	2026-02-05 00:42:25.91014	2026-02-05 00:42:25.91014
93fa8fde-03cf-4da0-8da5-b8fc8f024d9c	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test	4	4	R	2026-02-05 00:42:47.618549	2026-02-05 00:42:47.618549
ecdb472a-76eb-4954-8637-ed4247e6b9e8	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test	5	5	R	2026-02-05 00:43:48.662111	2026-02-05 00:43:48.662111
4257e7a7-20d0-479a-9d51-d9da5dacdd45	0afb754c-95f0-4296-96f8-528cc689f0d7	Test	1	1	R	2026-02-09 13:36:39.063044	2026-02-09 13:36:39.063044
6e726b02-9c6f-4049-97ce-496a3611407e	0afb754c-95f0-4296-96f8-528cc689f0d7	Test	2	2	R	2026-02-09 14:00:09.970155	2026-02-09 14:00:09.970155
fab8891f-0454-420d-9ec0-e9ab372bbe8a	46b83059-538e-4a2c-9ba4-10cc22bb1c94	TLU	3	3	R	2026-02-13 16:51:59.492615	2026-02-13 16:51:59.492615
395888c0-29c6-48d6-b251-6640c37f8647	46b83059-538e-4a2c-9ba4-10cc22bb1c94	TLU	11	11	R	2026-02-13 17:12:15.689545	2026-02-13 17:12:15.689545
9441ecab-1f46-423a-80db-7f7163426922	46b83059-538e-4a2c-9ba4-10cc22bb1c94	TLU	10	10	R	2026-02-13 17:14:28.743235	2026-02-13 17:14:28.743235
fde28ba8-a009-4346-9e18-83abcc412cb6	0afb754c-95f0-4296-96f8-528cc689f0d7	Test3333	Bob	bob	R	2026-03-12 22:49:12.578483	2026-03-12 22:49:12.578483
1a0c89c7-688f-4a0c-89a3-2a60043d3f03	0afb754c-95f0-4296-96f8-528cc689f0d7	Test3333	Tim	tim	R	2026-03-12 22:49:56.51044	2026-03-12 22:49:56.51044
d13c339c-5c5a-4d70-9652-c3b9e8fd4c41	0afb754c-95f0-4296-96f8-528cc689f0d7	Test	Joe	joe	R	2026-03-15 22:24:18.696586	2026-03-15 22:24:18.696586
c581c54b-8aeb-4275-b72c-ab74108402ec	0afb754c-95f0-4296-96f8-528cc689f0d7	Testqqq	Will	will	R	2026-03-15 22:24:41.531558	2026-03-15 22:24:41.531558
6cdb081c-1353-4bde-8582-3ead6fce2cc2	0afb754c-95f0-4296-96f8-528cc689f0d7	Test audio	Joe	joe	R	2026-03-20 16:40:14.099738	2026-03-20 16:40:14.099738
bc0a2bc6-792e-425d-bd6c-e5cfa50487bd	0afb754c-95f0-4296-96f8-528cc689f0d7	Los alamos	1	1	R	2026-03-20 16:53:18.263138	2026-03-20 16:53:18.263138
587f2e04-6913-451e-9c47-8e1e9ed69af4	0afb754c-95f0-4296-96f8-528cc689f0d7	Test	Bob	bob	R	2026-03-21 01:19:28.946276	2026-03-21 01:19:28.946276
600c1bb9-1b21-454a-ac4d-a666b9aede16	46b83059-538e-4a2c-9ba4-10cc22bb1c94	Texas Lutheran	bob	bob	L	2026-03-21 01:19:57.167476	2026-03-21 01:19:57.167476
7641d753-94d0-4054-92f3-58f79cca5e93	0afb754c-95f0-4296-96f8-528cc689f0d7	Test 11	bob	bob	R	2026-03-29 22:01:09.423357	2026-03-29 22:01:09.423357
da137c8a-2f87-4321-a32f-b30aea2a8d31	7bb4cf59-011e-4847-86da-30e3ebb28408	Schreiner	10	10	R	2026-04-20 22:05:52.71561	2026-04-20 22:05:52.71561
13276948-2cce-4a2f-a63c-2aa84ade6031	7bb4cf59-011e-4847-86da-30e3ebb28408	Test	John	john	R	2026-04-20 22:07:37.235317	2026-04-20 22:07:37.235317
8573d4b2-2f2a-4870-8de6-9942c2bf0794	7bb4cf59-011e-4847-86da-30e3ebb28408	Test	1	1	R	2026-04-21 22:43:43.903718	2026-04-21 22:43:43.903718
\.


--
-- Data for Name: batter_tendencies; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.batter_tendencies (id, profile_id, total_pitches_seen, total_at_bats, pitches_outside_zone, swings_outside_zone, chase_rate, pitches_inside_zone, takes_inside_zone, watch_rate, early_count_pitches, early_count_swings, early_count_rate, first_pitches, first_pitch_takes, first_pitch_take_rate, breaking_outside, breaking_outside_swings, breaking_chase_rate, zone_tendencies, last_calculated_at, is_stale, created_at, updated_at) FROM stdin;
f38861e6-3ae9-49c1-b9a0-5a4a268d972e	ee4a8fe1-aaa9-45a2-99b2-6e5de1ef9fac	11	2	3	0	0.0000	8	5	0.6250	4	0	0.0000	2	2	1.0000	1	0	0.0000	{"BL": {"count": 1, "swing_rate": 1}, "BR": {"count": 1, "swing_rate": 0}, "ML": {"count": 2, "swing_rate": 0.5}, "MR": {"count": 1, "swing_rate": 0}, "OR": {"count": 2, "swing_rate": 0}, "OT": {"count": 1, "swing_rate": 0}, "TL": {"count": 1, "swing_rate": 0}, "TM": {"count": 1, "swing_rate": 1}, "TR": {"count": 1, "swing_rate": 0}}	2026-01-23 22:47:28.912398	f	2026-01-23 22:47:28.912398	2026-01-23 22:47:28.912398
a987dc3b-fcf1-4ecb-a009-b65b13c718f3	302c95c4-6f33-42a4-bda0-24dcef061867	4	1	2	1	0.5000	2	1	0.5000	2	0	0.0000	1	1	1.0000	2	1	0.5000	{"ML": {"count": 1, "swing_rate": 1}, "MR": {"count": 1, "swing_rate": 0}, "OL": {"count": 1, "swing_rate": 1}, "OR": {"count": 1, "swing_rate": 0}}	2026-01-27 22:13:24.550025	t	2026-01-27 22:13:24.550025	2026-01-27 22:13:59.273242
eacced56-83e5-48d5-b816-b41995e00ce6	1ef42cd1-9e16-4f1d-8f31-dc753ce2c460	31	11	9	3	0.3333	22	9	0.4091	18	9	0.5000	11	4	0.3636	2	1	0.5000	{"BL": {"count": 1, "swing_rate": 0}, "BM": {"count": 1, "swing_rate": 0}, "BR": {"count": 3, "swing_rate": 0.3333333333333333}, "ML": {"count": 2, "swing_rate": 1}, "MM": {"count": 1, "swing_rate": 1}, "MR": {"count": 5, "swing_rate": 0.4}, "OL": {"count": 4, "swing_rate": 0.25}, "OR": {"count": 5, "swing_rate": 0.4}, "TL": {"count": 1, "swing_rate": 1}, "TM": {"count": 3, "swing_rate": 0.6666666666666666}, "TR": {"count": 5, "swing_rate": 0.8}}	2026-01-31 19:43:01.910485	t	2026-01-31 19:43:01.910485	2026-01-31 19:43:12.812912
f44a76c4-5110-465e-803b-d375690cce70	53b1646e-349e-41c3-b58c-288d1bce9094	2	1	1	1	1.0000	1	0	0.0000	2	2	1.0000	1	0	0.0000	1	1	1.0000	{"MR": {"count": 1, "swing_rate": 1}, "OL": {"count": 1, "swing_rate": 1}}	2026-02-08 20:44:47.908809	f	2026-02-08 20:44:47.908809	2026-02-08 20:44:47.908809
fabd2b5d-5b9f-401b-b105-1ac160463bc3	fab8891f-0454-420d-9ec0-e9ab372bbe8a	7	1	5	0	0.0000	2	0	0.0000	2	1	0.5000	1	1	1.0000	3	0	0.0000	{"ML": {"count": 1, "swing_rate": 1}, "OB": {"count": 1, "swing_rate": 0}, "OL": {"count": 1, "swing_rate": 0}, "OR": {"count": 2, "swing_rate": 0}, "TL": {"count": 1, "swing_rate": 1}, "OTR": {"count": 1, "swing_rate": 0}}	2026-02-13 17:20:54.382234	f	2026-02-13 17:20:54.382234	2026-02-13 17:20:54.382234
2ea1c481-b9ba-4120-90dc-4a3fc20e7f7f	c581c54b-8aeb-4275-b72c-ab74108402ec	3	2	2	0	0.0000	1	0	0.0000	3	1	0.3333	2	2	1.0000	0	0	\N	{"OL": {"count": 2, "swing_rate": 0}, "TL": {"count": 1, "swing_rate": 1}}	2026-03-16 00:22:00.462082	t	2026-03-15 22:24:41.535924	2026-03-20 14:04:37.325758
f468e492-c086-4a58-8800-4255878113ab	da137c8a-2f87-4321-a32f-b30aea2a8d31	5	3	3	3	1.0000	2	1	0.5000	4	3	0.7500	3	1	0.3333	2	2	1.0000	{"MR": {"count": 1, "swing_rate": 0}, "OL": {"count": 1, "swing_rate": 1}, "OT": {"count": 1, "swing_rate": 1}, "TL": {"count": 1, "swing_rate": 1}, "OTR": {"count": 1, "swing_rate": 1}}	2026-04-20 22:05:52.756473	f	2026-04-20 22:05:52.756473	2026-04-20 22:05:52.756473
50042fd3-215d-4471-a483-6b314c636851	13276948-2cce-4a2f-a63c-2aa84ade6031	4	1	1	0	0.0000	3	1	0.3333	2	1	0.5000	1	1	1.0000	0	0	\N	{"ML": {"count": 1, "swing_rate": 0}, "OL": {"count": 1, "swing_rate": 0}, "TL": {"count": 1, "swing_rate": 1}, "TR": {"count": 1, "swing_rate": 1}}	2026-04-20 23:36:14.120446	f	2026-04-20 23:36:14.120446	2026-04-20 23:36:14.120446
29f30b43-bf3a-44d7-980d-720d3689dee0	8573d4b2-2f2a-4870-8de6-9942c2bf0794	4	2	1	0	0.0000	3	1	0.3333	3	1	0.3333	2	1	0.5000	0	0	\N	{"MR": {"count": 1, "swing_rate": 1}, "OL": {"count": 1, "swing_rate": 0}, "TL": {"count": 2, "swing_rate": 0.5}}	2026-04-21 23:03:37.727711	f	2026-04-21 22:43:43.913874	2026-04-21 23:03:37.727711
\.


--
-- Data for Name: bullpen_pitches; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.bullpen_pitches (id, session_id, pitch_number, pitch_type, target_x, target_y, actual_x, actual_y, velocity, result, created_at) FROM stdin;
68d75d50-5d7d-4db9-a9af-fd8d33cbacd3	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	1	4-seam	\N	\N	0.9946	0.8263	\N	\N	2026-02-08 22:45:44.303374
f5717b34-c001-4385-862f-23418af3356e	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	2	4-seam	1.0869	0.5177	0.4078	0.7863	\N	\N	2026-02-08 22:45:48.233134
31dae694-a023-44d4-b09c-27fab2f79a2a	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	3	4-seam	-0.0076	0.7863	-0.0999	0.6092	\N	\N	2026-02-08 22:45:54.364409
976eb6a1-90d2-4e5c-b327-7c5e99f714d8	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	4	4-seam	1.0341	0.4034	1.0341	0.4034	\N	\N	2026-02-08 22:46:02.191049
dbf355e7-7234-4595-88f2-90601414bd44	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	5	curveball	0.9946	0.9977	0.7309	0.9349	\N	\N	2026-02-08 22:46:11.14179
94e2946c-2b17-4d75-b43a-0107fe50ecff	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	6	curveball	0.5330	0.9692	0.6979	1.1063	\N	\N	2026-02-08 22:46:17.863158
3fb79dfd-692d-477e-9bbb-6e8d545c49de	25472f5e-de63-4a4f-a39c-49b3bb17ddc4	7	curveball	0.1770	1.0777	0.1770	1.0777	\N	\N	2026-02-08 22:46:22.714756
4218f32c-a4a2-4d3a-87a0-974f6db177dd	b2e4156e-1349-4cba-b249-9d356f66fc06	1	4-seam	0.0225	0.8386	-0.0162	0.6615	\N	called_strike	2026-02-09 00:19:36.000409
e7a8108c-264a-44bb-82a3-74e55ae18175	b2e4156e-1349-4cba-b249-9d356f66fc06	2	2-seam	-0.0300	0.3600	0.0031	0.3265	\N	called_strike	2026-02-09 00:19:39.935215
eef1aa4f-eadd-4923-8289-e0ab635d20f3	b2e4156e-1349-4cba-b249-9d356f66fc06	3	2-seam	1.0852	0.9032	1.2950	0.5802	\N	ball	2026-02-09 00:19:45.494327
7d8ba128-43e6-4568-80f7-9a858719c53a	4756b5d6-501a-406e-81d1-bc670782158a	1	4-seam	1.0769	0.6400	1.1100	0.6544	\N	ball	2026-02-11 12:36:13.745197
dbf55057-d0aa-46bc-a4ea-2958cfefbb82	4756b5d6-501a-406e-81d1-bc670782158a	2	4-seam	0.0197	0.6448	-0.0410	0.6209	\N	called_strike	2026-02-11 12:36:19.683202
011bd598-f242-44b0-b965-a0e6811829b1	4756b5d6-501a-406e-81d1-bc670782158a	3	2-seam	0.9914	0.9248	0.9389	0.8937	\N	called_strike	2026-02-11 12:36:27.069789
8728dc3a-cf51-4136-b944-f990d438cfe7	4756b5d6-501a-406e-81d1-bc670782158a	4	2-seam	-0.0410	0.9511	-0.0466	0.2810	\N	called_strike	2026-02-11 12:36:32.534186
d716f836-0767-456c-a520-e76f89dd23c4	e97bc09b-9316-4842-ae0e-6ef4c301b04c	1	4-seam	0.1467	0.8434	0.1964	0.8243	\N	called_strike	2026-03-02 10:18:08.704669
e4313ac5-1223-4498-8e0e-130d1c77dd3c	04e5f36b-bd42-4bcb-b2a3-6965e3441008	1	4-seam	0.0832	0.3121	-0.0604	0.2810	\N	called_strike	2026-03-02 10:31:26.505606
f70d0aed-c14b-47d3-87a3-0a49bf0caee6	04e5f36b-bd42-4bcb-b2a3-6965e3441008	2	2-seam	1.0659	0.6998	0.9527	0.4007	\N	called_strike	2026-03-02 10:31:31.594394
9c25937b-3234-4c89-9a3f-6c54844cd062	8c630ee6-e46b-4964-9534-993c3d8dad4f	1	fastball	0.8330	0.5000	0.0062	0.4755	\N	called_strike	2026-04-13 23:26:53.996495
172d1bff-c5a4-450b-8b3e-58095fdb91a3	8c630ee6-e46b-4964-9534-993c3d8dad4f	2	4-seam	0.1670	0.5000	1.1087	0.6469	\N	ball	2026-04-13 23:26:59.924806
e75974ba-3971-413d-baec-fd9e252102f6	8c630ee6-e46b-4964-9534-993c3d8dad4f	3	2-seam	0.8330	0.8330	-0.0092	0.9755	\N	called_strike	2026-04-13 23:27:04.850556
cc180e71-0ea9-473e-95e0-f6472147f52a	8c630ee6-e46b-4964-9534-993c3d8dad4f	4	2-seam	0.1670	0.8330	1.1446	1.0769	\N	ball	2026-04-13 23:27:11.298682
48e97e88-55ee-4dfb-852e-f752b33ec93f	8c630ee6-e46b-4964-9534-993c3d8dad4f	5	cutter	0.1670	0.1670	1.0369	0.3112	\N	called_strike	2026-04-13 23:27:17.398663
61e50e1a-6538-456c-84cd-71b297e7e5d1	8c630ee6-e46b-4964-9534-993c3d8dad4f	6	cutter	1.1500	0.5000	1.2421	0.5315	\N	ball	2026-04-13 23:27:20.534136
05545708-92ca-4488-8c0c-450e03a55836	8c630ee6-e46b-4964-9534-993c3d8dad4f	7	slider	0.1670	0.8330	0.6369	0.8706	\N	called_strike	2026-04-13 23:27:25.688146
f56a3237-17fc-44bf-8a5f-d220acba29ba	8c630ee6-e46b-4964-9534-993c3d8dad4f	8	slider	0.8330	0.8330	-0.0195	0.7448	\N	called_strike	2026-04-13 23:27:30.788515
60ca0150-c1ab-41d3-a50c-045b1917430e	8c630ee6-e46b-4964-9534-993c3d8dad4f	9	changeup	0.8330	0.8330	0.0215	0.9336	\N	called_strike	2026-04-13 23:27:36.374512
79376539-8c51-4058-8a60-bad0503a60e7	8c630ee6-e46b-4964-9534-993c3d8dad4f	10	changeup	0.1670	0.8330	0.8010	0.5420	\N	called_strike	2026-04-13 23:27:39.420543
f37dd137-b2c9-4bb7-bab2-59cdf624f9bb	8c630ee6-e46b-4964-9534-993c3d8dad4f	11	fastball	0.8330	0.1670	0.5241	0.6678	\N	called_strike	2026-04-13 23:27:43.569704
e58c399e-6091-41a9-8fd0-ee590506d50b	8c630ee6-e46b-4964-9534-993c3d8dad4f	12	changeup	0.1670	0.8330	0.5651	1.0070	\N	called_strike	2026-04-13 23:27:48.007681
73287c5c-983e-432f-94ea-cda804264e14	8c630ee6-e46b-4964-9534-993c3d8dad4f	13	slider	0.8330	0.8330	1.2215	1.0385	\N	ball	2026-04-13 23:27:51.671487
db1185f7-c450-48e1-a579-7ef38255f4e0	8c630ee6-e46b-4964-9534-993c3d8dad4f	14	slider	0.8330	0.8330	0.2062	0.8916	\N	called_strike	2026-04-13 23:27:55.526425
b425a3da-51dc-4852-8541-bfa7d1839a27	8c630ee6-e46b-4964-9534-993c3d8dad4f	15	cutter	0.1670	0.1670	0.8677	-0.0699	\N	called_strike	2026-04-13 23:28:00.339684
\.


--
-- Data for Name: bullpen_plan_assignments; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.bullpen_plan_assignments (id, plan_id, pitcher_id, assigned_by, created_at) FROM stdin;
\.


--
-- Data for Name: bullpen_plan_pitches; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.bullpen_plan_pitches (id, plan_id, sequence, pitch_type, target_x, target_y, instruction) FROM stdin;
ecb3b92f-5ff6-419c-b690-5fe28702753b	5ba32254-6ffc-45bb-bff7-728b1b2d6a12	1	4-seam	0.4722	0.5153	\N
03ae08f2-8b97-49d6-b743-a8c436e33020	5ba32254-6ffc-45bb-bff7-728b1b2d6a12	2	4-seam	0.4886	0.5153	\N
9c4a8efb-d3ba-446c-b017-f5d37f960bca	5ba32254-6ffc-45bb-bff7-728b1b2d6a12	3	4-seam	1.0115	0.5734	\N
ab4381cc-6773-4ebf-a354-188542f6468e	5ba32254-6ffc-45bb-bff7-728b1b2d6a12	4	4-seam	0.0064	0.4728	\N
\.


--
-- Data for Name: bullpen_plans; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.bullpen_plans (id, team_id, name, description, created_by, created_at, updated_at, max_pitches) FROM stdin;
5ba32254-6ffc-45bb-bff7-728b1b2d6a12	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test Bullpen	\N	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-02-09 00:43:30.319058	2026-02-09 00:43:30.319058	\N
\.


--
-- Data for Name: bullpen_sessions; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.bullpen_sessions (id, team_id, pitcher_id, date, intensity, notes, plan_id, status, created_by, created_at, updated_at) FROM stdin;
f7e4af50-2094-43da-87b5-557e60dc149f	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	351ac884-2701-4be0-a855-071557cb07d0	2026-02-08	medium	\N	\N	in_progress	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-02-08 20:55:04.665373	2026-02-08 20:55:04.665373
68589d76-3a80-4c2c-b24e-10e858f49f71	b1fc0e0f-2478-4f4d-a35f-e8f645ec7483	d6ca532f-44e5-4297-a28c-c331034bf836	2026-02-08	medium	\N	\N	in_progress	975e4ad9-2666-4ffb-8c41-282d5738335a	2026-02-08 22:18:00.821104	2026-02-08 22:18:00.821104
25472f5e-de63-4a4f-a39c-49b3bb17ddc4	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	351ac884-2701-4be0-a855-071557cb07d0	2026-02-08	medium	\N	\N	completed	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-02-08 22:45:31.838535	2026-02-08 22:46:27.461324
b2e4156e-1349-4cba-b249-9d356f66fc06	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2026-02-09	medium	Test	\N	completed	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-09 00:19:29.998531	2026-02-09 00:20:04.114739
4756b5d6-501a-406e-81d1-bc670782158a	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2026-02-11	medium	Test\n	\N	completed	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-11 12:36:08.164708	2026-02-11 12:36:54.405253
e97bc09b-9316-4842-ae0e-6ef4c301b04c	46b83059-538e-4a2c-9ba4-10cc22bb1c94	6ea3ab5c-0826-43e2-894d-3e18657959da	2026-03-02	medium	\N	\N	in_progress	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-02 10:18:02.126765	2026-03-02 10:18:02.126765
04e5f36b-bd42-4bcb-b2a3-6965e3441008	46b83059-538e-4a2c-9ba4-10cc22bb1c94	6ea3ab5c-0826-43e2-894d-3e18657959da	2026-03-02	medium	\N	\N	completed	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-02 10:31:21.199627	2026-03-02 10:31:35.107858
8c630ee6-e46b-4964-9534-993c3d8dad4f	49217130-66b3-45ee-87b2-687a8e8d749a	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	2026-04-13	medium	\N	\N	completed	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-13 23:26:47.243138	2026-04-13 23:28:04.402627
\.


--
-- Data for Name: game_pitchers; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.game_pitchers (id, game_id, player_id, pitching_order, inning_entered, inning_exited, created_at) FROM stdin;
b1d4c5b2-08ad-4d3a-b177-1e780e50d724	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	1	1	\N	2026-01-20 23:37:21.374233
ffa6fd94-0cff-4edf-ac29-9c82d29b9234	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	1	1	\N	2026-01-21 00:17:04.03196
6c6ddc05-29cd-4f22-91c4-1544e0503237	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-02-02 19:53:03.035969
56bae3ee-67b9-4480-b0b0-1a543c388901	9fecd787-6a95-48b5-92d4-11abc07b49ae	351ac884-2701-4be0-a855-071557cb07d0	1	1	\N	2026-02-05 00:41:07.931223
9280cc97-cc10-440e-a9cf-a3297712bddf	87e627cd-6475-4920-8631-cde341d811df	9d973e4d-32eb-4b78-af3c-682d622ceccc	1	1	\N	2026-02-09 13:36:14.37319
a4ccad66-3d38-46a9-87b1-38948c334f69	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	1	1	\N	2026-02-13 16:57:54.060107
caa534fe-703d-4df2-a057-6d649acfa663	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	6ea3ab5c-0826-43e2-894d-3e18657959da	1	1	\N	2026-03-02 10:17:50.642444
f2b31f8f-3204-4f6a-b38a-88a6311c4d86	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	1	1	\N	2026-03-02 10:31:05.365369
edef1011-58c2-4f44-9159-b250ba810241	74c67439-71d8-408f-8ad2-eef0e707e368	351ac884-2701-4be0-a855-071557cb07d0	1	1	\N	2026-03-02 22:43:22.886793
713c6bec-4624-49be-91a9-60f460891480	090887a1-a16d-4240-98ac-d1e198eca88e	351ac884-2701-4be0-a855-071557cb07d0	1	1	\N	2026-03-02 23:03:06.299445
5b9a4ad1-2029-425a-8cf8-ff9fe7587384	80bc4d54-c46a-4ea1-9ec4-10b87e2f7a78	351ac884-2701-4be0-a855-071557cb07d0	1	1	\N	2026-03-02 23:21:36.357032
67649ad3-64f6-4ae5-a06d-e520824c218f	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-04 23:08:01.360026
c31608c0-9b7c-4cc4-8c1d-4b92e939b9d5	cf5aba1f-872f-4507-9568-32ca6ef2d171	a3862bcd-180d-45f6-ae5f-eac1c0e9feb5	1	1	\N	2026-03-09 09:30:50.001163
5a08d5d2-9d99-46f9-9e4a-4d1c8a7dc5d5	8c2af398-28db-4eba-b765-58158c5902c9	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-12 22:49:16.879435
0e8f1d4a-48b2-4351-9faa-b346d6e63ed2	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-13 00:03:49.600565
674a12b2-4f23-4ab0-a946-30354bd79a42	a131e300-b856-4fa5-bc35-b1be4040129e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-15 19:19:14.445245
5e48f7cf-b568-4dea-8bb5-b1d6976b3ae1	33f5e62c-befd-4a85-813d-758fb5b1b29b	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-15 19:27:00.379394
0482c2df-249f-46ec-a0cb-176b695716be	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-15 22:24:24.133451
c37da01b-fd4b-47e3-a584-2a53444e7ba8	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-20 15:08:21.579202
5dc65bbb-4bd1-4088-919f-52faca061d65	976d8be2-e7be-46c1-8d31-4166938055e8	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-21 02:45:13.896949
9b914be7-8721-48e9-972c-e1f715a8ef15	0b9002d3-75c3-424f-ac44-52aa7b203b70	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-03-29 22:00:28.06279
26547923-9580-460d-86cf-c7491f81df8e	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	1	1	\N	2026-04-13 23:32:30.406802
fc916150-641e-4901-bb51-e7b1d3637ef1	b1b19f92-72ea-4b11-b28a-f322d936a379	18aa761f-ad20-488a-afaf-017d8b82edf4	1	1	\N	2026-04-17 19:55:22.059527
73ba2524-b37e-4029-9746-cdbd48760bfc	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	1	1	\N	2026-04-18 13:53:42.254766
5cc49ada-a24e-446d-8993-992f6ee64428	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	1	1	\N	2026-04-20 22:07:42.298387
7c3fbd28-9937-447b-b07c-cfa4bb409058	2a83067c-022d-4dcb-9682-dff5b0b83956	1ed97449-4736-42e1-8e76-8838ea0c4530	1	1	1	2026-04-21 20:00:16.291669
4afc6699-af61-4512-964c-690497d80cc1	2a83067c-022d-4dcb-9682-dff5b0b83956	7dc1a211-fbb8-4d00-8b20-03469e026785	2	1	\N	2026-04-21 22:43:49.912547
\.


--
-- Data for Name: game_roles; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.game_roles (id, user_id, game_id, role, assigned_at) FROM stdin;
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.games (id, home_team_id, away_team_id, game_date, game_time, location, status, home_score, away_score, current_inning, inning_half, created_by, created_at, updated_at, opponent_name, base_runners, is_home_game, lineup_size, total_innings, shake_count, charting_mode) FROM stdin;
e233efaa-5749-4c7f-9647-2db19d4a9f0b	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	GIants Field	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-20 23:36:47.674019	2026-01-23 22:09:14.923976	Stars	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
e05c3902-4c93-411a-b119-369cc8294fa4	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-02-04	\N	AHS	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-02 19:51:58.748617	2026-02-02 20:42:02.536755	Klein cain	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
634fd53a-11f5-415e-88d9-db923f545bad	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	\N	completed	2	0	5	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-21 00:14:48.722113	2026-02-08 22:55:32.321113	Test	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
87e627cd-6475-4920-8631-cde341d811df	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-02-10	\N	\N	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-09 01:52:16.76057	2026-02-09 14:04:37.803905	Test	{"first": false, "third": true, "second": false}	t	9	7	0	our_pitcher
9fecd787-6a95-48b5-92d4-11abc07b49ae	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	\N	2026-02-06	\N	\N	completed	3	0	1	top	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-02-05 00:40:51.016671	2026-02-09 23:52:33.755674	Test	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
4e141044-1db9-4114-b901-961f8198be85	46b83059-538e-4a2c-9ba4-10cc22bb1c94	\N	2026-02-14	\N	\N	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-13 16:49:27.76164	2026-02-13 17:17:38.8916	TLU	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
4c676577-90a9-4e4c-8ee2-4937a2d91bbf	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	\N	2026-02-25	\N	\N	completed	0	0	1	top	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-02-24 15:11:07.399984	2026-02-24 16:00:26.058999	Test12	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
74c67439-71d8-408f-8ad2-eef0e707e368	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	\N	2026-02-25	\N	\N	in_progress	0	0	1	top	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-02-24 16:01:03.018639	2026-02-24 16:14:22.832829	132	{"first": false, "third": false, "second": false}	f	9	7	0	our_pitcher
090887a1-a16d-4240-98ac-d1e198eca88e	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	\N	2026-03-04	\N	\N	in_progress	0	0	1	top	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-03-02 23:02:57.327717	2026-03-02 23:03:13.357054	test	{"first": false, "third": false, "second": false}	f	9	7	0	our_pitcher
80bc4d54-c46a-4ea1-9ec4-10b87e2f7a78	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	\N	2026-03-04	\N	\N	in_progress	0	0	1	top	2a4cd21b-36a0-41c6-8a02-7220db6483c8	2026-03-02 23:21:30.021888	2026-03-02 23:21:33.618069	444	{"first": false, "third": false, "second": false}	f	9	7	0	our_pitcher
976d8be2-e7be-46c1-8d31-4166938055e8	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-02-11	\N	\N	in_progress	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-09 22:52:23.638677	2026-03-02 23:32:38.28583	Test	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
cf5aba1f-872f-4507-9568-32ca6ef2d171	45e73824-30e0-4d5d-a6a6-00164eae12b8	\N	2026-03-05	\N	Clear Falls	in_progress	2	0	1	bottom	65a849fb-4d0e-47d4-a350-c10937671bbd	2026-03-04 23:48:14.468034	2026-03-04 23:48:38.816008	Clear Falls	{"first": false, "third": false, "second": false}	f	9	7	0	our_pitcher
8c2af398-28db-4eba-b765-58158c5902c9	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-13	\N	\N	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-12 22:48:45.058723	2026-03-12 22:50:12.476845	Test3333	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
33f5e62c-befd-4a85-813d-758fb5b1b29b	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-02-10	\N	\N	in_progress	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-09 01:51:14.88653	2026-03-15 19:26:57.674411	Kingwood park	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-13	\N	\N	completed	0	0	2	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-13 00:03:02.798542	2026-03-20 14:04:42.945545	Testqqq	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-20	\N	\N	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-20 14:04:58.254783	2026-03-20 16:47:37.678301	Test audio	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
a131e300-b856-4fa5-bc35-b1be4040129e	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-13	\N	\N	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-12 22:55:27.784919	2026-03-20 17:15:04.008233	Los alamos	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	46b83059-538e-4a2c-9ba4-10cc22bb1c94	\N	2026-02-13	\N	Katt-Isbel Field	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-13 16:26:48.601849	2026-03-21 02:08:33.719778	Texas Lutheran	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
22f56c6b-093e-47f5-af95-daa5a8a7373e	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-13	\N	\N	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-12 22:45:38.49097	2026-03-22 01:49:43.361258	Test	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
90026341-347a-4f0a-b995-ab1373d67c57	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-06	\N	\N	completed	7	1	2	bottom	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-04 22:48:03.850731	2026-03-29 20:17:02.94871	Test111	{"first": false, "third": false, "second": false}	f	9	7	0	our_pitcher
a5a1479f-a177-4479-87d8-fe8c8660aa29	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-02-26	\N	\N	completed	16	0	2	bottom	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-24 19:53:39.914283	2026-03-29 20:20:18.664702	Test	{"first": false, "third": false, "second": false}	f	9	7	0	our_pitcher
1e64745e-4bac-454a-8095-de423ed085c0	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-03-30	\N	\N	completed	0	6	8	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-03-29 23:56:45.360644	2026-03-30 00:06:09.72796	Test Game	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
0b9002d3-75c3-424f-ac44-52aa7b203b70	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-02-12	\N	\N	in_progress	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-11 12:37:21.91448	2026-04-06 12:17:14.237409	Test 11	{"first": false, "third": false, "second": false}	t	9	7	4	our_pitcher
42a394d5-36c4-48d1-9c94-e916432e4855	49217130-66b3-45ee-87b2-687a8e8d749a	\N	2026-04-14	\N	\N	completed	0	2	4	top	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-13 23:30:51.712352	2026-04-13 23:36:38.590436	Opponent	{"first": false, "third": false, "second": false}	t	9	7	0	our_pitcher
b1b19f92-72ea-4b11-b28a-f322d936a379	7bb4cf59-011e-4847-86da-30e3ebb28408	\N	2026-04-17	\N	\N	completed	0	0	1	top	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-17 18:27:44.176422	2026-04-18 12:22:31.122598	Schreiner	{"first": false, "third": false, "second": false}	t	9	9	0	our_pitcher
7937c2ca-f234-41de-b723-c616911bb04d	7bb4cf59-011e-4847-86da-30e3ebb28408	\N	2026-04-18	\N	\N	completed	2	9	7	top	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-18 13:38:36.905803	2026-04-18 15:08:55.653459	Schreiner	{"first": false, "third": false, "second": false}	f	9	9	0	our_pitcher
b1eb8c04-00b7-49a7-8fd7-b85bd65b5fba	7bb4cf59-011e-4847-86da-30e3ebb28408	\N	2026-04-22	\N	\N	completed	0	0	1	top	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-21 23:11:19.447572	2026-04-22 00:23:58.017951	Test opp	{"first": false, "third": false, "second": false}	t	9	9	0	both
b31f67fb-6a60-4556-84d6-bf4b2a566fc2	7bb4cf59-011e-4847-86da-30e3ebb28408	\N	2026-04-21	\N	\N	completed	0	0	2	top	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-20 22:07:02.182605	2026-04-20 23:27:08.55433	Test	{"first": false, "third": false, "second": false}	t	9	7	0	both
2a83067c-022d-4dcb-9682-dff5b0b83956	7bb4cf59-011e-4847-86da-30e3ebb28408	\N	2026-04-21	\N	\N	completed	0	0	1	top	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	2026-04-21 19:59:48.418086	2026-04-21 23:03:40.593365	Test	{"first": false, "third": false, "second": false}	t	9	9	0	our_pitcher
\.


--
-- Data for Name: innings; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.innings (id, game_id, inning_number, half, batting_team_id, pitching_team_id, runs_scored, created_at, is_opponent_batting) FROM stdin;
76949c6c-843e-4522-a1a6-a84bae6b0d6e	e233efaa-5749-4c7f-9647-2db19d4a9f0b	1	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-20 23:37:18.869916	t
e098f799-fd69-4a97-a77c-d65019ab5ef9	634fd53a-11f5-415e-88d9-db923f545bad	1	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-21 00:15:31.250383	t
cb4efa38-cafa-42b6-8885-b6556492eab2	634fd53a-11f5-415e-88d9-db923f545bad	1	bottom	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-21 22:46:10.524755	f
9f43a090-1737-4a10-b4fb-8a4058b644fa	634fd53a-11f5-415e-88d9-db923f545bad	2	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-22 23:52:04.605127	t
7db3846b-9bcf-4c09-8104-c2f556897473	634fd53a-11f5-415e-88d9-db923f545bad	2	bottom	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-23 00:00:57.229415	f
a084a8ff-161a-413e-aaea-5bc1c5b92f84	634fd53a-11f5-415e-88d9-db923f545bad	3	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-23 00:00:57.273794	t
8802bdb5-f2c7-4e5c-ae65-3d29504cb99e	634fd53a-11f5-415e-88d9-db923f545bad	3	bottom	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-23 22:45:39.030703	f
c657c598-a091-49a6-9252-12f406edfe10	634fd53a-11f5-415e-88d9-db923f545bad	4	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-23 22:45:39.081106	t
d69a82c4-ece4-418a-a122-063d22073029	634fd53a-11f5-415e-88d9-db923f545bad	4	bottom	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-29 23:36:48.59276	f
eeb12d78-460c-49dd-abe8-ce602f01527c	634fd53a-11f5-415e-88d9-db923f545bad	5	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-01-29 23:36:48.654572	t
b093a5a1-1d83-4c58-b780-113711e1f872	e05c3902-4c93-411a-b119-369cc8294fa4	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-02-02 19:53:11.107516	t
a6ffef2f-30b7-4d86-b18c-046ffd43ae70	9fecd787-6a95-48b5-92d4-11abc07b49ae	1	top	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	0	2026-02-05 00:41:15.836119	t
3b250dd6-a645-4dbd-b353-e439ab3fdddf	87e627cd-6475-4920-8631-cde341d811df	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-02-09 13:36:00.496844	t
f3ebeb00-71a2-47db-a3c6-ccbe9397f4b7	4e141044-1db9-4114-b901-961f8198be85	1	top	46b83059-538e-4a2c-9ba4-10cc22bb1c94	46b83059-538e-4a2c-9ba4-10cc22bb1c94	0	2026-02-13 16:52:01.198315	t
1ccddd8c-cf2f-48b3-9b19-3ba3fe3c19cd	4c676577-90a9-4e4c-8ee2-4937a2d91bbf	1	top	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	0	2026-02-24 15:11:22.73015	t
faa4796a-b3ff-4d83-a497-5c3f9da32908	74c67439-71d8-408f-8ad2-eef0e707e368	1	top	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	0	2026-02-24 16:01:12.31144	t
717450e7-e2a4-4e1b-a97a-6ff1f010a93d	a5a1479f-a177-4479-87d8-fe8c8660aa29	1	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-02-27 17:10:34.37157	f
f660d9b8-d770-4254-96a5-9a506f7408ef	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	1	top	46b83059-538e-4a2c-9ba4-10cc22bb1c94	46b83059-538e-4a2c-9ba4-10cc22bb1c94	0	2026-03-02 10:17:44.759107	t
c3c550a3-cd1c-4996-b9d8-f23a23980911	0b9002d3-75c3-424f-ac44-52aa7b203b70	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-02 10:31:09.594533	t
0afec3ba-b260-4de2-9848-0fa7f5e022d7	090887a1-a16d-4240-98ac-d1e198eca88e	1	top	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	0	2026-03-02 23:03:13.357054	f
3fc006c6-fa39-4c02-82e0-b39dc07aa3b8	80bc4d54-c46a-4ea1-9ec4-10b87e2f7a78	1	top	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	0	2026-03-02 23:21:33.618069	f
13635562-2fba-469c-947d-ad21be800ace	976d8be2-e7be-46c1-8d31-4166938055e8	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-02 23:32:38.28583	t
5a7100ed-f68e-4f29-afc1-1095576b7864	a5a1479f-a177-4479-87d8-fe8c8660aa29	1	bottom	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-03-03 09:24:42.85067	t
49b85d92-d865-4fda-b66b-a1b6a4202377	90026341-347a-4f0a-b995-ab1373d67c57	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-04 22:48:47.571637	f
43cc420d-e3d4-48b7-bfa6-781e966630f8	90026341-347a-4f0a-b995-ab1373d67c57	1	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-04 22:48:51.558862	t
52e23078-80e9-4db4-ad07-6f8d8edf09df	cf5aba1f-872f-4507-9568-32ca6ef2d171	1	top	45e73824-30e0-4d5d-a6a6-00164eae12b8	45e73824-30e0-4d5d-a6a6-00164eae12b8	0	2026-03-04 23:48:34.005815	f
273bac20-24dd-4135-a443-cd9b133caedb	cf5aba1f-872f-4507-9568-32ca6ef2d171	1	bottom	45e73824-30e0-4d5d-a6a6-00164eae12b8	45e73824-30e0-4d5d-a6a6-00164eae12b8	0	2026-03-04 23:48:38.816008	t
3122e6fe-7f0f-405c-911c-859e1487d774	8c2af398-28db-4eba-b765-58158c5902c9	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-12 22:49:22.401813	t
97d78e20-46ee-458f-bd27-a4d780f4bc58	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-13 00:03:46.308448	t
c3b722e2-01f9-4458-aa39-988e05ed8863	22f56c6b-093e-47f5-af95-daa5a8a7373e	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-13 00:03:57.008064	t
edd02fa2-2583-463a-a6de-d9e76fde59e6	a131e300-b856-4fa5-bc35-b1be4040129e	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-15 19:19:10.492172	t
56bd40d8-3fa8-446e-9a38-0a9d328824b5	33f5e62c-befd-4a85-813d-758fb5b1b29b	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-15 19:26:57.674411	t
1f1a9c95-6430-4677-989a-239a5f4ddf39	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	1	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-15 21:56:50.623719	f
737c7860-17ac-4309-ad75-2fcd80c2a49d	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	2	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-15 21:56:50.672042	t
a19c90d3-ed39-4cfe-9467-599b3d608bce	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-20 14:05:55.747877	t
c217da59-8470-4bea-b804-2247723fd8e9	90026341-347a-4f0a-b995-ab1373d67c57	2	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-29 20:16:52.427945	f
d3965ff0-fbe1-4c2f-8c01-3cf149490373	90026341-347a-4f0a-b995-ab1373d67c57	2	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-29 20:16:59.820741	t
2ef3489b-65fa-49e9-beca-c4dd4f9b82b3	a5a1479f-a177-4479-87d8-fe8c8660aa29	2	top	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-03-29 20:20:11.145736	f
2337491a-cffd-403d-be91-591949488cca	a5a1479f-a177-4479-87d8-fe8c8660aa29	2	bottom	07cb5001-1965-49d5-97c6-5a5a52dc2a67	07cb5001-1965-49d5-97c6-5a5a52dc2a67	0	2026-03-29 20:20:15.157492	t
a45894c9-b274-43d4-adb6-8c303b730b76	1e64745e-4bac-454a-8095-de423ed085c0	1	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-29 23:58:40.096247	t
37208f5b-6f03-4523-b610-3e8957724201	1e64745e-4bac-454a-8095-de423ed085c0	1	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:00:18.948014	f
4d065102-a652-4a45-b4de-dc4cab3d63f0	1e64745e-4bac-454a-8095-de423ed085c0	2	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:00:19.007171	t
951a1f45-5e79-438c-b8e6-eb24c1a0158d	1e64745e-4bac-454a-8095-de423ed085c0	2	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:01:24.581272	f
9c02065c-783e-439d-b8ee-c0cb61152d02	1e64745e-4bac-454a-8095-de423ed085c0	3	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:01:24.673177	t
6e9245b2-1abf-4a2a-b811-56dd2007f245	1e64745e-4bac-454a-8095-de423ed085c0	3	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:02:27.683759	f
6ce84258-3aed-4178-87a4-25bb38c39a82	1e64745e-4bac-454a-8095-de423ed085c0	4	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:02:27.742911	t
6e519d04-2b30-4ace-ae0e-0e78e14d24e1	1e64745e-4bac-454a-8095-de423ed085c0	4	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:03:35.213502	f
117de2ee-aa7b-476e-ba05-01813871fa79	1e64745e-4bac-454a-8095-de423ed085c0	5	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:03:35.268008	t
6db988b6-a5da-4435-be63-d5a21a27a741	1e64745e-4bac-454a-8095-de423ed085c0	5	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:04:32.382233	f
f921c7cd-a0d3-47f0-9d6b-feb0a1f050ca	1e64745e-4bac-454a-8095-de423ed085c0	6	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:04:32.441568	t
c3663801-2eff-48f8-961e-465a42075c55	1e64745e-4bac-454a-8095-de423ed085c0	6	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:05:22.556663	f
f1d6098f-37d5-49dc-9994-818039b09d96	1e64745e-4bac-454a-8095-de423ed085c0	7	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:05:22.623633	t
cbd95c1f-0103-4fda-85d2-db3fda427f55	1e64745e-4bac-454a-8095-de423ed085c0	7	bottom	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:06:06.91608	f
42864526-3f27-4488-874f-5a9cdeffa3df	1e64745e-4bac-454a-8095-de423ed085c0	8	top	0afb754c-95f0-4296-96f8-528cc689f0d7	0afb754c-95f0-4296-96f8-528cc689f0d7	0	2026-03-30 00:06:06.971462	t
40195514-b275-4d1e-8f29-a3f6be756bc4	42a394d5-36c4-48d1-9c94-e916432e4855	1	top	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:32:26.244347	t
a8937ae3-3158-40a6-9d88-ffbf9fab5e32	42a394d5-36c4-48d1-9c94-e916432e4855	1	bottom	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:34:01.032087	f
45326376-e4c0-42b1-aa09-ec603d591ab9	42a394d5-36c4-48d1-9c94-e916432e4855	2	top	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:34:01.096368	t
e830e230-0317-464e-a803-0c259f9dc5e0	42a394d5-36c4-48d1-9c94-e916432e4855	2	bottom	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:34:55.140626	f
c181c052-1582-4449-a4c3-6b377fcab07f	42a394d5-36c4-48d1-9c94-e916432e4855	3	top	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:34:55.191551	t
7db643d8-a9a8-410c-8846-b836b2f5d407	42a394d5-36c4-48d1-9c94-e916432e4855	3	bottom	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:36:06.265196	f
67da5c7a-6b62-4a86-b360-ff44063e88f4	42a394d5-36c4-48d1-9c94-e916432e4855	4	top	49217130-66b3-45ee-87b2-687a8e8d749a	49217130-66b3-45ee-87b2-687a8e8d749a	0	2026-04-13 23:36:06.402429	t
24b6df51-b648-424c-929a-2b3fc85598a7	b1b19f92-72ea-4b11-b28a-f322d936a379	1	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-17 18:29:58.911185	t
92976d96-dfcd-4760-a55d-be0d5b20c2da	7937c2ca-f234-41de-b723-c616911bb04d	1	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 13:53:37.916807	t
a9bb08a4-a40e-461f-b89f-ca3f6f0107f1	7937c2ca-f234-41de-b723-c616911bb04d	1	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:07:12.858872	f
b2f493cc-c39b-40aa-9a12-bb48f126601a	7937c2ca-f234-41de-b723-c616911bb04d	2	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:07:13.124271	t
45296299-7807-48b7-97f7-64bc8403f139	7937c2ca-f234-41de-b723-c616911bb04d	2	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:17:48.416408	f
79dcc091-43a3-426f-ad52-13837065b041	7937c2ca-f234-41de-b723-c616911bb04d	3	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:17:48.638912	t
0cc10f76-f252-422d-85d7-5edf82928779	7937c2ca-f234-41de-b723-c616911bb04d	3	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:29:56.50479	f
1464e395-31da-4746-afef-de2feae09e5b	7937c2ca-f234-41de-b723-c616911bb04d	4	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:29:57.039251	t
8d482b08-3ad4-478b-868d-2d986cf5132c	7937c2ca-f234-41de-b723-c616911bb04d	4	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:50:09.859536	f
5a832e9a-33bd-4ed2-8f33-fbe5e70c110c	7937c2ca-f234-41de-b723-c616911bb04d	5	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 14:50:10.218643	t
709c0cbc-0e37-4055-99d8-642a398bf1e9	7937c2ca-f234-41de-b723-c616911bb04d	5	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 15:08:34.224589	t
caeb1589-ea3c-4f4c-ab90-efb0ab549f85	7937c2ca-f234-41de-b723-c616911bb04d	6	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 15:08:42.195595	f
4f788aeb-aadf-4cd2-a076-a75b64d3b488	7937c2ca-f234-41de-b723-c616911bb04d	6	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 15:08:48.141678	t
a7d9e873-610e-46ec-8027-255ff71aed82	7937c2ca-f234-41de-b723-c616911bb04d	7	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-18 15:08:48.78518	f
c83c8933-f5dd-4e6c-955d-3dcab120cfb2	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-20 22:07:50.91281	t
1f5e239b-e9a3-49a9-aef8-519e4147dcb6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1	bottom	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-20 22:09:53.679623	f
56bb3a82-0f60-46d5-91cb-ed7f60d17568	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	2	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-20 22:09:53.895963	t
6dc2ca09-7497-466b-8096-e64d301ca794	2a83067c-022d-4dcb-9682-dff5b0b83956	1	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-21 19:59:55.202155	t
d07f8219-7eaf-4aba-96be-ddac0c181c86	b1eb8c04-00b7-49a7-8fd7-b85bd65b5fba	1	top	7bb4cf59-011e-4847-86da-30e3ebb28408	7bb4cf59-011e-4847-86da-30e3ebb28408	0	2026-04-22 00:04:52.110161	t
\.


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.invites (id, token, team_id, player_id, invited_by, invited_email, role, status, expires_at, accepted_by, accepted_at, created_at) FROM stdin;
2c2f76dd-df5b-4b41-b7e7-8da909eceeca	d2bda187eff237690f6f399e02ae4bd307cfe087636aeeb10a4783a2115cb1e9	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	351ac884-2701-4be0-a855-071557cb07d0	2a4cd21b-36a0-41c6-8a02-7220db6483c8	\N	player	pending	2026-02-10 23:29:48.844	\N	\N	2026-02-03 23:29:48.844802
5b5c7b5a-b2f8-43f4-bed0-7b57c92b3ae6	5a950b7fd014e0a777b892d105bee7093f7233713d2d3dc13a6ff4e89b22eb3d	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	brian.volante@bvolante.com	player	pending	2026-03-23 00:55:54.174	\N	\N	2026-03-16 00:55:54.175617
da9acd17-0427-444d-bf15-8f546f6b253a	a34ce040873806562e14ae2c76952b204a6a048349d408aba1d5bc36f081d73d	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	brian.volante@bvolante.com	player	pending	2026-03-23 00:57:54.447	\N	\N	2026-03-16 00:57:54.447881
\.


--
-- Data for Name: join_requests; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.join_requests (id, team_id, user_id, message, status, reviewed_by, linked_player_id, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: my_team_lineup; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.my_team_lineup (id, game_id, player_id, batting_order, "position", is_starter, replaced_by_id, inning_entered, created_at) FROM stdin;
\.


--
-- Data for Name: opponent_lineup; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.opponent_lineup (id, game_id, player_name, batting_order, "position", bats, is_starter, replaced_by_id, inning_entered, created_at) FROM stdin;
3d9b8c8f-3652-4e5f-8a6a-5556285445fe	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Bob	1	\N	R	t	\N	\N	2026-01-20 23:37:16.062621
7be31580-ae60-4282-8f4d-9796b2002ad8	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Steve	2	\N	R	t	\N	\N	2026-01-20 23:37:16.073617
b84a1d22-64c5-468b-9e9b-19f2104fc74b	e233efaa-5749-4c7f-9647-2db19d4a9f0b	John	3	\N	R	t	\N	\N	2026-01-20 23:37:16.080999
0e6bbd6e-eb90-4770-a143-2d909db69176	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Tim	4	\N	R	t	\N	\N	2026-01-20 23:37:16.081924
0b93116b-54cd-491f-8e5f-5be8c3130e8c	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Brian	5	\N	R	t	\N	\N	2026-01-20 23:37:16.082831
de2b5b93-f0bb-4f5a-94a9-71eae8b38541	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Lance	6	\N	R	t	\N	\N	2026-01-20 23:37:16.084715
533ece99-5c75-492c-b9bd-c0db5bfa8436	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Mark	7	\N	R	t	\N	\N	2026-01-20 23:37:16.085611
0a1e7412-30a4-4280-aff0-bff2e632b683	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Matt	8	\N	R	t	\N	\N	2026-01-20 23:37:16.086513
06843e4f-965e-44df-9928-2c836d5bff04	e233efaa-5749-4c7f-9647-2db19d4a9f0b	Chris	9	\N	R	t	\N	\N	2026-01-20 23:37:16.08792
e3afda0f-473b-4aa5-85f4-9b652c492a80	634fd53a-11f5-415e-88d9-db923f545bad	Batter 1	1	\N	R	t	\N	\N	2026-01-21 00:15:28.376122
cabfb8c4-99a8-4882-8eac-6827b6cec2f7	634fd53a-11f5-415e-88d9-db923f545bad	Batter 2	2	\N	L	t	\N	\N	2026-01-21 00:15:28.378997
d687b69b-cbbe-4122-af75-7e786a1cf1a7	634fd53a-11f5-415e-88d9-db923f545bad	Batter 3	3	\N	L	t	\N	\N	2026-01-21 00:15:28.380038
a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	634fd53a-11f5-415e-88d9-db923f545bad	Batter 4	4	\N	R	t	\N	\N	2026-01-21 00:15:28.381004
a4ec5dc3-de54-4032-8f63-10b368cdacc8	634fd53a-11f5-415e-88d9-db923f545bad	Batter 5	5	\N	L	t	\N	\N	2026-01-21 00:15:28.382017
8e21c4ad-da7a-4eca-87a1-5fc413245196	634fd53a-11f5-415e-88d9-db923f545bad	Batter 6	6	\N	R	t	\N	\N	2026-01-21 00:15:28.382938
b2a034c5-80cc-406c-8737-9ba09e217e26	634fd53a-11f5-415e-88d9-db923f545bad	Batter 7	7	\N	L	t	\N	\N	2026-01-21 00:15:28.383862
611bf9b2-a413-4eb9-a4c4-664cb8035cc3	634fd53a-11f5-415e-88d9-db923f545bad	Batter 8	8	\N	R	t	\N	\N	2026-01-21 00:15:28.387613
fc4392f7-8d67-4648-a8a9-bf62c369c3ba	634fd53a-11f5-415e-88d9-db923f545bad	Batter 9	9	\N	R	t	\N	\N	2026-01-21 00:15:28.388519
f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	e05c3902-4c93-411a-b119-369cc8294fa4	1	1	\N	R	t	\N	\N	2026-02-02 19:52:42.891335
b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	e05c3902-4c93-411a-b119-369cc8294fa4	2	2	\N	R	t	\N	\N	2026-02-02 19:52:42.894639
fe099dde-7555-47ae-b3ec-72120f6b4fda	e05c3902-4c93-411a-b119-369cc8294fa4	3	3	\N	R	t	\N	\N	2026-02-02 19:52:42.897803
be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	e05c3902-4c93-411a-b119-369cc8294fa4	4	4	\N	R	t	\N	\N	2026-02-02 19:52:42.898768
1f17134b-d9fa-4559-aae0-c2d3cbfc6fb5	e05c3902-4c93-411a-b119-369cc8294fa4	5	5	\N	R	t	\N	\N	2026-02-02 19:52:42.900536
7be7d4ab-6986-4902-a727-37c3369aaa40	e05c3902-4c93-411a-b119-369cc8294fa4	6	6	\N	R	t	\N	\N	2026-02-02 19:52:42.901503
908b6942-4359-41f9-aeac-780dc6b1e65a	e05c3902-4c93-411a-b119-369cc8294fa4	7	7	\N	R	t	\N	\N	2026-02-02 19:52:42.902557
807fff6f-6753-4cd8-a8ef-d1778c983a57	e05c3902-4c93-411a-b119-369cc8294fa4	8	8	\N	R	t	\N	\N	2026-02-02 19:52:42.903488
920e7e55-b00e-460a-bb15-6d71c9f7e18b	e05c3902-4c93-411a-b119-369cc8294fa4	9	9	\N	R	t	\N	\N	2026-02-02 19:52:42.904406
7dafc19a-198f-4701-b37b-d63ca107dac1	9fecd787-6a95-48b5-92d4-11abc07b49ae	1	1	\N	R	t	\N	\N	2026-02-05 00:41:04.532172
8c07d735-d4c4-4bd2-a34d-fc45e68dcaad	9fecd787-6a95-48b5-92d4-11abc07b49ae	2	2	\N	R	t	\N	\N	2026-02-05 00:41:04.53417
9f110a54-32bf-4ac7-978c-2801aed6fdcb	9fecd787-6a95-48b5-92d4-11abc07b49ae	3	3	\N	R	t	\N	\N	2026-02-05 00:41:04.53527
1f781ed5-2c9f-4d85-982f-34f6aeefde2e	9fecd787-6a95-48b5-92d4-11abc07b49ae	4	4	\N	R	t	\N	\N	2026-02-05 00:41:04.539104
21b6d76e-d25c-411e-975c-a7d072d0438d	9fecd787-6a95-48b5-92d4-11abc07b49ae	5	5	\N	R	t	\N	\N	2026-02-05 00:41:04.54017
d94b6364-94b2-4093-ad6d-7c4ff82187a1	9fecd787-6a95-48b5-92d4-11abc07b49ae	6	6	\N	R	t	\N	\N	2026-02-05 00:41:04.541263
a440aa47-5f8d-40b2-bceb-008cdb4d42f7	9fecd787-6a95-48b5-92d4-11abc07b49ae	7	7	\N	R	t	\N	\N	2026-02-05 00:41:04.542343
420d7337-d381-4937-99eb-23ea48e50c65	9fecd787-6a95-48b5-92d4-11abc07b49ae	8	8	\N	R	t	\N	\N	2026-02-05 00:41:04.544115
67c583f8-b12c-4eb1-b2ff-295b442097e1	9fecd787-6a95-48b5-92d4-11abc07b49ae	9	9	\N	R	t	\N	\N	2026-02-05 00:41:04.545167
2377fb0a-da7f-4562-9e6f-fda99c878cf5	87e627cd-6475-4920-8631-cde341d811df	1	1	\N	R	t	\N	\N	2026-02-09 13:36:38.59166
aa54fd9b-4bd2-4ad0-a9ba-b75401fdec57	87e627cd-6475-4920-8631-cde341d811df	2	2	\N	R	t	\N	\N	2026-02-09 13:36:38.597908
d498c79a-0ce7-4519-ba0d-9cd0381ef411	87e627cd-6475-4920-8631-cde341d811df	3	3	\N	R	t	\N	\N	2026-02-09 13:36:38.599072
8d4efcea-8a1c-4cb4-88ab-4e91b87dc2d3	87e627cd-6475-4920-8631-cde341d811df	4	4	\N	R	t	\N	\N	2026-02-09 13:36:38.600063
322564fc-a926-4c78-8522-e487345dcb2a	87e627cd-6475-4920-8631-cde341d811df	5	5	\N	R	t	\N	\N	2026-02-09 13:36:38.601028
e14907fd-8751-42a5-a967-4c3501ca1c5b	87e627cd-6475-4920-8631-cde341d811df	6	6	\N	R	t	\N	\N	2026-02-09 13:36:38.602071
9a4abafb-3c0f-4b21-832a-6e956a6989f8	87e627cd-6475-4920-8631-cde341d811df	7	7	\N	R	t	\N	\N	2026-02-09 13:36:38.603608
5fd37ba4-d6c6-44ea-a485-f7aadfbe058e	87e627cd-6475-4920-8631-cde341d811df	8	8	\N	R	t	\N	\N	2026-02-09 13:36:38.604935
b3253ef9-6b12-4085-a98e-9d8c5b180959	87e627cd-6475-4920-8631-cde341d811df	9	9	\N	R	t	\N	\N	2026-02-09 13:36:38.605996
008496cd-9ad8-4761-8206-a60c57c94d2f	4e141044-1db9-4114-b901-961f8198be85	3	1	\N	R	t	\N	\N	2026-02-13 16:50:55.953679
bfaff040-ac17-408b-a706-12f5e99a323f	4e141044-1db9-4114-b901-961f8198be85	11	2	\N	R	t	\N	\N	2026-02-13 16:50:55.976015
753857ca-ccc5-48fc-8e53-c269ec6b0ef9	4e141044-1db9-4114-b901-961f8198be85	10	3	\N	R	t	\N	\N	2026-02-13 16:50:55.977604
480a5556-5f52-406f-9eca-f8b909872132	4e141044-1db9-4114-b901-961f8198be85	24	4	\N	R	t	\N	\N	2026-02-13 16:50:55.979715
5a76f896-3276-431b-a015-68e88680caab	4e141044-1db9-4114-b901-961f8198be85	30	5	\N	R	t	\N	\N	2026-02-13 16:50:55.980779
b397836b-cc2d-441a-9bcf-d3c92cf853aa	4e141044-1db9-4114-b901-961f8198be85	1	6	\N	R	t	\N	\N	2026-02-13 16:50:55.981905
860d675d-de8f-456a-a2f1-cf8e4b662168	4e141044-1db9-4114-b901-961f8198be85	2	7	\N	R	t	\N	\N	2026-02-13 16:50:55.98908
32a1f8ad-94b8-4f48-aeca-4d85b536f38d	4e141044-1db9-4114-b901-961f8198be85	29	8	\N	R	t	\N	\N	2026-02-13 16:50:55.991069
10c7ebb4-14ff-4f00-a3e0-a7620d655ce9	4e141044-1db9-4114-b901-961f8198be85	8	9	\N	R	t	\N	\N	2026-02-13 16:50:55.992301
c8570706-5564-4fd6-b4ad-b4a3f0be13fb	a5a1479f-a177-4479-87d8-fe8c8660aa29	Player 1	1	\N	R	f	\N	\N	2026-03-02 23:32:26.354366
e47853c4-097c-4857-a5a8-12b262aea5fe	976d8be2-e7be-46c1-8d31-4166938055e8	Bob	1	\N	R	f	\N	\N	2026-03-02 23:32:51.463344
5f7c1954-6561-4dda-bdff-a9b951b5ec3d	976d8be2-e7be-46c1-8d31-4166938055e8	Tim	2	\N	R	f	\N	\N	2026-03-02 23:32:56.808067
84087b62-c439-409a-bde7-54791abe9c27	a5a1479f-a177-4479-87d8-fe8c8660aa29	Nick	2	\N	R	f	\N	\N	2026-03-03 09:24:51.350327
88f16340-616c-402c-bb1e-5ee07d6d0a42	90026341-347a-4f0a-b995-ab1373d67c57	Joe	1	\N	R	t	\N	\N	2026-03-04 22:48:32.847121
63ff096c-0595-4314-b725-aaf8280e2c19	90026341-347a-4f0a-b995-ab1373d67c57	Bob	2	\N	R	t	\N	\N	2026-03-04 22:48:32.856209
7a1ee07d-dc91-483d-b698-561f8d0f9362	90026341-347a-4f0a-b995-ab1373d67c57	Nick	3	\N	R	t	\N	\N	2026-03-04 22:48:32.857479
6005e8ee-7b5c-45ff-83c6-afc933222b99	90026341-347a-4f0a-b995-ab1373d67c57	Steve	4	\N	R	t	\N	\N	2026-03-04 22:48:32.858589
d37f5ed5-41bb-4f21-9588-f5033778d220	90026341-347a-4f0a-b995-ab1373d67c57	Dave	5	\N	R	t	\N	\N	2026-03-04 22:48:32.859562
bd6ca747-d5d1-47fd-af85-2ce4e1487a65	90026341-347a-4f0a-b995-ab1373d67c57	Mike	6	\N	R	t	\N	\N	2026-03-04 22:48:32.860923
89cb812d-6da2-4b80-af16-1749a0c69122	90026341-347a-4f0a-b995-ab1373d67c57	Paul	7	\N	R	t	\N	\N	2026-03-04 22:48:32.861904
181f0e82-b22b-41d0-a177-48253bb294f0	90026341-347a-4f0a-b995-ab1373d67c57	George	8	\N	R	t	\N	\N	2026-03-04 22:48:32.862948
8bf7dc9a-96d6-4088-b0d5-55e3e74b4913	90026341-347a-4f0a-b995-ab1373d67c57	Cash	9	\N	R	t	\N	\N	2026-03-04 22:48:32.866761
ea7730c0-2016-4f46-8fc8-c91be3d05be4	22f56c6b-093e-47f5-af95-daa5a8a7373e	Joe	1	\N	R	t	\N	\N	2026-03-12 22:46:04.899108
3817f318-0fa6-490b-907f-2e2866bd7860	22f56c6b-093e-47f5-af95-daa5a8a7373e	Bob	2	\N	R	t	\N	\N	2026-03-12 22:46:04.904394
480c96e8-4835-42f6-8b45-0a2f8ca0a5cf	22f56c6b-093e-47f5-af95-daa5a8a7373e	Tim	3	\N	R	t	\N	\N	2026-03-12 22:46:04.907506
9cfdb455-9611-4751-a161-ca96aaa13658	22f56c6b-093e-47f5-af95-daa5a8a7373e	Steve	4	\N	R	t	\N	\N	2026-03-12 22:46:04.908612
7e5bee40-fdae-46ff-8b74-33f5f4847eb2	22f56c6b-093e-47f5-af95-daa5a8a7373e	Greg	5	\N	R	t	\N	\N	2026-03-12 22:46:04.909672
13c1ef90-28dc-4d02-8042-aea37d539cc5	22f56c6b-093e-47f5-af95-daa5a8a7373e	Abe	6	\N	R	t	\N	\N	2026-03-12 22:46:04.910754
0d669210-ed6a-44f3-83e1-f196fd9c1b46	22f56c6b-093e-47f5-af95-daa5a8a7373e	Aaron	7	\N	R	t	\N	\N	2026-03-12 22:46:04.911759
36d9b3c8-e974-4e47-ae50-9d509a7364e6	22f56c6b-093e-47f5-af95-daa5a8a7373e	Paul	8	\N	R	t	\N	\N	2026-03-12 22:46:04.912894
098b496e-82ff-42ac-a7a7-13a22537104f	22f56c6b-093e-47f5-af95-daa5a8a7373e	Rob	9	\N	R	t	\N	\N	2026-03-12 22:46:04.91398
c1d687c0-d0c8-4e16-897f-ad5afe353af0	8c2af398-28db-4eba-b765-58158c5902c9	Bob	1	\N	R	t	\N	\N	2026-03-12 22:49:11.780107
c25c7c6f-39ed-4f94-8945-11be7631e18b	8c2af398-28db-4eba-b765-58158c5902c9	Tim	2	\N	R	t	\N	\N	2026-03-12 22:49:11.784816
04d49b23-a772-4b3d-a5c9-1b84b3487db9	8c2af398-28db-4eba-b765-58158c5902c9	Steve	3	\N	R	t	\N	\N	2026-03-12 22:49:11.789407
649e7943-eecd-482c-8011-4d9433834cc4	8c2af398-28db-4eba-b765-58158c5902c9	Aaron	4	\N	R	t	\N	\N	2026-03-12 22:49:11.795035
3fb46b7c-188b-4f27-9b1b-0f7c44b462c5	8c2af398-28db-4eba-b765-58158c5902c9	Luke	5	\N	R	t	\N	\N	2026-03-12 22:49:11.796519
9cd2a95e-d7e4-4acf-ac18-146fcb850fa2	8c2af398-28db-4eba-b765-58158c5902c9	Paul	6	\N	R	t	\N	\N	2026-03-12 22:49:11.797585
e4672a0b-5726-45fc-89b0-ec146e0810d7	8c2af398-28db-4eba-b765-58158c5902c9	Peter	7	\N	R	t	\N	\N	2026-03-12 22:49:11.798649
e833287d-331f-4b1c-9417-82252deefded	8c2af398-28db-4eba-b765-58158c5902c9	Andy	8	\N	R	t	\N	\N	2026-03-12 22:49:11.799594
10d78d17-7058-468a-bfc6-c9b6e2978f54	8c2af398-28db-4eba-b765-58158c5902c9	Buzz	9	\N	R	t	\N	\N	2026-03-12 22:49:11.800549
df9cb11e-03de-4efe-a36a-957be2f75a19	a131e300-b856-4fa5-bc35-b1be4040129e	1	1	\N	R	t	\N	\N	2026-03-12 22:55:48.352468
95a6fb7e-af9e-492a-891b-dbabd7db3cd2	a131e300-b856-4fa5-bc35-b1be4040129e	2	2	\N	R	t	\N	\N	2026-03-12 22:55:48.356226
5912dede-9d45-435f-9222-adb789df0d84	a131e300-b856-4fa5-bc35-b1be4040129e	3	3	\N	R	t	\N	\N	2026-03-12 22:55:48.360057
0f7131bd-0a40-412b-a386-0f098c4d24fb	a131e300-b856-4fa5-bc35-b1be4040129e	4	4	\N	R	t	\N	\N	2026-03-12 22:55:48.361815
445e6ba1-3e31-4215-84ae-3e6083526cd1	a131e300-b856-4fa5-bc35-b1be4040129e	5	5	\N	R	t	\N	\N	2026-03-12 22:55:48.363083
0ba0bea5-7a5e-406b-bc5a-572c575da795	a131e300-b856-4fa5-bc35-b1be4040129e	6	6	\N	R	t	\N	\N	2026-03-12 22:55:48.364031
17937f22-fea5-451d-b589-c68c60b878ec	a131e300-b856-4fa5-bc35-b1be4040129e	7	7	\N	R	t	\N	\N	2026-03-12 22:55:48.365054
f190b5a9-d4bd-477e-b28d-481d99f681ed	a131e300-b856-4fa5-bc35-b1be4040129e	8	8	\N	R	t	\N	\N	2026-03-12 22:55:48.366024
c0d3c8fd-01ac-4136-8a7c-4056868c7e57	a131e300-b856-4fa5-bc35-b1be4040129e	9	9	\N	R	t	\N	\N	2026-03-12 22:55:48.367072
8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Rob	2	\N	R	t	\N	\N	2026-03-13 00:03:34.827773
e76bcd26-4fa4-42ee-88bf-b57239ba2123	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Tom	3	\N	R	t	\N	\N	2026-03-13 00:03:34.842864
4d648849-e475-48fd-8480-28f6f6069a95	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Paul	4	\N	R	t	\N	\N	2026-03-13 00:03:34.848422
14058472-c7e0-40d2-9bcd-df1e7fc4ed92	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Peter	5	\N	R	t	\N	\N	2026-03-13 00:03:34.851376
544029b2-c2ea-43ad-be1e-2aa36967e1c4	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Wayne	6	\N	R	t	\N	\N	2026-03-13 00:03:34.853643
8d6279aa-2767-4297-8a7f-6196bcad5ae4	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Dave	7	\N	R	t	\N	\N	2026-03-13 00:03:34.855439
33b58e18-6c47-4440-a2db-58f82287157c	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Lou	8	\N	R	t	\N	\N	2026-03-13 00:03:34.856366
bb8553ac-b8b6-4469-9f33-efe290aa10ef	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Mike	9	\N	R	t	\N	\N	2026-03-13 00:03:34.857338
61a0a8b0-9e5c-491c-bafb-a41de7949f59	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	Will	1	\N	L	t	\N	\N	2026-03-13 00:03:34.825292
6e83c4de-d823-4ce4-892e-d1f3983e9002	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Joe	1	\N	R	t	\N	\N	2026-03-20 14:05:47.691593
02c47954-c61d-476c-b63b-6cc786338a4c	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Tim	2	\N	L	t	\N	\N	2026-03-20 14:05:47.695626
848b937f-22ab-48d6-9c37-372efc1d6f89	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Bob	3	\N	S	t	\N	\N	2026-03-20 14:05:47.699246
a4966063-ee85-4bef-a434-41d894bd7fe8	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Paul	4	\N	R	t	\N	\N	2026-03-20 14:05:47.700302
fcf1b0a0-6767-4476-a043-78b9b6d431e4	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Wayne	5	\N	R	t	\N	\N	2026-03-20 14:05:47.701301
7f446738-96a8-40d2-bb5a-51f5f387f459	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Kevin	6	\N	L	t	\N	\N	2026-03-20 14:05:47.711235
7fd552b8-9a8e-486e-bf15-077def80b458	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Key	7	\N	R	t	\N	\N	2026-03-20 14:05:47.713163
b3fc80b5-7dd8-415e-8ad5-cd8ce5fa6cf2	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Land	8	\N	L	t	\N	\N	2026-03-20 14:05:47.714705
96c08a51-8c7c-4775-bdb5-b65a7867b80f	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	Oil	9	\N	R	t	\N	\N	2026-03-20 14:05:47.715902
837e1ba5-d577-4d41-bd29-8814f64b35bb	a131e300-b856-4fa5-bc35-b1be4040129e	bob	1	\N	L	f	\N	\N	2026-03-20 17:14:27.041114
3a330c61-0d90-4496-b0af-549cb8da50e3	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	bob	1	\N	L	f	\N	\N	2026-03-21 01:19:48.721169
dc8d7684-0066-4d52-ab18-5ff814662d20	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	Tim	2	\N	R	f	\N	\N	2026-03-21 01:19:55.06117
039f65c5-444c-4e0d-af25-7bcc2331afe0	33f5e62c-befd-4a85-813d-758fb5b1b29b	Rob	1	\N	L	f	\N	\N	2026-03-21 02:19:33.396308
862048b7-c054-44ea-ace2-a11cefbd86b1	a5a1479f-a177-4479-87d8-fe8c8660aa29	Bob	3	\N	L	f	\N	\N	2026-03-29 20:19:55.518316
d1e8e930-c005-44d5-8d4c-0a00b1dcc339	0b9002d3-75c3-424f-ac44-52aa7b203b70	bob	1	\N	R	f	\N	\N	2026-03-29 22:01:07.159264
9ca52c4a-b026-4b42-bfb4-4912855f36e0	1e64745e-4bac-454a-8095-de423ed085c0	Steve	1	\N	L	t	\N	\N	2026-03-29 23:58:32.328883
96722c55-d598-4bc7-93d3-a2b7c09b225a	1e64745e-4bac-454a-8095-de423ed085c0	John	2	\N	R	t	\N	\N	2026-03-29 23:58:32.331468
31af3047-e71b-493a-a3b3-877092d4692d	1e64745e-4bac-454a-8095-de423ed085c0	Bob	3	\N	L	t	\N	\N	2026-03-29 23:58:32.333725
fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	1e64745e-4bac-454a-8095-de423ed085c0	Will	4	\N	L	t	\N	\N	2026-03-29 23:58:32.335289
e07da3a0-df5f-4484-8d7c-d1416c6addeb	1e64745e-4bac-454a-8095-de423ed085c0	Nick	5	\N	R	t	\N	\N	2026-03-29 23:58:32.337689
a625a9e1-3559-410d-9ba4-aff10d1459ae	1e64745e-4bac-454a-8095-de423ed085c0	Andy	6	\N	R	t	\N	\N	2026-03-29 23:58:32.340849
2b45a0d5-3f16-420e-a385-93a390d5f5f0	1e64745e-4bac-454a-8095-de423ed085c0	Paul	7	\N	L	t	\N	\N	2026-03-29 23:58:32.343182
0c04737c-7eb7-4fa1-b1d5-a45df318a685	1e64745e-4bac-454a-8095-de423ed085c0	Jack	8	\N	R	t	\N	\N	2026-03-29 23:58:32.345568
c7758c42-7e26-4adb-ad8d-2d77a8d5327c	1e64745e-4bac-454a-8095-de423ed085c0	Rob	9	\N	L	t	\N	\N	2026-03-29 23:58:32.347714
ff78f40d-6187-4f2d-a47a-eb928ca115ca	42a394d5-36c4-48d1-9c94-e916432e4855	Bob	1	\N	R	t	\N	\N	2026-04-13 23:31:30.526149
ad4bff9e-78d3-4e46-80d7-fa45de5c99f8	42a394d5-36c4-48d1-9c94-e916432e4855	Tim	2	\N	L	t	\N	\N	2026-04-13 23:31:30.530501
8ba8d012-284c-4840-97ba-4804b07f3449	42a394d5-36c4-48d1-9c94-e916432e4855	Steve	3	\N	R	t	\N	\N	2026-04-13 23:31:30.531949
d9f51a9c-fac2-4b7d-80c9-775c4b3e1594	42a394d5-36c4-48d1-9c94-e916432e4855	John	4	\N	L	t	\N	\N	2026-04-13 23:31:30.533349
4e3d3099-a400-4b8f-b8d1-d5ec90f3bb75	42a394d5-36c4-48d1-9c94-e916432e4855	Adam	5	\N	R	t	\N	\N	2026-04-13 23:31:30.534778
e12034fc-0cbc-4309-b240-88f8c3201659	42a394d5-36c4-48d1-9c94-e916432e4855	Greg	6	\N	R	t	\N	\N	2026-04-13 23:31:30.537168
a9f571b4-4e17-44e8-839a-3b2a4321ad3a	42a394d5-36c4-48d1-9c94-e916432e4855	Paul	7	\N	L	t	\N	\N	2026-04-13 23:31:30.538767
578a0aa3-74f9-4e26-8b1e-7b833b7ce39e	42a394d5-36c4-48d1-9c94-e916432e4855	Will	8	\N	R	t	\N	\N	2026-04-13 23:31:30.540541
9261036d-ac02-42ac-bf2a-f8cba7549148	42a394d5-36c4-48d1-9c94-e916432e4855	Nic	9	\N	R	t	\N	\N	2026-04-13 23:31:30.542343
6eb4bb44-1d30-4f06-9029-cc4f7b1415f0	b1b19f92-72ea-4b11-b28a-f322d936a379	6	1	\N	R	f	\N	\N	2026-04-17 19:55:08.482529
4489e04d-8136-4229-984c-4b6f4a460576	b1b19f92-72ea-4b11-b28a-f322d936a379	10	2	\N	R	f	\N	\N	2026-04-17 19:55:15.631192
58d2c817-5174-4351-9af7-02d9242a67dc	7937c2ca-f234-41de-b723-c616911bb04d	10	1	\N	R	f	\N	\N	2026-04-18 13:55:33.370336
ecef8da8-79ce-4322-a835-a468d5663394	7937c2ca-f234-41de-b723-c616911bb04d	6	2	\N	R	f	\N	\N	2026-04-18 13:56:59.720722
9f0bbac7-9861-44ab-8fae-5179816f6151	7937c2ca-f234-41de-b723-c616911bb04d	21	3	\N	L	f	\N	\N	2026-04-18 13:59:16.538904
3539b425-cb5b-43f0-bf7a-685f26022c7e	7937c2ca-f234-41de-b723-c616911bb04d	7	4	\N	R	f	\N	\N	2026-04-18 14:08:58.489073
97c0431d-f710-4e36-9cd8-790825dde339	7937c2ca-f234-41de-b723-c616911bb04d	18	5	\N	R	f	\N	\N	2026-04-18 14:10:20.19919
73ec00f4-6f42-4ac9-805b-082fc25033c0	7937c2ca-f234-41de-b723-c616911bb04d	55	6	\N	L	f	\N	\N	2026-04-18 14:11:31.928845
fa92c880-1d31-437f-a3c4-0b3a49a6c460	7937c2ca-f234-41de-b723-c616911bb04d	2	7	\N	R	f	\N	\N	2026-04-18 14:19:12.238342
1cd1f6ca-23d2-4f35-877a-869e499b3d2c	7937c2ca-f234-41de-b723-c616911bb04d	29	8	\N	L	f	\N	\N	2026-04-18 14:21:16.518822
e7cb5e29-795b-496b-9d38-2d9eb5382696	7937c2ca-f234-41de-b723-c616911bb04d	3	9	\N	R	f	\N	\N	2026-04-18 14:22:06.054269
e2995a92-2246-4497-b99f-04ae060f476e	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	John	1	\N	R	t	\N	\N	2026-04-20 22:07:35.580628
d234fc41-3f80-4a6c-b0ba-f3af8bfbb18b	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Tim	2	\N	R	t	\N	\N	2026-04-20 22:07:35.585177
7ca6976d-2558-4e98-a13c-b3a99f6fb7e6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Steve	3	\N	R	t	\N	\N	2026-04-20 22:07:35.588063
b7647a23-7ee8-4490-abf7-f74d408a34bc	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Greg	4	\N	R	t	\N	\N	2026-04-20 22:07:35.590284
d16fb7e7-9425-4e03-9373-d32be18dcb56	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Luke	5	\N	R	t	\N	\N	2026-04-20 22:07:35.607249
4d16daa2-0306-4817-aa03-9e35cb860dad	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Matt	6	\N	R	t	\N	\N	2026-04-20 22:07:35.609916
1ec9cb5c-a847-44df-94c3-2bd392ea61b2	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Mark	7	\N	R	t	\N	\N	2026-04-20 22:07:35.611794
692af8b9-48c3-4eee-950c-f15376ba8d84	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Jude	8	\N	R	t	\N	\N	2026-04-20 22:07:35.615748
9f9d4465-7217-4d3d-9a1f-8c42b0ee385f	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	Bob	9	\N	R	t	\N	\N	2026-04-20 22:07:35.618257
f0140070-929e-48d3-a4bd-683b061bfc16	2a83067c-022d-4dcb-9682-dff5b0b83956	1	1	\N	R	f	\N	\N	2026-04-21 20:00:22.50814
788fbc6c-08f3-42ce-adb0-f8c598520887	2a83067c-022d-4dcb-9682-dff5b0b83956	2	2	\N	R	f	\N	\N	2026-04-21 20:01:22.564374
\.


--
-- Data for Name: opponent_lineup_profiles; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.opponent_lineup_profiles (opponent_lineup_id, profile_id) FROM stdin;
61a0a8b0-9e5c-491c-bafb-a41de7949f59	c581c54b-8aeb-4275-b72c-ab74108402ec
a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	302c95c4-6f33-42a4-bda0-24dcef061867
6e83c4de-d823-4ce4-892e-d1f3983e9002	6cdb081c-1353-4bde-8582-3ead6fce2cc2
e3afda0f-473b-4aa5-85f4-9b652c492a80	ee4a8fe1-aaa9-45a2-99b2-6e5de1ef9fac
cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1ef42cd1-9e16-4f1d-8f31-dc753ce2c460
f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	d3a05c7e-09ad-4661-8f85-130e0a5f2dde
b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	a113e999-0a4e-48f3-bac2-afbcf3e099cb
fe099dde-7555-47ae-b3ec-72120f6b4fda	a90c1c38-4c98-4b41-a844-afef236c0c5f
be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	da739c62-903d-4ee7-8f1c-904fe556a94d
1f17134b-d9fa-4559-aae0-c2d3cbfc6fb5	76ef4460-5f00-4651-b19d-b0b1e0492e1c
8c07d735-d4c4-4bd2-a34d-fc45e68dcaad	192d181f-94e7-4409-8027-3834eeee353a
9f110a54-32bf-4ac7-978c-2801aed6fdcb	745adafd-9f99-4958-aa7c-0bc7a8d49b36
1f781ed5-2c9f-4d85-982f-34f6aeefde2e	93fa8fde-03cf-4da0-8da5-b8fc8f024d9c
21b6d76e-d25c-411e-975c-a7d072d0438d	ecdb472a-76eb-4954-8637-ed4247e6b9e8
df9cb11e-03de-4efe-a36a-957be2f75a19	bc0a2bc6-792e-425d-bd6c-e5cfa50487bd
2377fb0a-da7f-4562-9e6f-fda99c878cf5	4257e7a7-20d0-479a-9d51-d9da5dacdd45
aa54fd9b-4bd2-4ad0-a9ba-b75401fdec57	6e726b02-9c6f-4049-97ce-496a3611407e
ea7730c0-2016-4f46-8fc8-c91be3d05be4	d13c339c-5c5a-4d70-9652-c3b9e8fd4c41
7dafc19a-198f-4701-b37b-d63ca107dac1	53b1646e-349e-41c3-b58c-288d1bce9094
e47853c4-097c-4857-a5a8-12b262aea5fe	587f2e04-6913-451e-9c47-8e1e9ed69af4
bfaff040-ac17-408b-a706-12f5e99a323f	395888c0-29c6-48d6-b251-6640c37f8647
753857ca-ccc5-48fc-8e53-c269ec6b0ef9	9441ecab-1f46-423a-80db-7f7163426922
008496cd-9ad8-4761-8206-a60c57c94d2f	fab8891f-0454-420d-9ec0-e9ab372bbe8a
c1d687c0-d0c8-4e16-897f-ad5afe353af0	fde28ba8-a009-4346-9e18-83abcc412cb6
c25c7c6f-39ed-4f94-8945-11be7631e18b	1a0c89c7-688f-4a0c-89a3-2a60043d3f03
3a330c61-0d90-4496-b0af-549cb8da50e3	600c1bb9-1b21-454a-ac4d-a666b9aede16
d1e8e930-c005-44d5-8d4c-0a00b1dcc339	7641d753-94d0-4054-92f3-58f79cca5e93
e2995a92-2246-4497-b99f-04ae060f476e	13276948-2cce-4a2f-a63c-2aa84ade6031
58d2c817-5174-4351-9af7-02d9242a67dc	da137c8a-2f87-4321-a32f-b30aea2a8d31
f0140070-929e-48d3-a4bd-683b061bfc16	8573d4b2-2f2a-4870-8de6-9942c2bf0794
\.


--
-- Data for Name: opposing_pitchers; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.opposing_pitchers (id, game_id, team_name, pitcher_name, jersey_number, throws, created_at) FROM stdin;
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.organization_members (id, organization_id, user_id, role, created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.organizations (id, name, slug, description, logo_path, primary_color, secondary_color, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: performance_summaries; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.performance_summaries (id, source_type, source_id, pitcher_id, team_id, narrative, narrative_generated_at, total_pitches, strikes, balls, strike_percentage, target_accuracy_percentage, batters_faced, innings_pitched, runs_allowed, hits_allowed, intensity, plan_name, metrics, pitch_type_breakdown, highlights, concerns, created_at, updated_at) FROM stdin;
c1e071e5-3f4a-ce53-9c3e-66d76870da89	game	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	49217130-66b3-45ee-87b2-687a8e8d749a	Johnny, that was an impressive outing today—your 92% strike rate is elite stuff, and getting 90% of your first pitches over the zone kept you in complete control throughout those 7 innings. Your fastball was particularly sharp at 86% strikes, and both your 4-seam and cutter were essentially unhittable at 100% strikes, which is exactly what we want to see. The one area we need to address is your target accuracy at 28%—you're throwing strikes, but they're not landing where you're aiming them, so let's spend some time next session focusing on your release point consistency and hitting your spots more precisely. Overall, this was a dominant performance that shows your stuff is there; we just need to sharpen up the precision to take it to the next level.	2026-04-20 12:12:51.092619-04	25	23	2	92.00	28.00	9	7.0	\N	1	\N	\N	[{"value": 92, "rating": "highlight", "metric_name": "Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 62}, {"value": 90, "rating": "highlight", "metric_name": "First-Pitch Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 60}, {"value": 28, "rating": "concern", "metric_name": "Target Accuracy", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 70}, {"value": 0, "rating": "highlight", "metric_name": "3-Ball Count Rate", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 20}]	[{"balls": 1, "count": 7, "rating": "highlight", "strikes": 6, "pitch_type": "fastball", "avg_velocity": null, "top_velocity": null, "strike_percentage": 86, "target_accuracy_percentage": 71}, {"balls": 0, "count": 5, "rating": "highlight", "strikes": 5, "pitch_type": "4-seam", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 20}, {"balls": 0, "count": 5, "rating": "highlight", "strikes": 5, "pitch_type": "cutter", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}, {"balls": 1, "count": 4, "rating": "highlight", "strikes": 3, "pitch_type": "changeup", "avg_velocity": null, "top_velocity": null, "strike_percentage": 75, "target_accuracy_percentage": 25}, {"balls": 0, "count": 2, "rating": "highlight", "strikes": 2, "pitch_type": "2-seam", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}, {"balls": 0, "count": 2, "rating": "highlight", "strikes": 2, "pitch_type": "slider", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}]	["Strike %: 92%", "First-Pitch Strike %: 90%", "3-Ball Count Rate: 0%", "Fastball was sharp: 86% strikes", "4-seam was sharp: 100% strikes", "Cutter was sharp: 100% strikes"]	["Target Accuracy: 28%"]	2026-04-20 12:12:48.203318-04	2026-04-20 12:12:51.092619-04
26e1dffa-9ddd-7f51-83c3-0124ece3766b	game	b1b19f92-72ea-4b11-b28a-f322d936a379	18aa761f-ad20-488a-afaf-017d8b82edf4	7bb4cf59-011e-4847-86da-30e3ebb28408	Great work today, Hunter—you threw one pitch and it was a strike, which shows excellent command when it counts. Your 100% first-pitch strike rate is exactly what we want to see, and you kept the count efficient with zero 3-ball situations. The one thing I want to dig into is the target accuracy metric at 0%, which seems disconnected from your perfect strike percentage—let's review the video together to make sure we're tracking your actual location versus your intended targets, because if you're hitting your spots consistently, that number should reflect it. Overall, solid appearance on the mound.	2026-04-20 11:16:59.846897-04	1	1	0	100.00	0.00	1	1.0	\N	\N	\N	\N	[{"value": 100, "rating": "highlight", "metric_name": "Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 62}, {"value": 100, "rating": "highlight", "metric_name": "First-Pitch Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 60}, {"value": 0, "rating": "concern", "metric_name": "Target Accuracy", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 70}, {"value": 0, "rating": "highlight", "metric_name": "3-Ball Count Rate", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 20}]	[{"balls": 0, "count": 1, "rating": "highlight", "strikes": 1, "pitch_type": "fastball", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}]	["Strike %: 100%", "First-Pitch Strike %: 100%", "3-Ball Count Rate: 0%"]	["Target Accuracy: 0%"]	2026-04-20 11:16:54.866091-04	2026-04-20 11:16:59.846897-04
06f4ffda-5ee6-7d07-16bd-c9a8fcd9fa2e	game	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	7bb4cf59-011e-4847-86da-30e3ebb28408	Great outing today, Brayden—your strike percentage of 70% is well above the benchmark of 62%, and your first-pitch strike rate of 67% shows excellent command early in counts, which keeps hitters off balance. Your fastball was particularly sharp at 85% strikes, and you kept deep counts to a minimum with only a 17% three-ball rate. The one area we need to tighten up is your target accuracy at 36%, which is significantly below our 70% benchmark—this suggests you're getting the strikes but need to be more precise about where they're landing. Moving forward, let's work on hitting your spots more consistently so you can pair that excellent strike-throwing with pinpoint location.	2026-04-20 11:22:02.442506-04	67	47	20	70.00	36.00	9	13.0	\N	2	\N	\N	[{"value": 70, "rating": "highlight", "metric_name": "Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 62}, {"value": 67, "rating": "highlight", "metric_name": "First-Pitch Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 60}, {"value": 36, "rating": "concern", "metric_name": "Target Accuracy", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 70}, {"value": 17, "rating": "highlight", "metric_name": "3-Ball Count Rate", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 20}]	[{"balls": 13, "count": 33, "rating": "neutral", "strikes": 20, "pitch_type": "slider", "avg_velocity": null, "top_velocity": null, "strike_percentage": 61, "target_accuracy_percentage": 55}, {"balls": 4, "count": 27, "rating": "highlight", "strikes": 23, "pitch_type": "fastball", "avg_velocity": null, "top_velocity": null, "strike_percentage": 85, "target_accuracy_percentage": 22}, {"balls": 2, "count": 5, "rating": "neutral", "strikes": 3, "pitch_type": "changeup", "avg_velocity": null, "top_velocity": null, "strike_percentage": 60, "target_accuracy_percentage": 0}, {"balls": 1, "count": 2, "rating": "concern", "strikes": 1, "pitch_type": "curveball", "avg_velocity": null, "top_velocity": null, "strike_percentage": 50, "target_accuracy_percentage": 0}]	["Strike %: 70%", "First-Pitch Strike %: 67%", "3-Ball Count Rate: 17%", "Fastball was sharp: 85% strikes"]	["Target Accuracy: 36%"]	2026-04-20 03:12:17.237883-04	2026-04-20 11:22:02.442506-04
02097cb5-0f81-f63b-a377-f1895ec9738a	game	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	7bb4cf59-011e-4847-86da-30e3ebb28408	Adam, that was a fantastic outing in the game today—your stuff was working exactly how we want to see it. You threw 89% strikes with a perfect 100% first-pitch strike rate, which is well above the 62% and 60% benchmarks respectively, and you kept yourself out of deep counts by posting a 0% three-ball rate. The one area we need to address is your target accuracy at 0%—while you're clearly throwing strikes, we need to make sure you're hitting your specific locations more consistently to set up your next pitch and keep hitters off balance. Great foundation to build on; let's work on sharpening that precision in our next session.	2026-04-21 09:46:16.360838-04	9	8	1	89.00	0.00	5	3.0	\N	\N	\N	\N	[{"value": 89, "rating": "highlight", "metric_name": "Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 62}, {"value": 100, "rating": "highlight", "metric_name": "First-Pitch Strike %", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 60}, {"value": 0, "rating": "concern", "metric_name": "Target Accuracy", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 70}, {"value": 0, "rating": "highlight", "metric_name": "3-Ball Count Rate", "delta_from_avg": null, "historical_avg": null, "benchmark_value": 20}]	[{"balls": 0, "count": 2, "rating": "highlight", "strikes": 2, "pitch_type": "2-seam", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}, {"balls": 1, "count": 2, "rating": "concern", "strikes": 1, "pitch_type": "4-seam", "avg_velocity": null, "top_velocity": null, "strike_percentage": 50, "target_accuracy_percentage": 0}, {"balls": 0, "count": 2, "rating": "highlight", "strikes": 2, "pitch_type": "changeup", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}, {"balls": 0, "count": 2, "rating": "highlight", "strikes": 2, "pitch_type": "fastball", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}, {"balls": 0, "count": 1, "rating": "highlight", "strikes": 1, "pitch_type": "slider", "avg_velocity": null, "top_velocity": null, "strike_percentage": 100, "target_accuracy_percentage": 0}]	["Strike %: 89%", "First-Pitch Strike %: 100%", "3-Ball Count Rate: 0%"]	["Target Accuracy: 0%"]	2026-04-21 09:46:13.347477-04	2026-04-21 09:46:16.360838-04
\.


--
-- Data for Name: pitch_calls; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.pitch_calls (id, game_id, at_bat_id, team_id, pitcher_id, batter_id, opponent_batter_id, call_number, pitch_type, zone, is_change, original_call_id, result, pitch_id, bt_transmitted, called_by, inning, balls_before, strikes_before, created_at, result_logged_at, category, situational_type, pickoff_base) FROM stdin;
84fd53bd-4f3d-4dc8-b877-2e12e1e70370	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	\N	\N	1	FB	W-high-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-20 15:09:00.190501-04	\N	pitch	\N	\N
d7b0dbd6-4be0-4b7e-b0da-a936ab48aba2	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	\N	\N	2	CB	1-1	t	84fd53bd-4f3d-4dc8-b877-2e12e1e70370	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-20 16:47:09.261602-04	2026-03-20 16:47:17.833978-04	pitch	\N	\N
a87e0ad4-a3a5-4c13-b8e4-2fe0a2398c67	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	\N	\N	3	SL	0-2	f	\N	foul	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-20 16:47:23.000657-04	2026-03-20 16:47:30.912157-04	pitch	\N	\N
4886e4d1-3875-4b44-9053-896b5c8d9c87	22f56c6b-093e-47f5-af95-daa5a8a7373e	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	1	FB	W-high	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 00:45:11.100055-04	\N	pitch	\N	\N
6f4a5096-5099-42ed-9142-299b6ab1d154	22f56c6b-093e-47f5-af95-daa5a8a7373e	2f38f521-2a95-498d-a224-c22e5f544e18	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	10	FB	0-0	f	\N	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:49:31.678259-04	2026-03-22 01:49:38.316135-04	pitch	\N	\N
faf7962f-9c84-4030-8e53-4fede37a9482	22f56c6b-093e-47f5-af95-daa5a8a7373e	3a4e05b3-3dbd-4a27-b138-ac337977a67e	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	2	FB	W-out	f	\N	foul	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 01:50:03.177979-04	2026-03-21 01:51:06.387016-04	pitch	\N	\N
30dc183e-5ef3-4108-93fb-11b403963516	22f56c6b-093e-47f5-af95-daa5a8a7373e	3a4e05b3-3dbd-4a27-b138-ac337977a67e	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	3	CB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 01:51:19.43791-04	\N	pitch	\N	\N
b084ee98-8804-43c3-8493-336eefa9f8f4	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	\N	46b83059-538e-4a2c-9ba4-10cc22bb1c94	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	3a330c61-0d90-4496-b0af-549cb8da50e3	1	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 02:05:02.777365-04	\N	pitch	\N	\N
7c1eb67e-f215-4b6c-9f19-ceee07dd2a64	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	c8e11f0c-fa5b-44cb-8806-525f27beb03b	46b83059-538e-4a2c-9ba4-10cc22bb1c94	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	3a330c61-0d90-4496-b0af-549cb8da50e3	2	2S	W-out	f	\N	strike	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 02:08:16.835701-04	2026-03-21 02:08:18.897269-04	pitch	\N	\N
c53448d3-f028-42d3-9627-cb642314fdac	33f5e62c-befd-4a85-813d-758fb5b1b29b	38960cd9-7cfb-4189-b258-52a8cd468aa5	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	039f65c5-444c-4e0d-af25-7bcc2331afe0	1	FB	0-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 02:20:04.341647-04	\N	pitch	\N	\N
a9c46803-470e-4aa7-a949-458ed9e7a813	976d8be2-e7be-46c1-8d31-4166938055e8	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	e47853c4-097c-4857-a5a8-12b262aea5fe	1	FB	2-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 02:45:21.629267-04	\N	pitch	\N	\N
b1cc53a6-f670-4781-9845-0bcfa230260e	976d8be2-e7be-46c1-8d31-4166938055e8	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	e47853c4-097c-4857-a5a8-12b262aea5fe	2	2S	2-2	t	a9c46803-470e-4aa7-a949-458ed9e7a813	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 02:45:32.031253-04	\N	pitch	\N	\N
2183dbaf-54cd-408b-ba10-47028ce00d7d	22f56c6b-093e-47f5-af95-daa5a8a7373e	566028ec-63ed-4529-80b1-84598b47ef53	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	4	FB	2-2	f	\N	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 09:32:15.835673-04	2026-03-21 09:32:20.966255-04	pitch	\N	\N
f5d9a342-fbcd-4b87-afc5-b283e27b52ea	22f56c6b-093e-47f5-af95-daa5a8a7373e	f93eecd0-815c-4ddd-80bb-9fd36e8cfef8	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	11	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:50:00.759319-04	\N	pitch	\N	\N
f4826aa9-4d34-4786-99e6-eaec1f86f3b6	22f56c6b-093e-47f5-af95-daa5a8a7373e	60a9c686-2794-441e-be34-8cdd722fb3d9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	5	FB	1-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-21 13:10:52.510404-04	\N	pitch	\N	\N
c95a24f8-9f95-4d0d-89c3-98b28b78e458	22f56c6b-093e-47f5-af95-daa5a8a7373e	2f38f521-2a95-498d-a224-c22e5f544e18	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	6	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:48:07.857841-04	\N	pitch	\N	\N
a2638365-ddb0-433d-871d-88d6843c37c0	22f56c6b-093e-47f5-af95-daa5a8a7373e	2f38f521-2a95-498d-a224-c22e5f544e18	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	7	FB	W-in	f	\N	ball	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:48:45.549965-04	2026-03-22 01:48:57.174361-04	pitch	\N	\N
b330b7a7-5b3f-45f1-948a-d35e417ecaa5	22f56c6b-093e-47f5-af95-daa5a8a7373e	f93eecd0-815c-4ddd-80bb-9fd36e8cfef8	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	12	FB	1-2	t	f5d9a342-fbcd-4b87-afc5-b283e27b52ea	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:50:07.035937-04	\N	pitch	\N	\N
6f5646ed-6941-4b0f-87d0-a644488d96b8	22f56c6b-093e-47f5-af95-daa5a8a7373e	2f38f521-2a95-498d-a224-c22e5f544e18	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	8	CB	2-2	f	\N	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:49:03.146246-04	2026-03-22 01:49:11.023512-04	pitch	\N	\N
74bd2e8b-a319-48df-842e-9a545d9355c7	22f56c6b-093e-47f5-af95-daa5a8a7373e	2f38f521-2a95-498d-a224-c22e5f544e18	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	ea7730c0-2016-4f46-8fc8-c91be3d05be4	9	CH	W-low	f	\N	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:49:20.576612-04	2026-03-22 01:49:26.788004-04	pitch	\N	\N
6c44f7e1-3b05-44d2-ab86-0f9b81ef8694	90026341-347a-4f0a-b995-ab1373d67c57	bcdee466-9c7f-4b09-992c-4db18443b320	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	63ff096c-0595-4314-b725-aaf8280e2c19	5	FB	1-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:06:56.545627-04	\N	pitch	\N	\N
d8289735-0f94-4df0-95a4-9af811b6199f	22f56c6b-093e-47f5-af95-daa5a8a7373e	f93eecd0-815c-4ddd-80bb-9fd36e8cfef8	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	13	FB	W-out	t	b330b7a7-5b3f-45f1-948a-d35e417ecaa5	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-22 01:50:14.222307-04	\N	pitch	\N	\N
032f9b5d-ff67-4367-a454-45a78f2b2952	90026341-347a-4f0a-b995-ab1373d67c57	3e597028-c8e7-47ae-acad-dc5575ca0b31	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	1	CB	2-0	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 00:33:14.496999-04	\N	pitch	\N	\N
8fdaa4e1-9707-4643-b04d-593e2dffff64	90026341-347a-4f0a-b995-ab1373d67c57	3e597028-c8e7-47ae-acad-dc5575ca0b31	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	2	CH	2-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 00:33:51.389387-04	\N	pitch	\N	\N
3b534c21-b99c-4a54-97a6-f999d16a3835	90026341-347a-4f0a-b995-ab1373d67c57	3e597028-c8e7-47ae-acad-dc5575ca0b31	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	3	FB	W-high	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 00:38:52.417199-04	\N	pitch	\N	\N
efde1b45-7244-4df9-aae3-65320c3738db	90026341-347a-4f0a-b995-ab1373d67c57	bcdee466-9c7f-4b09-992c-4db18443b320	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	6	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:07:38.627941-04	\N	pitch	\N	\N
21e94eec-99b6-4b69-b886-bda4914b773a	90026341-347a-4f0a-b995-ab1373d67c57	6bbb74bb-1266-45c3-bd3b-691fc0c2880b	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	7	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:08:25.266669-04	\N	pitch	\N	\N
6ea36cc6-86fd-4705-8bbd-1e131a93254a	90026341-347a-4f0a-b995-ab1373d67c57	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	4	2S	2-2	f	\N	in_play	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:02:29.894907-04	2026-03-25 01:06:29.465856-04	pitch	\N	\N
e9ad4d8a-8e1e-40f9-ab8e-be7d9200472c	90026341-347a-4f0a-b995-ab1373d67c57	f679c3f8-0594-44a9-81c4-3a48a6a2af4d	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	8	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:31:58.346687-04	\N	pitch	\N	\N
57e6e7f5-97f7-4c0d-9620-405c04389cad	90026341-347a-4f0a-b995-ab1373d67c57	517c2bc3-3ba7-4ab9-8bda-870582f42083	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	11	FB	1-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 02:09:41.35718-04	\N	pitch	\N	\N
ce982968-7981-43cc-bd1a-43ac5a9d87c5	90026341-347a-4f0a-b995-ab1373d67c57	5aa8b118-9885-4dd7-936e-98db06d3202c	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	9	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:32:29.39112-04	\N	pitch	\N	\N
2da969e7-069e-47a3-986a-5952bc012bd8	90026341-347a-4f0a-b995-ab1373d67c57	7b917869-3af0-4844-acc9-0da4ccbaa0c1	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	10	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-25 01:55:53.317377-04	\N	pitch	\N	\N
36719eb1-c0d4-4394-a86b-9e5cd148bbe7	90026341-347a-4f0a-b995-ab1373d67c57	408fc664-9346-489a-be2b-fa24e9511fd9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	15	FB	W-out	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-29 19:52:03.203325-04	\N	pitch	\N	\N
a4b3887b-3900-4cd8-ad9b-a16b14b6f213	90026341-347a-4f0a-b995-ab1373d67c57	91a7dfd0-7fa2-4a59-9c4d-70632fc5baf8	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	12	FB	W-out	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-29 15:11:38.98654-04	\N	pitch	\N	\N
3fa59bad-6ea1-446e-8a6f-a5dcf529ed06	90026341-347a-4f0a-b995-ab1373d67c57	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	13	FB	1-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-29 17:31:19.746516-04	\N	pitch	\N	\N
cd46b9da-832b-4c06-953d-950b36a36a81	90026341-347a-4f0a-b995-ab1373d67c57	8fdfe099-bc8d-4acb-b19d-954785da423d	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	88f16340-616c-402c-bb1e-5ee07d6d0a42	14	FB	W-out	f	\N	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-29 18:28:12.96539-04	2026-03-29 18:28:40.10563-04	pitch	\N	\N
1b54585d-6d7c-45a8-8596-60885da7602b	0b9002d3-75c3-424f-ac44-52aa7b203b70	5dc24b40-10f2-404b-9e90-ef372db06055	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	1	2S	1-2	f	\N	strike	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-29 22:01:20.04934-04	2026-03-29 22:01:41.931512-04	pitch	\N	\N
7f8c74d8-45b1-471a-9764-bda706e3102c	0b9002d3-75c3-424f-ac44-52aa7b203b70	ebef7553-bebc-46b0-bae2-c2cde2641749	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	2	FB	1-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-03-30 22:13:58.144614-04	\N	pitch	\N	\N
17c57e6b-011b-4eb9-a6d1-4dd3d6e31b25	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	3	FB	1-1	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-05 13:14:44.237767-04	\N	pitch	\N	\N
aa414cb3-3076-4b72-b30d-ad0ab198628b	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	4	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:01:50.33395-04	\N	situational	1st_3rd_coverage	\N
0e6daf7a-d6e1-4b0c-b73d-b328bb47d0a1	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	5	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:01:51.546994-04	\N	situational	1st_3rd_coverage	\N
1922f424-43e2-4751-92d0-e244b25adf01	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	6	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:01:56.574564-04	\N	situational	1st_3rd_coverage	\N
280e9d5f-84ce-4bc7-b973-4b2b603b9c92	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	7	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:01:57.35986-04	\N	situational	1st_3rd_coverage	\N
6ec12898-b7a1-4c04-9d49-365cbf9a08d2	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	8	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:01:57.958773-04	\N	situational	pickoff	\N
7303435e-cce7-4408-8558-96da0bc0110f	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	9	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:01:59.328605-04	\N	situational	pickoff	\N
81963f21-40fb-4100-a4ff-87281278c892	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	10	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:00.197232-04	\N	situational	bunt_coverage	\N
a815e34e-c3d6-4c09-a777-67d22bcfc162	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	11	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:03.910019-04	\N	situational	pickoff	\N
e60a1346-25cc-4035-a094-7b80e6b1719e	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	12	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:04.896462-04	\N	situational	bunt_coverage	\N
cbadefab-a25f-404e-8c2b-c90fa732a7fd	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	13	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:07.081409-04	\N	situational	pickoff	\N
b52bd649-7371-441f-9650-d05e3f2d7a82	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	14	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:07.610198-04	\N	situational	pickoff	\N
21913758-992b-4282-8b27-85025dd76035	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	15	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:10.566963-04	\N	situational	bunt_coverage	\N
0ec416ee-77b9-44cd-81a5-338efb5775a5	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	16	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:11.831965-04	\N	situational	1st_3rd_coverage	\N
635374e4-6653-4cb7-9761-dcc2285e8e5d	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	17	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:12.553384-04	\N	situational	shake	\N
d0942548-037c-4c65-a640-958dc5b02c45	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	18	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:13.765187-04	\N	situational	shake	\N
8dc0cd64-f412-46a3-b79e-a7400115509b	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	19	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:14.829519-04	\N	situational	1st_3rd_coverage	\N
d5bf4b19-7a9d-4ae9-8949-4eb6f3342dfa	0b9002d3-75c3-424f-ac44-52aa7b203b70	de1c3dd1-2765-492c-b8e5-1dedb29489b9	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	20	FB	1-2	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 00:02:16.1705-04	\N	pitch	\N	\N
a4ed94df-26d0-46b8-8e7c-57bcf9152060	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	21	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 12:17:11.067408-04	\N	situational	pickoff	\N
95164738-02e8-4bd0-b2d2-7675dad4c24a	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	22	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 12:17:12.030289-04	\N	situational	bunt_coverage	\N
56313690-04ee-4150-bc39-c34f7fe7756e	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	23	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 12:17:13.584897-04	\N	situational	shake	\N
72205404-6bf6-413a-977a-7e0888b8d438	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	\N	24	\N	\N	f	\N	\N	\N	f	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-06 12:17:14.237409-04	\N	situational	shake	\N
3287359a-b389-4100-9c25-093645d70e73	0b9002d3-75c3-424f-ac44-52aa7b203b70	47efa0a4-4e2f-4901-940e-55cf8dd6deca	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	25	FB	1-1	f	\N	\N	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-08 18:04:38.417602-04	\N	pitch	\N	\N
c37bab16-bfbd-4585-b795-fcf33d0e22d9	0b9002d3-75c3-424f-ac44-52aa7b203b70	\N	0afb754c-95f0-4296-96f8-528cc689f0d7	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	26	FB	1-2	f	\N	strike	\N	t	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	1	0	0	2026-04-13 23:22:24.192962-04	2026-04-13 23:22:50.165082-04	pitch	\N	\N
6e27eb0c-7529-40b5-96b8-29fd2fa32bdc	2a83067c-022d-4dcb-9682-dff5b0b83956	d3a92c04-f55f-4313-ba85-9d8dbea1be5a	7bb4cf59-011e-4847-86da-30e3ebb28408	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	788fbc6c-08f3-42ce-adb0-f8c598520887	1	FB	2-2	f	\N	\N	\N	t	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	1	0	0	2026-04-21 20:03:43.810762-04	\N	pitch	\N	\N
\.


--
-- Data for Name: pitcher_pitch_types; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.pitcher_pitch_types (id, player_id, pitch_type, created_at) FROM stdin;
a17cdd4c-0b7a-4ef3-a989-2555a6e2a195	ba572510-0315-424f-990a-73eb34c3bc65	4-seam	2026-01-21 00:16:46.829056
2edd2ec0-6f0b-4a12-9316-66f3b74d8d9e	ba572510-0315-424f-990a-73eb34c3bc65	2-seam	2026-01-21 00:16:46.830469
4da9e257-38b6-45de-b546-8f585f388338	ba572510-0315-424f-990a-73eb34c3bc65	slider	2026-01-21 00:16:46.831528
9baef7c2-c0c8-4723-827a-324fae60b93a	ba572510-0315-424f-990a-73eb34c3bc65	changeup	2026-01-21 00:16:46.832708
c75ac3fa-fc8b-4793-b4ec-2ce6fe93cf63	51e16641-e136-455a-80ee-4a07873b79e5	4-seam	2026-01-21 00:16:56.386205
8730a61c-5b2f-45b3-af67-f79258a1b635	51e16641-e136-455a-80ee-4a07873b79e5	2-seam	2026-01-21 00:16:56.387785
89fe7bc6-7489-41c6-bdba-388f9ba6ce6f	51e16641-e136-455a-80ee-4a07873b79e5	curveball	2026-01-21 00:16:56.389814
5ef9082b-ed59-4991-8c64-25aaf3da9158	51e16641-e136-455a-80ee-4a07873b79e5	changeup	2026-01-21 00:16:56.391063
7d34b956-de37-4b41-a618-f1325c13d72d	ee6b9172-c188-4d42-a1a8-096635d2c6cc	4-seam	2026-02-02 19:51:29.663749
ae042fd1-b4bf-460c-a0fa-ea585b14b20f	ee6b9172-c188-4d42-a1a8-096635d2c6cc	2-seam	2026-02-02 19:51:29.665456
06541035-9591-402a-8ae5-4b23d7c2b232	ee6b9172-c188-4d42-a1a8-096635d2c6cc	curveball	2026-02-02 19:51:29.66646
ba099a9b-a2bd-4065-bcc4-29ac91c66b60	ee6b9172-c188-4d42-a1a8-096635d2c6cc	changeup	2026-02-02 19:51:29.667369
60f6e96b-7cd3-4952-82b7-32d9df3cfeea	351ac884-2701-4be0-a855-071557cb07d0	4-seam	2026-02-03 23:29:36.650672
40213b20-ead2-4176-b3ed-74c41e978ad0	351ac884-2701-4be0-a855-071557cb07d0	2-seam	2026-02-03 23:29:36.653743
8d690882-bca2-47ba-91eb-8ef8fea905b2	351ac884-2701-4be0-a855-071557cb07d0	slider	2026-02-03 23:29:36.654676
4411dae0-5b5a-4d06-8509-d03531cc06bf	351ac884-2701-4be0-a855-071557cb07d0	changeup	2026-02-03 23:29:36.65548
6e3aead4-def2-4127-9b60-5d23864a9d1b	351ac884-2701-4be0-a855-071557cb07d0	curveball	2026-02-08 22:46:11.14179
859d41ab-efe0-4c2a-b200-af6d2529eb5e	9d973e4d-32eb-4b78-af3c-682d622ceccc	4-seam	2026-02-09 13:35:46.547097
0024a81e-ce2c-4c61-9e14-4a13ca960918	9d973e4d-32eb-4b78-af3c-682d622ceccc	2-seam	2026-02-09 13:35:46.552944
a2ac933b-8920-4536-8c3c-a8cf9ce2804a	9d973e4d-32eb-4b78-af3c-682d622ceccc	curveball	2026-02-09 13:35:46.554147
413301ba-66ea-4ed3-ab63-837dd23693eb	9d973e4d-32eb-4b78-af3c-682d622ceccc	changeup	2026-02-09 13:35:46.555193
a106b1fb-4a45-42e7-a0af-06c607a43350	6ea3ab5c-0826-43e2-894d-3e18657959da	4-seam	2026-02-13 17:10:39.810669
277e532d-09a7-41b8-8f60-feecef789a5b	6ea3ab5c-0826-43e2-894d-3e18657959da	2-seam	2026-02-13 17:10:48.98117
7707e461-d8b3-4b85-ad30-803bd59d0eaa	6ea3ab5c-0826-43e2-894d-3e18657959da	curveball	2026-02-13 17:11:43.182743
c26f1ca2-d8ad-4b04-8306-b3e80edb15d7	6ea3ab5c-0826-43e2-894d-3e18657959da	slider	2026-02-13 17:13:25.647887
3ef0cf65-3406-49c8-942f-9eadf80b78a2	6ea3ab5c-0826-43e2-894d-3e18657959da	cutter	2026-02-13 17:14:10.247874
86daac43-279c-409b-9833-ecc70cf85695	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	fastball	2026-04-13 23:26:53.996495
1e892b1c-f42b-4335-81d6-df20584b1998	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	4-seam	2026-04-13 23:26:59.924806
5fdd2725-6523-49ce-b5a6-c84944ea356a	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	2-seam	2026-04-13 23:27:04.850556
d30f5e8d-dd70-44ea-aaca-3d47de774854	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	cutter	2026-04-13 23:27:17.398663
4f2e4a3b-6f25-4b92-a43c-344152a67352	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	slider	2026-04-13 23:27:25.688146
abb8cd2b-13cb-4505-a29b-b82800e53e4e	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	changeup	2026-04-13 23:27:36.374512
2c7d0e8e-a72b-48fb-b91f-9c7ee0b3a246	18aa761f-ad20-488a-afaf-017d8b82edf4	fastball	2026-04-18 12:22:23.33378
3a36cd8d-4ae5-48ed-aa19-e1e33b8945f3	88809758-99ac-475e-b2dd-6f0f16470634	fastball	2026-04-18 13:55:56.881895
04dfb3ee-d9d6-4ec1-af22-0383a96214a8	88809758-99ac-475e-b2dd-6f0f16470634	changeup	2026-04-18 13:56:09.659937
1b174fc1-e78b-4bc9-a721-bfa789a281d7	88809758-99ac-475e-b2dd-6f0f16470634	slider	2026-04-18 13:56:42.226619
bc289a08-e078-4695-9da5-f3316ab7e60f	88809758-99ac-475e-b2dd-6f0f16470634	curveball	2026-04-18 13:59:35.61346
6b4e23f1-cc03-48a7-90ec-cc9b84ff7682	1ed97449-4736-42e1-8e76-8838ea0c4530	2-seam	2026-04-20 22:08:12.596761
f12a8cee-a926-47fa-bc97-d0b94e4c7cef	1ed97449-4736-42e1-8e76-8838ea0c4530	changeup	2026-04-20 22:08:24.557649
c7fd40d8-5815-4c21-b7c3-cd0c526e0ae7	1ed97449-4736-42e1-8e76-8838ea0c4530	4-seam	2026-04-20 22:08:43.555198
27d7652a-a085-4708-a836-1497444d7c80	1ed97449-4736-42e1-8e76-8838ea0c4530	slider	2026-04-20 22:09:00.95356
d1ddf71a-2ad0-4402-b85e-273540b5a94b	1ed97449-4736-42e1-8e76-8838ea0c4530	fastball	2026-04-20 22:09:41.021632
c54e8c57-b897-4bc1-898b-5df849a60e76	7dc1a211-fbb8-4d00-8b20-03469e026785	4-seam	2026-04-21 22:44:03.380983
e335db00-ebc0-47b5-ab9b-3247285b49d9	7dc1a211-fbb8-4d00-8b20-03469e026785	cutter	2026-04-21 22:44:29.732358
\.


--
-- Data for Name: pitches; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.pitches (id, at_bat_id, game_id, pitcher_id, batter_id, pitch_number, pitch_type, velocity, location_x, location_y, zone, balls_before, strikes_before, pitch_result, created_at, opponent_batter_id, target_location_x, target_location_y, target_zone, team_side) FROM stdin;
a95bc341-0802-42de-ada4-d9f77096447a	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	81.00	0.8000	0.7358	\N	0	0	called_strike	2026-01-20 23:56:48.602163	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N	\N	\N
eec96e21-2974-4c92-a548-b7877c4ee3ec	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	cutter	78.00	0.8075	0.5025	\N	0	1	ball	2026-01-20 23:57:11.023028	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N	\N	\N
02557d84-c82d-41fc-8ab8-787bddd7585d	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	curveball	71.00	0.0625	0.2625	\N	1	1	ball	2026-01-20 23:57:31.903447	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N	\N	\N
6b87f2c8-ba81-40a0-b913-78b6317ae48c	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	84.00	0.2450	0.5783	\N	2	1	swinging_strike	2026-01-20 23:57:54.085391	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N	\N	\N
f6c7ff6c-bced-4f6e-8d45-7eadfb7e0415	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	changeup	74.00	0.6650	0.7375	\N	2	2	swinging_strike	2026-01-20 23:58:14.053389	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N	\N	\N
f51d4e46-38c1-41d4-b345-779994df05f2	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	81.00	0.8009	0.3948	\N	0	0	called_strike	2026-01-21 00:23:52.927621	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N	\N	\N
23350331-e4ab-43e4-ba37-3968a42051a1	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	2-seam	84.00	0.2112	0.5571	\N	0	1	called_strike	2026-01-21 00:24:09.953055	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N	\N	\N
7bc6e77d-a9c8-4e08-969a-01231801bf51	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	curveball	71.00	0.8060	0.7219	\N	0	2	ball	2026-01-21 00:24:40.127845	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N	\N	\N
2ffe2b16-2a7c-45fe-bbe9-592bcf7dddb7	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	curveball	72.00	0.6695	0.8172	\N	1	2	foul	2026-01-21 00:24:53.146365	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N	\N	\N
e13aa9dd-cea3-4ec1-b0a0-91839bb7878c	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	4-seam	83.00	0.2034	0.1914	\N	1	2	swinging_strike	2026-01-21 00:25:07.554962	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N	\N	\N
df8f0b6e-b6ac-4480-9469-5cf1ee3a12dd	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	82.00	0.7983	0.6283	\N	0	0	called_strike	2026-01-21 00:30:56.989892	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
dec8ab33-82ad-4bc0-abfa-f8753b0a7bfa	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	curveball	73.00	0.8395	0.7725	\N	0	1	ball	2026-01-21 00:31:17.250256	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
70b0c40f-27a2-440f-ae31-a76b6bc13bf5	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	4-seam	82.00	0.1803	0.2163	\N	1	1	ball	2026-01-21 00:31:26.318093	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
20c14864-1f36-47e1-b90a-6835e510f764	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	83.00	0.1880	0.7622	\N	2	1	swinging_strike	2026-01-21 00:31:44.573249	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
b4b240ff-1649-45ad-bf9f-93ffed22a875	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	2-seam	81.00	0.8549	0.1416	\N	2	2	ball	2026-01-21 00:31:56.67838	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
967c711b-c6aa-4458-9fa1-a31e34ef6188	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	6	changeup	73.00	0.4120	0.8060	\N	3	2	foul	2026-01-21 00:32:08.538923	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
d9646f79-2f47-43f9-8242-a3e1e4ce6d6c	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	7	4-seam	83.00	0.5768	0.1365	\N	3	2	ball	2026-01-21 00:32:21.775393	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
9abe2c06-d023-453c-8746-5ce032bc8c13	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	changeup	71.00	0.7957	0.5871	\N	0	0	in_play	2026-01-21 00:47:29.404909	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
63a4a5fa-ed41-415f-9cae-6a0c56c6b7a4	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	changeup	\N	0.3399	0.3966	\N	0	0	in_play	2026-01-21 00:47:31.424441	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
4ebbcbfc-eebe-4ab2-bb2b-2488a410aca5	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	changeup	\N	0.7906	0.3657	\N	0	0	called_strike	2026-01-21 00:47:36.334382	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
46a6a955-6b14-4db2-bc80-d8755f2d04f7	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	changeup	\N	0.3399	0.7030	\N	0	1	called_strike	2026-01-21 00:47:39.671779	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
8026d077-4a9f-4fa0-9dd3-0074891bc6c5	fa85d054-2cff-424c-9d38-ea6cf07feff0	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	changeup	81.00	0.6412	0.7219	\N	0	0	in_play	2026-01-21 22:45:29.644101	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
dd6723ba-81db-48a4-a3cc-c9bd3ff09ef5	be2b9521-7b69-4ce2-b8f8-485a98840cdd	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	72.00	0.2781	0.6378	\N	0	0	in_play	2026-01-21 22:46:06.007565	d687b69b-cbbe-4122-af75-7e786a1cf1a7	\N	\N	\N	\N
f9478b1a-c366-47e9-a473-5f281e26a33a	2a32c6d7-7fb3-4e67-8dd1-106372114976	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	72.00	0.7236	0.7399	\N	0	0	in_play	2026-01-21 22:53:03.906341	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
b4db104d-7cdb-4679-a464-60d50bf78a1f	a80440ad-acb9-4d95-8ece-1401fd21db99	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.7262	0.6318	\N	0	0	in_play	2026-01-21 22:53:44.030462	d687b69b-cbbe-4122-af75-7e786a1cf1a7	\N	\N	\N	\N
b8df84e8-dd44-4c26-8ca8-32fb25cb53fc	23ce0076-952d-47bd-afc8-4cf86e6d2dfc	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	1.2835	0.1105	\N	0	0	ball	2026-01-22 00:02:06.252191	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
bd1b6e4b-976d-4f42-a6a7-74b599d65ab3	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	-0.0022	0.8190	\N	0	0	called_strike	2026-01-22 00:02:37.472992	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
4eada657-b235-4b08-a409-74dd3ab3c367	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	2-seam	\N	1.0923	0.3962	\N	0	1	ball	2026-01-22 00:04:51.791917	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
7ad307b7-58ef-4f61-ad61-c3efa788b75c	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2-seam	\N	1.1055	0.7962	\N	1	1	swinging_strike	2026-01-22 00:05:05.19271	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
163dea43-3fd9-4646-99f1-90c329958d5b	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	\N	-0.1407	0.4476	\N	1	2	ball	2026-01-22 00:05:26.033503	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
6c3b2692-089c-4d29-923a-95ddec22c9e6	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	4-seam	\N	1.1978	0.1448	\N	2	2	ball	2026-01-22 00:13:26.361181	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N	\N	\N
67a7af24-0dc8-437a-900d-d5996c34c3b1	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	6	4-seam	\N	0.8813	0.9162	\N	3	2	in_play	2026-01-22 00:14:26.664301	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.8813	0.8990	\N	\N
a8376b61-bb98-4d31-90bd-dab0a56e0591	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.9186	0.5003	\N	0	0	swinging_strike	2026-01-22 22:48:20.249606	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0589	0.2976	\N	\N
5d066025-0a36-4980-93ed-47e4c258e62b	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	4-seam	84.00	1.0744	0.3247	\N	0	1	swinging_strike	2026-01-22 22:48:39.800517	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0978	0.2909	\N	\N
9e6e41f5-364b-4a04-ab44-3304de7d15dd	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	changeup	74.00	-0.0714	0.8719	\N	0	2	ball	2026-01-22 22:48:58.486403	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	-0.1649	0.8989	\N	\N
30c63384-b54b-4577-a0bc-bbe6908d7bd4	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	curveball	73.00	0.8562	0.9394	\N	1	2	swinging_strike	2026-01-22 22:49:19.230178	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.8874	0.9394	\N	\N
457e0852-a099-45ef-b0d4-8b37ef8d1782	f9a58a1f-20d0-47f8-ad12-56a29941cf78	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	78.00	-0.0217	0.6418	\N	0	0	swinging_strike	2026-01-22 22:51:06.897092	d687b69b-cbbe-4122-af75-7e786a1cf1a7	-0.0139	0.7848	\N	\N
f909bf68-4a6a-4157-9f6a-19e828dfe34f	476dabaa-1b9c-4def-bfce-980d6ac71f92	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	89.00	0.8945	0.0781	\N	0	0	foul	2026-01-22 23:13:32.532949	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.9604	0.0724	\N	\N
6671b4f1-2eff-4008-be8c-13c09af1f849	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	81.00	0.9865	0.3925	\N	0	0	called_strike	2026-01-22 23:44:15.091977	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	1.0400	0.2361	\N	\N
9b19853d-c36f-4457-846e-34f3a837e289	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	curveball	73.00	1.0400	0.9540	\N	0	1	ball	2026-01-22 23:44:29.635245	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	1.0600	1.0177	\N	\N
c6c43505-46c0-4bf7-b4c8-06c5272f71bc	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2-seam	80.00	0.0313	0.4967	\N	1	1	swinging_strike	2026-01-22 23:44:47.613432	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	0.0046	0.5024	\N	\N
36a58776-f869-40a0-a6b0-4fed5124cd3c	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	changeup	\N	-0.0556	0.9598	\N	1	2	swinging_strike	2026-01-22 23:45:00.927941	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	\N	\N	\N	\N
ba11253e-1b3f-44c0-9e5b-de798df0a82c	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	-0.1290	0.8614	\N	0	0	called_strike	2026-01-22 23:51:31.745133	d687b69b-cbbe-4122-af75-7e786a1cf1a7	\N	\N	\N	\N
30f24229-181a-47d9-84ed-38585fdd0363	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	changeup	\N	1.0533	0.4851	\N	0	1	swinging_strike	2026-01-22 23:51:43.323073	d687b69b-cbbe-4122-af75-7e786a1cf1a7	1.1535	0.4967	\N	\N
0f00f593-ea3b-466f-b929-2a3c79ade227	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	curveball	\N	0.1582	0.6935	\N	0	2	foul	2026-01-22 23:51:55.660895	d687b69b-cbbe-4122-af75-7e786a1cf1a7	0.5924	0.9482	\N	\N
1cf5d693-25f8-4840-9b5c-619b4c9aa21b	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	\N	0.9799	0.8961	\N	0	2	swinging_strike	2026-01-22 23:52:04.34257	d687b69b-cbbe-4122-af75-7e786a1cf1a7	1.0133	0.9077	\N	\N
7392bca9-bbc5-46b8-862f-7d3ce2997fb3	b51af127-cf10-4489-bd45-64d00926b7a8	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	82.00	0.9682	0.6115	\N	0	0	called_strike	2026-01-23 11:54:54.217344	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0671	0.8800	\N	\N
3f082bed-2262-4d11-b187-7851a57dcbfe	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	73.00	0.9089	0.8800	\N	0	0	swinging_strike	2026-01-23 15:12:48.962557	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.9682	0.9143	\N	\N
ed5ddb2a-02ef-4670-807e-83cf8163e03c	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	4-seam	82.00	0.9682	0.0057	\N	0	1	ball	2026-01-23 15:13:15.45587	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.9419	0.0057	\N	\N
791be1d3-c81e-4f73-a69a-0399e59cbe79	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	changeup	\N	-0.0669	0.9371	\N	1	1	swinging_strike	2026-01-23 15:13:28.689644	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	-0.0669	0.8571	\N	\N
1bf7273a-a973-4a3b-8efb-e421cd09c12e	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	2-seam	\N	0.2957	0.5943	\N	1	2	swinging_strike	2026-01-23 15:13:38.047761	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.2100	0.6057	\N	\N
691e3019-b2c6-4600-ac71-bbeff1411f21	7e09826d-ada8-47de-9efd-c4d2db0f7177	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	-0.0076	0.4914	\N	0	0	called_strike	2026-01-23 22:09:10.242321	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	0.0122	0.5600	\N	\N
fd93b451-0bd5-48a3-99e5-de213c7521fb	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	1.0561	0.6362	\N	0	0	ball	2026-01-23 22:43:49.610198	e3afda0f-473b-4aa5-85f4-9b652c492a80	1.0561	0.6362	\N	\N
2a1fc52e-304f-4e12-895c-3a19681082d2	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	2-seam	\N	1.0759	0.9048	\N	1	0	ball	2026-01-23 22:43:57.982053	e3afda0f-473b-4aa5-85f4-9b652c492a80	1.0759	0.9048	\N	\N
01b1c0ea-966c-4c19-9929-4d3551d277b0	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2-seam	\N	0.0078	0.5962	\N	2	0	swinging_strike	2026-01-23 22:44:06.471131	e3afda0f-473b-4aa5-85f4-9b652c492a80	0.0078	0.5962	\N	\N
b688f48a-90d8-4bdb-889c-cff2c5798e6c	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	curveball	\N	0.9704	1.0248	\N	2	1	ball	2026-01-23 22:44:15.715813	e3afda0f-473b-4aa5-85f4-9b652c492a80	1.0759	0.9962	\N	\N
5034a5fe-b5db-4bce-a2cf-1e81e18b2952	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	4-seam	\N	0.9308	0.0819	\N	3	1	called_strike	2026-01-23 22:44:28.266615	e3afda0f-473b-4aa5-85f4-9b652c492a80	0.9638	0.0648	\N	\N
ac7b41fa-c616-4228-a92f-6071e95cd65e	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	6	changeup	\N	0.0012	0.8933	\N	3	2	called_strike	2026-01-23 22:44:36.484222	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N	\N	\N
e9be608a-4b14-48d6-a9f0-010d21123e64	b3b82072-0219-4544-9aa6-0863f6360576	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.0473	0.5619	\N	0	0	in_play	2026-01-23 22:44:53.294087	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.0473	0.5619	\N	\N
7adef1f0-2728-4e00-a200-37959665e6be	a0938b80-5e21-40a3-846c-a421f9d6a31e	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	83.00	1.0045	0.1840	\N	0	0	called_strike	2026-01-27 22:13:59.267969	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	1.0440	0.1726	\N	\N
09b8fee0-bc12-4d8f-a41b-32361f7d2f4c	45bf3f90-d4ec-46d1-b7ab-f5c0628f295a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	1.0736	0.6800	\N	0	0	called_strike	2026-01-31 19:43:12.806964	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0736	0.7257	\N	\N
1c531ce7-ea8e-4f08-af35-4c44f8ada824	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	1.0143	0.7486	\N	0	0	ball	2026-02-02 20:34:21.969279	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	1.1066	0.7715	\N	\N
91d68130-0c79-4745-af3e-63064143aaa7	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	4-seam	\N	-0.0868	0.0572	\N	1	0	ball	2026-02-02 20:34:38.086398	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	-0.0538	0.6457	\N	\N
9af7d88c-0de7-49a9-a489-26245d57df23	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	-0.1527	0.4743	\N	2	0	ball	2026-02-02 20:34:50.923186	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	-0.1659	0.5143	\N	\N
4ae03fdc-76fe-491d-9846-82ca0b09db99	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2-seam	\N	-0.0209	0.5715	\N	3	0	called_strike	2026-02-02 20:35:05.772071	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	0.0516	0.5372	\N	\N
4fa76cb5-bcd0-48a4-971b-2e30d9d99fc7	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	4-seam	\N	0.4802	0.6172	\N	3	1	called_strike	2026-02-02 20:35:19.676726	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	\N	\N	\N	\N
6351a3fe-129c-4121-a008-2b153fe82f35	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	curveball	\N	0.5462	1.0458	\N	3	2	ball	2026-02-02 20:35:40.218664	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	0.5198	1.0229	\N	\N
82e23169-f5bf-40ce-9948-fcf4950ab114	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.2033	1.0400	\N	0	0	ball	2026-02-02 20:36:21.600994	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	0.2099	1.0286	\N	\N
0022e843-9e8c-4369-a134-745db80ee1ed	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	4-seam	\N	-0.1396	0.5086	\N	1	0	ball	2026-02-02 20:36:48.324235	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	-0.1527	0.5143	\N	\N
8ac0f712-fbfa-41f7-aaf2-ea9c892c3011	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	0.3549	0.6457	\N	2	0	swinging_strike	2026-02-02 20:37:05.429656	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	\N	\N	\N	\N
f9d4b36a-8491-4cf7-b96f-a38127da3117	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2-seam	\N	0.0451	0.6229	\N	2	1	foul	2026-02-02 20:37:28.955555	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	0.0253	0.5886	\N	\N
994cc8e7-ff2e-4625-a08b-d0013f4419ce	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	2-seam	\N	0.5462	-0.0457	\N	2	2	ball	2026-02-02 20:37:48.290233	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	0.5659	-0.0286	\N	\N
66452201-4a1d-4d3f-8469-312f6ea81dc7	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	2-seam	\N	1.0077	0.5257	\N	3	2	called_strike	2026-02-02 20:38:06.994917	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	1.0538	0.4743	\N	\N
daa61eae-7779-4677-b932-8b6b861e5122	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	-0.1330	0.6057	\N	0	0	ball	2026-02-02 20:38:37.726711	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0055	0.5715	\N	\N
3340ac15-94a8-4784-b6d9-a89827fe0c7e	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	1.0077	0.5600	\N	1	0	called_strike	2026-02-02 20:38:53.247775	fe099dde-7555-47ae-b3ec-72120f6b4fda	1.0868	0.5486	\N	\N
c81c5b90-a764-4480-b6fd-d8a37e914848	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	2-seam	\N	0.9945	0.8686	\N	1	1	ball	2026-02-02 20:39:09.437246	fe099dde-7555-47ae-b3ec-72120f6b4fda	-0.1000	0.8515	\N	\N
42bae4b0-dd9f-4b10-a496-dbda92ce0866	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	changeup	\N	-0.0077	0.6629	\N	2	1	foul	2026-02-02 20:39:26.589729	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0121	0.6115	\N	\N
c9aea824-e008-4cad-9c10-a7d0353c1fa5	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	changeup	\N	-0.0473	1.0058	\N	2	2	ball	2026-02-02 20:39:43.834338	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0319	0.8000	\N	\N
990d3e0e-31c4-4eec-9046-2a8f528e0d8d	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	changeup	\N	-0.0341	0.0343	\N	3	2	ball	2026-02-02 20:40:00.664584	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0055	0.4343	\N	\N
cf0aa97d-8bbe-4c8b-aaf4-507b3cb6b6e6	c9c11c3f-f0eb-43b0-a977-617d57bc9338	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.0451	0.4572	\N	0	0	ball	2026-02-02 20:40:47.702419	be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	0.2165	0.3257	\N	\N
c63d012b-a086-4cd4-8e16-1b1703f79f40	c9c11c3f-f0eb-43b0-a977-617d57bc9338	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.0648	0.5372	\N	1	0	called_strike	2026-02-02 20:41:19.85852	be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	\N	\N	\N	\N
5056b283-3b54-4bd9-9ab0-e089ca798410	0f2eb886-29cf-4cc3-adb5-304984f946e7	9fecd787-6a95-48b5-92d4-11abc07b49ae	351ac884-2701-4be0-a855-071557cb07d0	\N	1	2-seam	\N	0.9570	0.6697	\N	0	0	swinging_strike	2026-02-05 00:41:30.899733	7dafc19a-198f-4701-b37b-d63ca107dac1	0.9570	0.6697	\N	\N
26648370-b990-42b5-9ebb-f30c50d37891	0f2eb886-29cf-4cc3-adb5-304984f946e7	9fecd787-6a95-48b5-92d4-11abc07b49ae	351ac884-2701-4be0-a855-071557cb07d0	\N	2	changeup	\N	-0.0716	0.8812	\N	0	1	swinging_strike	2026-02-05 00:41:38.862747	7dafc19a-198f-4701-b37b-d63ca107dac1	0.0076	0.8412	\N	\N
9ef478a4-8fcc-4d7d-bcb5-282cc8b71d8d	2387a23b-b36f-4738-b778-6f9601d40dc7	87e627cd-6475-4920-8631-cde341d811df	9d973e4d-32eb-4b78-af3c-682d622ceccc	\N	1	2-seam	82.00	-0.0143	0.5657	\N	0	0	foul	2026-02-09 13:58:56.099609	2377fb0a-da7f-4562-9e6f-fda99c878cf5	-0.0341	0.5315	\N	\N
fdfcfc06-2c76-40f6-84db-8d1cb4546c4c	2387a23b-b36f-4738-b778-6f9601d40dc7	87e627cd-6475-4920-8631-cde341d811df	9d973e4d-32eb-4b78-af3c-682d622ceccc	\N	2	changeup	72.00	1.0077	0.7086	\N	0	1	called_strike	2026-02-09 13:59:52.56955	2377fb0a-da7f-4562-9e6f-fda99c878cf5	1.0736	0.7143	\N	\N
16a361e4-0fee-4f81-8ab5-fd61cea5a1ff	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	1	4-seam	\N	0.3352	-0.1943	\N	0	0	ball	2026-02-13 17:10:39.810669	008496cd-9ad8-4761-8206-a60c57c94d2f	0.4275	0.3086	\N	\N
82bd0b22-5967-49f5-8049-a84d28e6c084	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	2	2-seam	\N	0.2758	0.9029	\N	1	0	foul	2026-02-13 17:10:48.98117	008496cd-9ad8-4761-8206-a60c57c94d2f	0.3615	0.9258	\N	\N
bcc5eb93-b566-40a4-952b-9566956a12dc	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	3	4-seam	\N	1.0407	0.5372	\N	1	1	called_strike	2026-02-13 17:11:06.436638	008496cd-9ad8-4761-8206-a60c57c94d2f	\N	\N	\N	\N
52e51fd8-b92f-4385-a75a-a5de985eb2a4	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	4	2-seam	\N	0.0253	0.6172	\N	1	2	foul	2026-02-13 17:11:23.679963	008496cd-9ad8-4761-8206-a60c57c94d2f	0.1176	0.5315	\N	\N
812f6eae-e69e-4697-bdad-0ab5b4d3d8c2	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	5	curveball	\N	-0.1857	0.1429	\N	1	2	ball	2026-02-13 17:11:43.182743	008496cd-9ad8-4761-8206-a60c57c94d2f	0.0648	0.4057	\N	\N
7a42bdbc-3b86-40bc-879f-fbabf238916d	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	6	curveball	\N	1.0538	1.0458	\N	2	2	ball	2026-02-13 17:11:57.266426	008496cd-9ad8-4761-8206-a60c57c94d2f	0.9747	0.9658	\N	\N
fc2cce06-0639-46d8-88c4-76dff8477d35	ef5bdb72-ccf2-4dc3-a447-a5c4a76e3e2c	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	7	curveball	\N	1.1000	0.8629	\N	3	2	ball	2026-02-13 17:12:14.786948	008496cd-9ad8-4761-8206-a60c57c94d2f	1.0604	0.8743	\N	\N
e8572edb-5621-4897-9e30-c10569551de5	c3615983-d255-4ab6-9c41-411e28a5dde0	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	1	4-seam	\N	1.0341	0.5086	\N	0	0	called_strike	2026-02-13 17:12:48.967087	bfaff040-ac17-408b-a706-12f5e99a323f	\N	\N	\N	\N
79c892ae-d2d1-4540-ac65-fdc929113e2f	c3615983-d255-4ab6-9c41-411e28a5dde0	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	2	slider	\N	1.0143	0.6743	\N	0	1	ball	2026-02-13 17:13:25.647887	bfaff040-ac17-408b-a706-12f5e99a323f	\N	\N	\N	\N
8fb03aa9-366a-4764-84c7-0c0ceb746123	c3615983-d255-4ab6-9c41-411e28a5dde0	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	3	4-seam	\N	0.9418	0.4743	\N	1	1	foul	2026-02-13 17:13:37.788155	bfaff040-ac17-408b-a706-12f5e99a323f	1.0275	0.3714	\N	\N
94d48ec5-3207-4e71-9f9f-66ad5942aebf	c3615983-d255-4ab6-9c41-411e28a5dde0	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	4	cutter	\N	1.2385	0.7886	\N	1	2	ball	2026-02-13 17:14:10.247874	bfaff040-ac17-408b-a706-12f5e99a323f	1.0011	0.8115	\N	\N
638deba0-8d56-4552-bd43-97a129be9db1	c3615983-d255-4ab6-9c41-411e28a5dde0	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	5	4-seam	\N	0.1571	0.4457	\N	2	2	called_strike	2026-02-13 17:14:28.391329	bfaff040-ac17-408b-a706-12f5e99a323f	0.3088	0.3029	\N	\N
e18d2a83-787a-4e9e-90ed-7e5dd6333b78	1050059d-7e79-42f9-9358-3350d5364ba8	4e141044-1db9-4114-b901-961f8198be85	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	1	4-seam	\N	1.0802	0.5429	\N	0	0	called_strike	2026-02-13 17:15:11.105271	753857ca-ccc5-48fc-8e53-c269ec6b0ef9	1.0011	0.5315	\N	\N
e1e56b2b-ca52-41c5-88ca-d6256f50b265	2c9b0f52-1e84-47ca-8ce8-69d5da4e2fe1	8c2af398-28db-4eba-b765-58158c5902c9	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	2-seam	\N	0.0293	0.3897	\N	0	0	called_strike	2026-03-12 22:49:33.378194	c1d687c0-d0c8-4e16-897f-ad5afe353af0	0.0689	0.3440	\N	\N
0b5af8ae-0419-434b-a588-e340cf14b175	2c9b0f52-1e84-47ca-8ce8-69d5da4e2fe1	8c2af398-28db-4eba-b765-58158c5902c9	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	1.0051	0.8869	\N	0	1	swinging_strike	2026-03-12 22:49:42.396216	c1d687c0-d0c8-4e16-897f-ad5afe353af0	0.9920	0.6754	\N	\N
3ae63dde-2dbf-48ae-8e8e-d4f4f4a1c6ee	2c9b0f52-1e84-47ca-8ce8-69d5da4e2fe1	8c2af398-28db-4eba-b765-58158c5902c9	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	changeup	\N	0.9590	0.9669	\N	0	2	called_strike	2026-03-12 22:49:55.856504	c1d687c0-d0c8-4e16-897f-ad5afe353af0	0.9590	0.9669	\N	\N
36c7eab5-b5a6-441d-86a9-20e1510af058	6dd640cc-1547-4a71-8c7a-f365b05ea83c	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	-0.0604	0.2810	\N	0	0	called_strike	2026-03-15 21:55:49.40977	61a0a8b0-9e5c-491c-bafb-a41de7949f59	0.0114	0.2906	\N	\N
888feffa-0754-4dc1-b3cf-f445838f84c4	6dd640cc-1547-4a71-8c7a-f365b05ea83c	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.0197	0.9655	\N	0	1	in_play	2026-03-15 21:55:55.569023	61a0a8b0-9e5c-491c-bafb-a41de7949f59	0.0390	0.8291	\N	\N
76c6cb64-45e9-4be1-865d-2a350f8a4197	5b172646-0540-4e50-ae73-d4ebf8874b3f	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.1770	0.9463	\N	0	0	called_strike	2026-03-15 21:56:13.689874	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	-0.0079	0.9511	\N	\N
e8d35a2e-7ecf-464d-9fca-f7f8fe049fba	5b172646-0540-4e50-ae73-d4ebf8874b3f	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.5662	1.0085	\N	0	1	ball	2026-03-15 21:56:21.380063	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	1.0355	0.9248	\N	\N
e8c0608d-36f3-4a90-9a69-bbc31abf02a9	5b172646-0540-4e50-ae73-d4ebf8874b3f	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	2-seam	\N	-0.0272	-0.0444	\N	1	1	swinging_strike	2026-03-15 21:56:29.161696	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	0.0169	0.0106	\N	\N
127d12cd-aa90-4f04-b21c-2269a8579e8c	5b172646-0540-4e50-ae73-d4ebf8874b3f	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	changeup	\N	-0.0604	0.9415	\N	1	2	swinging_strike	2026-03-15 21:56:36.833707	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	-0.0245	1.0133	\N	\N
d9811179-b917-4779-9f7a-e10ac3df9f50	40ff69a7-2021-4019-8e00-6caf2d7083ac	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.2874	0.7956	\N	0	0	in_play	2026-03-15 21:56:43.1334	e76bcd26-4fa4-42ee-88bf-b57239ba2123	0.1053	0.7884	\N	\N
6ccf54a1-68dd-4ac1-807f-22ec6e04ac84	ca3f9b72-3a77-4713-9da6-26435a3ca1a4	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0985	0.9056	\N	0	0	swinging_strike	2026-03-16 00:15:49.310192	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	0.0831	0.0350	\N	\N
be1d3b99-6ca2-4c18-af2c-a5c50060cb6e	a5d03c3d-b4e6-4281-99b0-9eccadc2658d	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	2-seam	\N	-0.0402	0.8587	\N	0	0	ball	2026-03-16 00:16:12.244496	61a0a8b0-9e5c-491c-bafb-a41de7949f59	0.0535	0.1574	\N	\N
329bcc82-d65e-47b4-8db5-d2a46fdd2d3a	ed6d3ca2-ae7a-4bf8-9107-4bd40a012f20	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0062	0.7343	\N	0	0	swinging_strike	2026-03-16 00:34:39.079063	8f1dec79-cc9f-45d6-b6cb-eaa6d526af32	-0.0092	0.2517	\N	\N
fb4927e9-09fa-409d-b204-f3b1fa38eef2	2a94d2c1-bcec-4ccf-adf7-1f725e3113d0	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	1.1959	0.5140	\N	0	0	swinging_strike	2026-03-20 14:04:15.911222	61a0a8b0-9e5c-491c-bafb-a41de7949f59	0.9959	0.3811	\N	\N
38dff07b-0587-47cd-8410-d640a51e1428	2a94d2c1-bcec-4ccf-adf7-1f725e3113d0	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.0728	1.0000	\N	0	1	foul	2026-03-20 14:04:23.726041	61a0a8b0-9e5c-491c-bafb-a41de7949f59	0.1395	0.9720	\N	\N
13c8e7b9-efc4-45d1-b51d-6034e33a275e	2a94d2c1-bcec-4ccf-adf7-1f725e3113d0	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	1.1241	1.0524	\N	0	2	ball	2026-03-20 14:04:29.908883	61a0a8b0-9e5c-491c-bafb-a41de7949f59	1.0574	1.0629	\N	\N
636a7271-d98a-42ad-8562-9878f31beafa	2a94d2c1-bcec-4ccf-adf7-1f725e3113d0	e2f14e86-d30a-47c2-8d60-2e2036f5b4ce	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	4-seam	\N	-0.0144	0.0245	\N	1	2	swinging_strike	2026-03-20 14:04:37.322076	61a0a8b0-9e5c-491c-bafb-a41de7949f59	-0.1477	0.0944	\N	\N
e27557c6-9224-4a6c-815b-70594ad42953	2a2cbc2f-cc4a-46ad-8108-5d5197031d02	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	2-seam	\N	1.1078	0.4998	\N	0	0	called_strike	2026-03-20 16:41:50.111261	6e83c4de-d823-4ce4-892e-d1f3983e9002	1.1500	0.5000	W-out	\N
374871c5-93da-4850-a4be-34b55e492e94	adbbf247-2181-4d2c-bf5c-21dc0206717a	ff9b8a95-3720-431e-b42a-0b8e09e3a8d1	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	-0.1067	0.6469	\N	0	0	swinging_strike	2026-03-20 16:46:33.10497	6e83c4de-d823-4ce4-892e-d1f3983e9002	\N	\N	\N	\N
1a107f89-7f1f-4dac-8537-9c809c8869b3	3a4e05b3-3dbd-4a27-b138-ac337977a67e	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	1.1856	0.8147	\N	0	0	foul	2026-03-21 01:51:06.254287	ea7730c0-2016-4f46-8fc8-c91be3d05be4	0.5000	0.8330	\N	\N
e8e263cc-e7af-4ba8-9df6-13cd476b7910	c8e11f0c-fa5b-44cb-8806-525f27beb03b	acb62cfc-f0e5-4ba4-88ed-a8d3eca9f01c	6ea3ab5c-0826-43e2-894d-3e18657959da	\N	1	2-seam	\N	1.1078	0.4998	\N	0	0	called_strike	2026-03-21 02:08:18.783635	3a330c61-0d90-4496-b0af-549cb8da50e3	1.1500	0.5000	W-out	\N
4ddcbae0-97d5-4ba7-b269-617867906c1c	38960cd9-7cfb-4189-b258-52a8cd468aa5	33f5e62c-befd-4a85-813d-758fb5b1b29b	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.8330	0.5000	\N	0	0	called_strike	2026-03-21 02:19:46.660831	039f65c5-444c-4e0d-af25-7bcc2331afe0	0.8330	0.5000	\N	\N
79ced3a4-2ff6-40a4-9570-4017f9c28b62	566028ec-63ed-4529-80b1-84598b47ef53	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.3908	0.9126	\N	0	0	called_strike	2026-03-21 09:32:20.831835	ea7730c0-2016-4f46-8fc8-c91be3d05be4	0.8330	0.8330	\N	\N
fd8e4334-e2c2-47cb-9c92-02ff3f2a4c32	2f38f521-2a95-498d-a224-c22e5f544e18	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	1.2267	0.5420	\N	0	0	ball	2026-03-22 01:48:57.046847	ea7730c0-2016-4f46-8fc8-c91be3d05be4	-0.1500	0.5000	\N	\N
f0ee6569-8792-4684-b931-b3fc837aaf2e	2f38f521-2a95-498d-a224-c22e5f544e18	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.1138	0.9755	\N	1	0	swinging_strike	2026-03-22 01:49:10.900773	ea7730c0-2016-4f46-8fc8-c91be3d05be4	0.8330	0.8330	\N	\N
40f0960f-33cd-45c9-b17b-554807a55a82	2f38f521-2a95-498d-a224-c22e5f544e18	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	changeup	\N	0.4369	1.1294	\N	1	1	swinging_strike	2026-03-22 01:49:26.666095	ea7730c0-2016-4f46-8fc8-c91be3d05be4	0.5000	1.1500	\N	\N
bd4e9a1f-0b04-4dac-8e80-4e97fa3cc51b	2f38f521-2a95-498d-a224-c22e5f544e18	22f56c6b-093e-47f5-af95-daa5a8a7373e	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	4-seam	\N	0.7549	0.1783	\N	1	2	swinging_strike	2026-03-22 01:49:38.19026	ea7730c0-2016-4f46-8fc8-c91be3d05be4	0.1670	0.1670	\N	\N
372d204c-5735-4545-9f85-57b95ad654a4	bcdee466-9c7f-4b09-992c-4db18443b320	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	-0.1631	0.4930	\N	0	0	called_strike	2026-03-25 01:07:53.384719	88f16340-616c-402c-bb1e-5ee07d6d0a42	1.1500	0.5000	\N	\N
fe8388a9-e676-4926-891f-61891f872dd2	8fdfe099-bc8d-4acb-b19d-954785da423d	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	-0.0554	0.4965	\N	0	0	called_strike	2026-03-29 18:28:39.715306	88f16340-616c-402c-bb1e-5ee07d6d0a42	1.1500	0.5000	\N	\N
f02b4cbd-2b1f-43de-a2ce-f629c08e380c	630af788-e50e-4ec0-9dd1-e24872ed2419	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0985	0.4336	\N	0	0	called_strike	2026-03-29 20:15:38.303974	88f16340-616c-402c-bb1e-5ee07d6d0a42	0.8330	0.5000	\N	\N
61d3ab57-d62d-4add-b921-4105e3327364	630af788-e50e-4ec0-9dd1-e24872ed2419	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.7908	0.7867	\N	0	1	swinging_strike	2026-03-29 20:15:47.026563	88f16340-616c-402c-bb1e-5ee07d6d0a42	0.1670	0.8330	\N	\N
2a45e16b-f4ec-4c88-904a-5d28f125eb67	630af788-e50e-4ec0-9dd1-e24872ed2419	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	-0.1785	-0.2448	\N	0	2	ball	2026-03-29 20:16:01.890356	88f16340-616c-402c-bb1e-5ee07d6d0a42	1.1500	-0.1500	\N	\N
10a0973e-6af6-4bff-9eb2-d3cf7b7d2a00	630af788-e50e-4ec0-9dd1-e24872ed2419	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	curveball	\N	0.0574	0.9406	\N	1	2	called_strike	2026-03-29 20:16:11.194954	88f16340-616c-402c-bb1e-5ee07d6d0a42	0.8330	0.8330	\N	\N
3fbe7569-c45d-45f7-b6ae-c29e2dbe08b9	c983125f-1850-445f-8b10-a53716b3af28	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.0933	0.8881	\N	0	0	in_play	2026-03-29 20:16:22.895088	63ff096c-0595-4314-b725-aaf8280e2c19	0.8330	0.8330	\N	\N
6a9269d6-bdf7-4d82-86d5-f4966a5d28fa	07eca636-604d-4155-b499-0cf41670fc0e	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0523	0.0559	\N	0	0	swinging_strike	2026-03-29 20:16:36.825859	7a1ee07d-dc91-483d-b698-561f8d0f9362	0.8330	0.1670	\N	\N
7be7a6c2-4a5e-4100-af7e-aaa7e792afb4	07eca636-604d-4155-b499-0cf41670fc0e	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	changeup	\N	0.1087	0.8636	\N	0	1	swinging_strike	2026-03-29 20:16:44.982841	7a1ee07d-dc91-483d-b698-561f8d0f9362	0.8330	0.8330	\N	\N
4a806559-39b3-4e49-b4cc-8cf0446e3a13	07eca636-604d-4155-b499-0cf41670fc0e	90026341-347a-4f0a-b995-ab1373d67c57	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	curveball	\N	0.9036	0.9161	\N	0	2	called_strike	2026-03-29 20:16:48.747483	7a1ee07d-dc91-483d-b698-561f8d0f9362	0.1670	0.8330	\N	\N
b89c2212-5df8-4dbd-a437-8d4fa5895587	6eef3bfc-f000-4662-abfc-c2f6df14e9cd	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	-0.0195	0.6294	\N	0	0	called_strike	2026-03-29 20:19:00.823639	c8570706-5564-4fd6-b4ad-b4a3f0be13fb	0.8330	0.5000	\N	\N
f47956ea-121e-4563-96be-8020b58cd165	6eef3bfc-f000-4662-abfc-c2f6df14e9cd	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	changeup	\N	0.1190	0.9545	\N	0	1	in_play	2026-03-29 20:19:09.077711	c8570706-5564-4fd6-b4ad-b4a3f0be13fb	0.8330	0.8330	\N	\N
762fa8e4-4ed5-46df-9342-635d12beba92	be7d815b-eaeb-416f-85d7-1cec710507de	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.9908	0.3916	\N	0	0	swinging_strike	2026-03-29 20:19:23.738648	84087b62-c439-409a-bde7-54791abe9c27	-0.1500	0.5000	\N	\N
c6bd26f3-55f5-497f-a09d-94a71f01d00d	be7d815b-eaeb-416f-85d7-1cec710507de	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	changeup	\N	0.1395	0.9161	\N	0	1	swinging_strike	2026-03-29 20:19:30.537523	84087b62-c439-409a-bde7-54791abe9c27	0.8330	0.8330	\N	\N
84f81a4e-fd95-4ca2-bc63-4187075bc696	be7d815b-eaeb-416f-85d7-1cec710507de	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	4-seam	\N	0.1856	0.1119	\N	0	2	called_strike	2026-03-29 20:19:35.520435	84087b62-c439-409a-bde7-54791abe9c27	0.8330	0.1670	\N	\N
18fa8773-b299-4399-b5d9-7bbdcfe3e7fc	8876900e-a598-4181-82e2-a883c38d6115	a5a1479f-a177-4479-87d8-fe8c8660aa29	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	\N	0.5549	0.8811	\N	0	0	in_play	2026-03-29 20:20:02.933392	862048b7-c054-44ea-ace2-a11cefbd86b1	0.8330	0.8330	\N	\N
e61dfde4-1f9b-4ed6-b06a-9e2843b39ef0	5dc24b40-10f2-404b-9e90-ef372db06055	0b9002d3-75c3-424f-ac44-52aa7b203b70	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	2-seam	\N	0.1233	0.4896	\N	0	0	called_strike	2026-03-29 22:01:41.81846	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	0.8330	0.5000	1-2	\N
ff8b2220-69ea-4e67-bf3e-f6399d506843	39c87a4d-1207-4b81-864f-ceb449b420e2	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	1.0215	0.5909	\N	0	0	called_strike	2026-03-29 23:58:55.951337	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.8330	0.5000	\N	\N
24168b08-9420-432f-8843-ca29ba7a4033	39c87a4d-1207-4b81-864f-ceb449b420e2	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.0421	0.6259	\N	0	1	in_play	2026-03-29 23:59:03.827649	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.1670	0.8330	\N	\N
2312e7ff-b51c-450d-a049-c5b168d0b7e5	dfeeb687-722b-48d5-ab0b-8c8ed91a875c	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	-0.0144	0.7308	\N	0	0	in_play	2026-03-29 23:59:44.060691	96722c55-d598-4bc7-93d3-a2b7c09b225a	0.8330	0.8330	\N	\N
cef941a6-8d8f-4489-b2cd-c195bb7ab224	17f89fd9-9ebd-4c58-8c73-47261fc57584	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.8985	0.7832	\N	0	0	called_strike	2026-03-29 23:59:55.05063	31af3047-e71b-493a-a3b3-877092d4692d	0.8330	0.8330	\N	\N
5ce2a5f2-a019-4c5b-bd4f-f7073d197b41	17f89fd9-9ebd-4c58-8c73-47261fc57584	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.8369	0.4091	\N	0	1	called_strike	2026-03-30 00:00:01.036103	31af3047-e71b-493a-a3b3-877092d4692d	0.8330	0.5000	\N	\N
055bcfd7-6d4e-4989-9f4c-fe4b1f5bc2ec	17f89fd9-9ebd-4c58-8c73-47261fc57584	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	1.1805	0.9510	\N	0	2	ball	2026-03-30 00:00:07.438974	31af3047-e71b-493a-a3b3-877092d4692d	1.1500	0.5000	\N	\N
eee128ae-440e-481f-a9da-ca3d83c26aaf	17f89fd9-9ebd-4c58-8c73-47261fc57584	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	curveball	\N	0.0421	1.0699	\N	1	2	swinging_strike	2026-03-30 00:00:14.895693	31af3047-e71b-493a-a3b3-877092d4692d	0.1670	0.8330	\N	\N
2fecafd2-12b2-4e35-a6f5-8db1cf6fdc68	933cacc0-61ea-4f8a-9f76-63203715413e	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.9651	0.8951	\N	0	0	swinging_strike	2026-03-30 00:00:30.649636	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.8330	\N	\N
b5c778d4-aa4f-44ce-809c-20917519d6de	933cacc0-61ea-4f8a-9f76-63203715413e	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.4574	0.9336	\N	0	1	ball	2026-03-30 00:00:36.182113	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.8330	\N	\N
9405274d-80db-4c1b-8bee-b6f7c7cf3028	933cacc0-61ea-4f8a-9f76-63203715413e	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	changeup	\N	0.9344	0.4860	\N	1	1	in_play	2026-03-30 00:00:42.043663	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.5000	\N	\N
80645927-048c-4af7-956d-64abf540faa9	d0f31e33-0a19-47fc-b9c9-775c6dc4676a	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.1908	1.0000	\N	0	0	in_play	2026-03-30 00:00:55.333037	e07da3a0-df5f-4484-8d7c-d1416c6addeb	0.5000	0.8330	\N	\N
f927711f-7278-4fbe-8223-bf8690412632	7636abab-fb9d-430c-a089-937a0a9787d9	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.9395	0.0000	\N	0	0	called_strike	2026-03-30 00:01:10.058451	a625a9e1-3559-410d-9ba4-aff10d1459ae	0.1670	0.1670	\N	\N
d6aa8b55-0a3e-4b69-8ebf-0f8fec1d2311	7636abab-fb9d-430c-a089-937a0a9787d9	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	changeup	\N	0.0421	1.0420	\N	0	1	in_play	2026-03-30 00:01:15.624367	a625a9e1-3559-410d-9ba4-aff10d1459ae	0.8330	0.8330	\N	\N
86c50338-1055-4f45-9126-d09340cc9557	3df61964-e869-4ece-b31c-1e3ff6958fe6	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.9087	0.7762	\N	0	0	foul	2026-03-30 00:01:35.675821	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.8330	0.8330	\N	\N
f10019be-520a-4479-9d24-a0526cc431e5	3df61964-e869-4ece-b31c-1e3ff6958fe6	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.0523	0.9930	\N	0	1	swinging_strike	2026-03-30 00:01:40.823288	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.1670	0.8330	\N	\N
9a1c21d8-9923-4195-93d9-6be7e056c935	3df61964-e869-4ece-b31c-1e3ff6958fe6	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	1.0933	0.8182	\N	0	2	ball	2026-03-30 00:01:45.293355	2b45a0d5-3f16-420e-a385-93a390d5f5f0	1.1500	0.5000	\N	\N
576e6e0f-886a-437d-98d1-d61b69a8325b	3df61964-e869-4ece-b31c-1e3ff6958fe6	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	4-seam	\N	1.0113	0.9266	\N	1	2	ball	2026-03-30 00:01:49.549628	2b45a0d5-3f16-420e-a385-93a390d5f5f0	1.1500	0.5000	\N	\N
8dd0b23f-c232-4008-a5b5-f57c169b53e6	3df61964-e869-4ece-b31c-1e3ff6958fe6	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	2-seam	\N	0.9959	0.7972	\N	2	2	swinging_strike	2026-03-30 00:01:56.062343	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.8330	0.5000	\N	\N
716fe2d0-5926-40bd-9341-914243030396	14cd24b5-dd5b-4463-9a03-1cb07ce4fd0b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.0267	1.1224	\N	0	0	swinging_strike	2026-03-30 00:02:02.648484	0c04737c-7eb7-4fa1-b1d5-a45df318a685	0.8330	0.8330	\N	\N
2fbdbe4e-040a-43b9-987c-829fe6d63cd4	14cd24b5-dd5b-4463-9a03-1cb07ce4fd0b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.9395	0.8601	\N	0	1	in_play	2026-03-30 00:02:08.930117	0c04737c-7eb7-4fa1-b1d5-a45df318a685	0.1670	0.8330	\N	\N
179a31ac-49bc-41b0-b795-29d7ab4ae12a	a97b4c99-df9b-43cf-be5b-99d1aa276f6e	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.9856	0.9510	\N	0	0	in_play	2026-03-30 00:02:19.821165	c7758c42-7e26-4adb-ad8d-2d77a8d5327c	0.8330	0.8330	\N	\N
cfd8fb9a-1a9e-4572-b609-455aa1a919b9	29c74a75-44d0-49e3-9028-4e86d06c4561	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0113	1.0140	\N	0	0	called_strike	2026-03-30 00:02:35.770422	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.1670	0.8330	\N	\N
86698ecd-94ce-4b04-b4e3-d18db0fbb0dc	29c74a75-44d0-49e3-9028-4e86d06c4561	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	1.2369	0.8776	\N	0	1	ball	2026-03-30 00:02:40.315638	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.8330	0.8330	\N	\N
60d07cff-872a-491c-a125-bab1b38f9fa0	29c74a75-44d0-49e3-9028-4e86d06c4561	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	2-seam	\N	1.0523	0.1014	\N	1	1	ball	2026-03-30 00:02:46.29023	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.8330	0.1670	\N	\N
21606b27-bc3c-4d99-8609-640b89008d04	29c74a75-44d0-49e3-9028-4e86d06c4561	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	changeup	\N	0.9805	1.0979	\N	2	1	ball	2026-03-30 00:02:51.345704	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.8330	0.8330	\N	\N
b4113105-ac57-4d8b-9439-76091bdcd753	29c74a75-44d0-49e3-9028-4e86d06c4561	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	2-seam	\N	0.0010	0.7552	\N	3	1	in_play	2026-03-30 00:02:57.694257	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.1670	0.5000	\N	\N
d272ab07-404b-4cb4-9f95-102d9e76bb7a	696cf327-049d-4e3f-a212-a1cd2952b471	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.0421	1.0490	\N	0	0	swinging_strike	2026-03-30 00:03:06.180388	96722c55-d598-4bc7-93d3-a2b7c09b225a	0.8330	0.8330	\N	\N
53245572-709d-4283-9473-e27be1eeb278	696cf327-049d-4e3f-a212-a1cd2952b471	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.3805	1.0070	\N	0	1	swinging_strike	2026-03-30 00:03:12.130668	96722c55-d598-4bc7-93d3-a2b7c09b225a	0.5000	0.8330	\N	\N
b4021e56-60d7-401e-a34f-85e0b242a96c	696cf327-049d-4e3f-a212-a1cd2952b471	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	0.9600	-0.0315	\N	0	2	swinging_strike	2026-03-30 00:03:23.850021	96722c55-d598-4bc7-93d3-a2b7c09b225a	0.1670	0.1670	\N	\N
dc0fff6f-c5c6-44a3-8ffa-dbad1664fa4c	dac4ebe6-09af-46d2-aa1b-8b640a16d067	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.8626	0.9406	\N	0	0	in_play	2026-03-30 00:03:30.278479	31af3047-e71b-493a-a3b3-877092d4692d	0.8330	0.8330	\N	\N
54baed25-66ef-49dd-a98e-e59a9b847c64	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	1.0421	0.7413	\N	0	0	called_strike	2026-03-30 00:03:44.231461	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.5000	\N	\N
080ec2d5-3069-4fdc-86fc-7a8210f29b68	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	changeup	\N	0.8831	1.0105	\N	0	1	swinging_strike	2026-03-30 00:03:49.233114	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.8330	\N	\N
e9ea2d1c-5cbc-4232-8488-c25dc5175947	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	2-seam	\N	0.9651	0.0035	\N	0	2	foul	2026-03-30 00:03:55.601095	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.1670	\N	\N
e2940616-c06e-4ddf-9796-ec0625e09630	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	curveball	\N	0.1446	1.1434	\N	0	2	ball	2026-03-30 00:03:59.30036	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.1670	0.8330	\N	\N
55173f69-edc7-4c0d-b3e6-640f249a1210	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	curveball	\N	0.5497	1.0350	\N	1	2	ball	2026-03-30 00:04:03.684408	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.1670	0.8330	\N	\N
a9d5cb77-ee03-4065-9cae-b7322e351a06	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	2-seam	\N	0.0164	0.3427	\N	2	2	foul	2026-03-30 00:04:08.378254	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.1670	0.1670	\N	\N
60f71f2f-e5d1-4d02-ae6a-217bc70d2c6e	f866b43e-09ea-453e-ac3d-982ee4b9881b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	7	changeup	\N	1.0831	0.9860	\N	2	2	swinging_strike	2026-03-30 00:04:12.76978	fe9996a4-bc3d-4de5-aa99-0251fc2cb3f1	0.8330	0.8330	\N	\N
86688983-5cd0-4a9e-89c0-c3e083ea9883	b3104319-3a89-4947-98a6-4634ee017323	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.9497	0.8601	\N	0	0	in_play	2026-03-30 00:04:17.234653	e07da3a0-df5f-4484-8d7c-d1416c6addeb	0.1670	0.5000	\N	\N
353c2af3-f9ea-4d67-b6dc-bb4349b0a130	c9291902-df4a-4804-ab4f-33f44e738776	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	2-seam	\N	0.0779	1.0000	\N	0	0	in_play	2026-03-30 00:04:26.06881	a625a9e1-3559-410d-9ba4-aff10d1459ae	0.8330	0.8330	\N	\N
abaf5086-a273-4af2-ac61-61bad6206af7	2d313a53-39c6-4577-acc0-86ac36cb8e41	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.9497	0.9930	\N	0	0	called_strike	2026-03-30 00:04:38.152303	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.8330	0.8330	\N	\N
e2a2b05b-3734-48bd-9845-3e74bf32e603	2d313a53-39c6-4577-acc0-86ac36cb8e41	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.0421	0.9231	\N	0	1	ball	2026-03-30 00:04:42.90797	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.1670	0.5000	\N	\N
e875a957-c866-410b-9770-9bcc219df48c	2d313a53-39c6-4577-acc0-86ac36cb8e41	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	changeup	\N	0.9087	0.8357	\N	1	1	swinging_strike	2026-03-30 00:04:47.110239	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.8330	0.5000	\N	\N
358604b7-cff5-446c-bc1a-c36b4cdce0e8	2d313a53-39c6-4577-acc0-86ac36cb8e41	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	curveball	\N	1.0267	1.0175	\N	1	2	called_strike	2026-03-30 00:04:51.532242	2b45a0d5-3f16-420e-a385-93a390d5f5f0	0.8330	0.8330	\N	\N
0478d7c7-9cf6-43d9-afe6-98c0c22d30ee	fe52d673-a2f2-4e41-9882-098124c7a206	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0267	0.9895	\N	0	0	ball	2026-03-30 00:04:55.924909	0c04737c-7eb7-4fa1-b1d5-a45df318a685	0.8330	0.8330	\N	\N
bb96163c-aff9-42b7-8ddc-cf34e7f0f8e9	fe52d673-a2f2-4e41-9882-098124c7a206	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	4-seam	\N	0.0215	0.6853	\N	1	0	ball	2026-03-30 00:04:59.941299	0c04737c-7eb7-4fa1-b1d5-a45df318a685	1.1500	0.5000	\N	\N
401ba863-1211-4ae7-bb02-369b5fdf92f1	fe52d673-a2f2-4e41-9882-098124c7a206	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	2-seam	\N	1.0369	0.8252	\N	2	0	in_play	2026-03-30 00:05:04.777034	0c04737c-7eb7-4fa1-b1d5-a45df318a685	0.1670	0.5000	\N	\N
503fe9a7-a4c7-4059-98b0-d82a15230419	fabba153-c157-4d8d-b826-5722523cb19f	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.0421	0.1783	\N	0	0	in_play	2026-03-30 00:05:17.173893	c7758c42-7e26-4adb-ad8d-2d77a8d5327c	0.1670	0.1670	\N	\N
07daa9a6-a15b-4399-9bb3-44c7060c0a65	fa4779d2-eb8d-4b64-9336-d475d5fb0c64	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	1.0523	1.0455	\N	0	0	swinging_strike	2026-03-30 00:05:27.53879	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.8330	0.8330	\N	\N
100d3f64-19ce-43ad-922c-b8f003c19c59	fa4779d2-eb8d-4b64-9336-d475d5fb0c64	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.4472	0.9790	\N	0	1	in_play	2026-03-30 00:05:33.487653	9ca52c4a-b026-4b42-bfb4-4912855f36e0	0.8330	0.5000	\N	\N
0632e505-b1a3-4290-99f2-4fd5bbaea48f	e61aa079-0db8-4494-82a5-9a66f564a863	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	2-seam	\N	0.0318	1.0140	\N	0	0	in_play	2026-03-30 00:05:44.818463	96722c55-d598-4bc7-93d3-a2b7c09b225a	0.8330	0.8330	\N	\N
b11ee1d4-d578-4647-b436-793d69bc827b	4b7cd85a-4fa3-4dd5-8b43-5f41e7fec14b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	0.9087	0.8357	\N	0	0	swinging_strike	2026-03-30 00:05:53.480506	31af3047-e71b-493a-a3b3-877092d4692d	0.8330	0.8330	\N	\N
bbd6c25f-0195-4691-a339-a0abec9ac15f	4b7cd85a-4fa3-4dd5-8b43-5f41e7fec14b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	curveball	\N	0.0882	1.0105	\N	0	1	called_strike	2026-03-30 00:05:59.207945	31af3047-e71b-493a-a3b3-877092d4692d	0.1670	0.5000	\N	\N
9b223857-0edb-4a36-aaf4-a8c11becda1d	4b7cd85a-4fa3-4dd5-8b43-5f41e7fec14b	1e64745e-4bac-454a-8095-de423ed085c0	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	changeup	\N	0.9908	0.9615	\N	0	2	swinging_strike	2026-03-30 00:06:04.377006	31af3047-e71b-493a-a3b3-877092d4692d	0.8330	0.5000	\N	\N
d081623b-8215-491c-8ec5-ab85d69afe2f	e5874ee4-8773-494f-9ee8-79fdf8bb84e3	0b9002d3-75c3-424f-ac44-52aa7b203b70	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	-0.0862	0.6783	\N	0	0	swinging_strike	2026-04-13 23:22:50.016022	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	0.8330	0.5000	\N	\N
f6c589b7-f3e8-43b6-a5bd-ee16efae4fe5	e5874ee4-8773-494f-9ee8-79fdf8bb84e3	0b9002d3-75c3-424f-ac44-52aa7b203b70	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.9344	0.8357	\N	0	1	called_strike	2026-04-13 23:23:01.69721	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	0.1670	0.8330	\N	\N
ee72b9b8-071c-4bda-b7b3-62b3bc042166	e5874ee4-8773-494f-9ee8-79fdf8bb84e3	0b9002d3-75c3-424f-ac44-52aa7b203b70	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	curveball	\N	0.1754	1.0385	\N	0	2	foul	2026-04-13 23:23:09.951032	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	0.8330	0.8330	\N	\N
df69dc0f-7c33-43bc-837c-88da99565ecc	e5874ee4-8773-494f-9ee8-79fdf8bb84e3	0b9002d3-75c3-424f-ac44-52aa7b203b70	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	curveball	\N	0.9600	1.0699	\N	0	2	swinging_strike	2026-04-13 23:23:20.754488	d1e8e930-c005-44d5-8d4c-0a00b1dcc339	0.1670	0.8330	\N	\N
15365f90-dd5c-49ae-a0f1-825b4353f6c4	76fee768-4f96-4606-8d4d-874c996abfb3	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	fastball	\N	0.0421	0.6573	\N	0	0	called_strike	2026-04-13 23:32:47.005566	ff78f40d-6187-4f2d-a47a-eb928ca115ca	0.8330	0.5000	\N	\N
20374d09-d47a-4afc-996f-70890a56e4ab	76fee768-4f96-4606-8d4d-874c996abfb3	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	4-seam	\N	1.0831	0.5979	\N	0	1	foul	2026-04-13 23:32:57.284072	ff78f40d-6187-4f2d-a47a-eb928ca115ca	-0.1500	0.5000	\N	\N
699a93a7-0f1f-4fb5-bcba-64e48b5c96d0	76fee768-4f96-4606-8d4d-874c996abfb3	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	3	changeup	\N	-0.0041	1.0874	\N	0	2	ball	2026-04-13 23:33:03.56463	ff78f40d-6187-4f2d-a47a-eb928ca115ca	0.8330	0.8330	\N	\N
2dba97d8-c589-4bb4-a55a-84f69ab714fc	76fee768-4f96-4606-8d4d-874c996abfb3	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	4	4-seam	\N	0.0728	0.0664	\N	1	2	foul	2026-04-13 23:33:12.308556	ff78f40d-6187-4f2d-a47a-eb928ca115ca	0.8330	0.1670	\N	\N
716d042b-becb-4d82-a5c8-97524153b87b	76fee768-4f96-4606-8d4d-874c996abfb3	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	5	changeup	\N	0.0728	1.1014	\N	1	2	swinging_strike	2026-04-13 23:33:19.562695	ff78f40d-6187-4f2d-a47a-eb928ca115ca	0.8330	0.8330	\N	\N
75ce75d2-cb45-453b-b956-6383dd89a9d0	20acd3ac-91e6-43c2-b447-3884ff5652bc	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	fastball	\N	0.9754	0.8881	\N	0	0	swinging_strike	2026-04-13 23:33:28.28851	ad4bff9e-78d3-4e46-80d7-fa45de5c99f8	0.8330	0.8330	\N	\N
84e1e935-cbf9-450c-8feb-0da64e02612a	20acd3ac-91e6-43c2-b447-3884ff5652bc	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	4-seam	\N	0.9856	0.2483	\N	0	1	in_play	2026-04-13 23:33:34.631684	ad4bff9e-78d3-4e46-80d7-fa45de5c99f8	0.8330	0.1670	\N	\N
52206714-28de-4c68-a673-69b184663133	6e93115c-1b2a-4096-b941-2c1bf39f4d31	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	cutter	\N	0.0831	0.9615	\N	0	0	swinging_strike	2026-04-13 23:33:46.091862	8ba8d012-284c-4840-97ba-4804b07f3449	0.8330	0.8330	\N	\N
81daf8c6-2850-413a-b695-07a08ea13b15	6e93115c-1b2a-4096-b941-2c1bf39f4d31	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	cutter	\N	-0.0041	0.6538	\N	0	1	in_play	2026-04-13 23:33:52.362624	8ba8d012-284c-4840-97ba-4804b07f3449	0.8330	0.5000	\N	\N
46775f39-7aad-4b41-a6a6-7ac2c54ff97e	21f95795-7ecd-42e3-9cfe-df6b1851bdd6	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	fastball	\N	0.9600	0.9790	\N	0	0	swinging_strike	2026-04-13 23:34:10.085172	d9f51a9c-fac2-4b7d-80c9-775c4b3e1594	0.8330	0.8330	\N	\N
e80ba999-0cc3-4d2d-ab00-918f1d195491	21f95795-7ecd-42e3-9cfe-df6b1851bdd6	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	fastball	\N	0.0215	0.0629	\N	0	1	foul	2026-04-13 23:34:15.737671	d9f51a9c-fac2-4b7d-80c9-775c4b3e1594	0.1670	0.1670	\N	\N
2b6e6b60-b2a0-4dac-9a05-6648ecf07d67	21f95795-7ecd-42e3-9cfe-df6b1851bdd6	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	3	changeup	\N	0.7241	1.0175	\N	0	2	swinging_strike	2026-04-13 23:34:22.197388	d9f51a9c-fac2-4b7d-80c9-775c4b3e1594	0.8330	0.8330	\N	\N
0222eee2-a4c9-496f-bf2d-5b76c57b1b60	b7b6665f-3230-4e4d-bff4-cc3f32fa2144	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	cutter	\N	0.9754	0.7378	\N	0	0	in_play	2026-04-13 23:34:29.286531	4e3d3099-a400-4b8f-b8d1-d5ec90f3bb75	-0.1500	0.5000	\N	\N
ff408675-6b88-49f3-aabd-05e85ae8b69e	4413cd2f-e598-4582-89be-71dacbd2b4b7	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	fastball	\N	0.0882	1.0524	\N	0	0	in_play	2026-04-13 23:34:44.767349	e12034fc-0cbc-4309-b240-88f8c3201659	0.8330	0.8330	\N	\N
e2f5ced2-28b8-467a-a612-6560ed71b88a	9e4620dd-b36e-4b6b-a7c5-21b07bb57040	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	fastball	\N	1.0318	0.8636	\N	0	0	ball	2026-04-13 23:35:08.129649	a9f571b4-4e17-44e8-839a-3b2a4321ad3a	0.8330	0.8330	\N	\N
bc13d0f3-9a24-4c43-bdf6-f70868513b08	9e4620dd-b36e-4b6b-a7c5-21b07bb57040	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	fastball	\N	1.0215	0.6014	\N	1	0	called_strike	2026-04-13 23:35:14.314265	a9f571b4-4e17-44e8-839a-3b2a4321ad3a	1.1500	0.5000	\N	\N
e0955bd4-c61e-4188-a932-cf714f19082e	9e4620dd-b36e-4b6b-a7c5-21b07bb57040	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	3	cutter	\N	-0.0195	0.6224	\N	1	1	foul	2026-04-13 23:35:24.369856	a9f571b4-4e17-44e8-839a-3b2a4321ad3a	0.1670	0.5000	\N	\N
ec554ab9-bfdb-4103-b059-0e939d636c98	9e4620dd-b36e-4b6b-a7c5-21b07bb57040	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	4	changeup	\N	0.9600	0.9476	\N	1	2	swinging_strike	2026-04-13 23:35:30.913918	a9f571b4-4e17-44e8-839a-3b2a4321ad3a	1.1500	0.5000	\N	\N
75bb95d6-d828-4cd6-9403-2295d69fbdaf	74ea488b-6dba-464b-846b-a80b5c6b2c43	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	cutter	\N	0.0677	0.8986	\N	0	0	in_play	2026-04-13 23:35:39.555815	578a0aa3-74f9-4e26-8b1e-7b833b7ce39e	0.8330	0.8330	\N	\N
8a211aed-456a-48f2-822d-bf7803d48f33	3f13df78-be03-4846-acb0-5c16271615ee	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	slider	\N	0.0985	0.9301	\N	0	0	called_strike	2026-04-13 23:35:49.569278	9261036d-ac02-42ac-bf2a-f8cba7549148	0.5000	0.8330	\N	\N
633dfae5-56ea-4844-b902-cac5f152c321	3f13df78-be03-4846-acb0-5c16271615ee	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	2-seam	\N	0.9703	0.7552	\N	0	1	foul	2026-04-13 23:35:55.70533	9261036d-ac02-42ac-bf2a-f8cba7549148	0.1670	0.5000	\N	\N
d88d9948-cb47-4b93-8fe4-ff35608cf2f9	3f13df78-be03-4846-acb0-5c16271615ee	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	3	4-seam	\N	0.8728	-0.0245	\N	0	2	swinging_strike	2026-04-13 23:36:03.817369	9261036d-ac02-42ac-bf2a-f8cba7549148	0.1670	0.1670	\N	\N
c4397641-3a50-4b67-b844-dbebc0c00687	5125936a-7997-49aa-97e4-0b62daa17647	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	1	4-seam	\N	0.1856	1.0315	\N	0	0	swinging_strike	2026-04-13 23:36:17.055695	ff78f40d-6187-4f2d-a47a-eb928ca115ca	0.8330	0.8330	\N	\N
5ea45ef1-7a13-4fa9-8b23-6b26125e9cb0	5125936a-7997-49aa-97e4-0b62daa17647	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	2	slider	\N	1.0113	0.8252	\N	0	1	foul	2026-04-13 23:36:22.988061	ff78f40d-6187-4f2d-a47a-eb928ca115ca	-0.1500	0.5000	\N	\N
5a6f6b3d-12a4-426a-a210-89c61fe2a156	5125936a-7997-49aa-97e4-0b62daa17647	42a394d5-36c4-48d1-9c94-e916432e4855	f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	\N	3	2-seam	\N	0.0421	0.5280	\N	0	2	swinging_strike	2026-04-13 23:36:34.756866	ff78f40d-6187-4f2d-a47a-eb928ca115ca	0.8330	0.5000	\N	\N
ccf1e762-ca45-4bcc-8425-f48597bd724c	bf337e63-b0f8-4a37-83ac-ae123e145eac	b1b19f92-72ea-4b11-b28a-f322d936a379	18aa761f-ad20-488a-afaf-017d8b82edf4	\N	1	fastball	\N	0.0882	0.5455	\N	0	0	called_strike	2026-04-18 12:22:23.33378	6eb4bb44-1d30-4f06-9029-cc4f7b1415f0	0.8330	0.5000	\N	\N
b3e9bea5-ea6f-4951-a4ce-121ed1e4d8fb	bb6c04f7-6655-4e06-9813-4d57de24f60c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	0.9856	0.6643	\N	0	0	called_strike	2026-04-18 13:55:56.881895	58d2c817-5174-4351-9af7-02d9242a67dc	-0.1500	0.5000	\N	\N
983dd356-fed4-4c67-b829-7b6698df3aaf	bb6c04f7-6655-4e06-9813-4d57de24f60c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	changeup	\N	-0.0400	0.8147	\N	0	1	swinging_strike	2026-04-18 13:56:09.659937	58d2c817-5174-4351-9af7-02d9242a67dc	1.1500	0.5000	\N	\N
23a8417d-9225-4652-8136-2ca1e4da5095	bb6c04f7-6655-4e06-9813-4d57de24f60c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	1.1344	1.0455	\N	0	2	in_play	2026-04-18 13:56:42.226619	58d2c817-5174-4351-9af7-02d9242a67dc	0.8330	0.8330	\N	\N
50541199-b3a0-4525-bff6-8bf20a947124	5149a29d-92a9-44ab-b712-df649c83c8fb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	0.1087	0.9301	\N	0	0	called_strike	2026-04-18 13:57:11.853526	ecef8da8-79ce-4322-a835-a468d5663394	0.8330	0.8330	\N	\N
b9b40814-7043-4dbe-b45c-09aeda83e479	5149a29d-92a9-44ab-b712-df649c83c8fb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	fastball	\N	-0.0759	0.6154	\N	0	1	ball	2026-04-18 13:57:18.895017	ecef8da8-79ce-4322-a835-a468d5663394	1.1500	0.5000	\N	\N
bdc98e11-2048-4d5c-902f-45184588ad9b	5149a29d-92a9-44ab-b712-df649c83c8fb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	fastball	\N	-0.0195	0.7203	\N	1	1	foul	2026-04-18 13:58:06.675126	ecef8da8-79ce-4322-a835-a468d5663394	0.8330	0.5000	\N	\N
40bbd3f0-d999-4d41-9a21-3f74f5fe5f1a	5149a29d-92a9-44ab-b712-df649c83c8fb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	changeup	\N	0.0523	1.0035	\N	1	2	foul	2026-04-18 13:58:52.833117	ecef8da8-79ce-4322-a835-a468d5663394	0.8330	0.8330	\N	\N
ffee8e81-ab46-4622-8892-6b7f680640c7	5149a29d-92a9-44ab-b712-df649c83c8fb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	5	fastball	\N	0.0626	0.6119	\N	1	2	swinging_strike	2026-04-18 13:59:06.407794	ecef8da8-79ce-4322-a835-a468d5663394	0.8330	0.5000	\N	\N
b4d8593c-1730-4fa0-ae64-445c82f2a902	659edd55-67e7-4939-8c8d-f8e8242155a9	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	curveball	\N	0.7549	0.9301	\N	0	0	swinging_strike	2026-04-18 13:59:35.61346	9f0bbac7-9861-44ab-8fae-5179816f6151	0.5000	0.8330	\N	\N
6a6ab359-f9c9-421f-8246-328e8823b565	659edd55-67e7-4939-8c8d-f8e8242155a9	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	0.6677	1.0140	\N	0	1	swinging_strike	2026-04-18 13:59:48.893121	9f0bbac7-9861-44ab-8fae-5179816f6151	0.1670	0.8330	\N	\N
3be91265-52a9-4c88-9028-0162a44338c1	659edd55-67e7-4939-8c8d-f8e8242155a9	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	curveball	\N	0.2831	1.2098	\N	0	2	ball	2026-04-18 14:00:06.675592	9f0bbac7-9861-44ab-8fae-5179816f6151	0.5000	1.1500	\N	\N
8b006b9e-317e-42de-9739-906a638aa835	659edd55-67e7-4939-8c8d-f8e8242155a9	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	fastball	\N	0.5292	0.6399	\N	1	2	called_strike	2026-04-18 14:00:21.795414	9f0bbac7-9861-44ab-8fae-5179816f6151	0.5000	0.5000	\N	\N
23e701ef-c65a-4d8c-8104-24b80195da92	4c24c5ed-1b7c-4fcc-bb70-68954d36ea2c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	0.1549	1.0420	\N	0	0	in_play	2026-04-18 14:01:20.621441	58d2c817-5174-4351-9af7-02d9242a67dc	0.8330	0.8330	\N	\N
7602b79e-fbea-418c-9eaf-8777db240d17	b3a1418f-6d72-4c88-8b53-235b9e719766	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	0.1754	0.6189	\N	0	0	called_strike	2026-04-18 14:09:21.194947	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.8330	0.5000	\N	\N
2c69dfff-eb95-4e8c-b96e-33d9a95a5cb8	b3a1418f-6d72-4c88-8b53-235b9e719766	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	0.6779	1.0000	\N	0	1	ball	2026-04-18 14:09:37.172785	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.1670	0.8330	\N	\N
9d3e634a-1cf2-4a95-838b-caaa0ef4e7e6	b3a1418f-6d72-4c88-8b53-235b9e719766	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	fastball	\N	0.0062	0.7972	\N	1	1	in_play	2026-04-18 14:09:55.481859	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.5000	0.5000	\N	\N
f4fc7066-6fc0-485c-97e4-fee7e217fe0c	b9bbb023-d4c9-4bd0-ae62-e3e41a2febe4	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	-0.0041	0.6014	\N	0	0	foul	2026-04-18 14:10:28.186513	97c0431d-f710-4e36-9cd8-790825dde339	0.8330	0.5000	\N	\N
d3f0c05c-bc85-4344-a9cc-98d094cef750	b9bbb023-d4c9-4bd0-ae62-e3e41a2febe4	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	fastball	\N	-0.0297	0.7343	\N	0	1	foul	2026-04-18 14:10:37.943115	97c0431d-f710-4e36-9cd8-790825dde339	1.1500	0.5000	\N	\N
6212f252-5386-412e-b28e-a0ee47190844	b9bbb023-d4c9-4bd0-ae62-e3e41a2febe4	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.5138	1.1364	\N	0	2	ball	2026-04-18 14:11:04.036781	97c0431d-f710-4e36-9cd8-790825dde339	0.5000	1.1500	\N	\N
391f594b-63e9-485f-9e8c-af06f5ab6827	b9bbb023-d4c9-4bd0-ae62-e3e41a2febe4	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	slider	\N	1.0523	0.9720	\N	1	2	called_strike	2026-04-18 14:11:20.657444	97c0431d-f710-4e36-9cd8-790825dde339	-0.1500	0.5000	\N	\N
3d6191f8-cda7-4924-8bc5-fb8f2cc31fd0	94685490-1865-4ef4-9e65-53dab322ed83	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	0.5600	-0.1538	\N	0	0	ball	2026-04-18 14:11:50.682327	73ec00f4-6f42-4ac9-805b-082fc25033c0	1.1500	0.5000	\N	\N
3b6dab59-48db-4423-b89b-81d1d39e170f	94685490-1865-4ef4-9e65-53dab322ed83	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	fastball	\N	-0.1733	0.6084	\N	1	0	ball	2026-04-18 14:12:01.684803	73ec00f4-6f42-4ac9-805b-082fc25033c0	-0.1500	0.5000	\N	\N
0b6a41bf-ab49-4316-86a5-6af71371289e	94685490-1865-4ef4-9e65-53dab322ed83	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.6831	0.8182	\N	2	0	called_strike	2026-04-18 14:12:16.141839	73ec00f4-6f42-4ac9-805b-082fc25033c0	0.8330	0.8330	\N	\N
520645ca-894c-4611-950e-d6e5abf55822	94685490-1865-4ef4-9e65-53dab322ed83	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	slider	\N	0.9959	0.8462	\N	2	1	in_play	2026-04-18 14:12:32.358612	73ec00f4-6f42-4ac9-805b-082fc25033c0	0.8330	0.8330	\N	\N
1b813d09-ea20-4c6f-bb98-5eaa2d204720	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	-0.0451	-0.1608	\N	0	0	ball	2026-04-18 14:19:32.346753	fa92c880-1d31-437f-a3c4-0b3a49a6c460	1.1500	0.5000	\N	\N
d68b3ec4-516b-4e0e-bfda-e12b4b245ada	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	0.4933	0.9056	\N	1	0	called_strike	2026-04-18 14:19:43.625063	fa92c880-1d31-437f-a3c4-0b3a49a6c460	0.5000	0.8330	\N	\N
28e10ae6-4f92-4b1e-86b4-ecb9d1fed16a	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	fastball	\N	0.6369	0.8741	\N	1	1	called_strike	2026-04-18 14:19:57.695695	fa92c880-1d31-437f-a3c4-0b3a49a6c460	0.5000	0.8330	\N	\N
8cf34907-bdd5-46f4-a537-59b81ce956e8	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	changeup	\N	0.0267	0.9510	\N	1	2	ball	2026-04-18 14:20:07.396919	fa92c880-1d31-437f-a3c4-0b3a49a6c460	0.8330	0.8330	\N	\N
88071e55-7fd1-4c10-99b3-b70bde949635	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	5	fastball	\N	-0.0041	0.7133	\N	2	2	foul	2026-04-18 14:20:26.021067	fa92c880-1d31-437f-a3c4-0b3a49a6c460	1.1500	0.5000	\N	\N
0115d05a-6d31-40fc-9dde-97c4892d176f	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	6	slider	\N	-0.1631	0.5734	\N	2	2	ball	2026-04-18 14:20:39.01563	fa92c880-1d31-437f-a3c4-0b3a49a6c460	1.1500	0.5000	\N	\N
d90d3ab0-d79a-43d8-b38c-415d51b03f35	45c9e13e-2296-4f8a-9532-7cfd422665ed	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	7	fastball	\N	-0.0554	0.8566	\N	3	2	in_play	2026-04-18 14:21:01.625107	fa92c880-1d31-437f-a3c4-0b3a49a6c460	0.8330	0.8330	\N	\N
8311cbd6-056b-487e-9bec-467aa1478fa4	7d3390a3-7228-4b1f-8e7e-943e6afbccbb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	0.8472	0.8427	\N	0	0	swinging_strike	2026-04-18 14:21:29.803584	1cd1f6ca-23d2-4f35-877a-869e499b3d2c	0.8330	0.8330	\N	\N
55d337e1-03e8-4df9-8729-6cc2b526f518	7d3390a3-7228-4b1f-8e7e-943e6afbccbb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	0.4626	0.8741	\N	0	1	called_strike	2026-04-18 14:21:42.71729	1cd1f6ca-23d2-4f35-877a-869e499b3d2c	0.5000	0.8330	\N	\N
c54779d5-5840-493a-b16a-c5df2c3505d9	7d3390a3-7228-4b1f-8e7e-943e6afbccbb	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.2010	0.9441	\N	0	2	called_strike	2026-04-18 14:21:57.185627	1cd1f6ca-23d2-4f35-877a-869e499b3d2c	0.1670	0.8330	\N	\N
a76cc44e-b3c1-4ac5-aa4a-502e74b4138a	a10cfec8-2cb1-4f1e-89a2-84dc5d00dc64	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	-0.0708	0.5524	\N	0	0	foul	2026-04-18 14:22:25.258856	e7cb5e29-795b-496b-9d38-2d9eb5382696	1.1500	0.5000	\N	\N
8c3d5d80-83a7-414b-9800-4b7bd0772b5f	a10cfec8-2cb1-4f1e-89a2-84dc5d00dc64	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	fastball	\N	0.2831	0.9895	\N	0	1	ball	2026-04-18 14:22:36.985381	e7cb5e29-795b-496b-9d38-2d9eb5382696	0.8330	0.8330	\N	\N
26ef3244-aba6-474c-b2bd-46952bb95577	a10cfec8-2cb1-4f1e-89a2-84dc5d00dc64	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.3497	0.8846	\N	1	1	swinging_strike	2026-04-18 14:22:49.098549	e7cb5e29-795b-496b-9d38-2d9eb5382696	0.5000	0.8330	\N	\N
b9ab5a10-c077-4344-af25-ad1e03d3595d	a10cfec8-2cb1-4f1e-89a2-84dc5d00dc64	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	slider	\N	0.3651	0.8916	\N	1	2	called_strike	2026-04-18 14:23:02.970583	e7cb5e29-795b-496b-9d38-2d9eb5382696	0.1670	0.8330	\N	\N
1695c5e5-9289-4f45-b179-38a6b088eee3	5db7a65d-eacc-42a8-93ae-b36ad8b77b55	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	changeup	\N	0.2728	0.9021	\N	0	0	in_play	2026-04-18 14:32:10.455697	58d2c817-5174-4351-9af7-02d9242a67dc	0.8330	0.8330	\N	\N
a2975dae-97dd-482c-94c4-819c78277ad0	f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	1.2779	0.6538	\N	0	0	ball	2026-04-18 14:32:38.07319	ecef8da8-79ce-4322-a835-a468d5663394	0.5000	0.5000	\N	\N
6a4a3553-3d6c-42e0-915b-a62956f07424	f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	changeup	\N	-0.0656	0.9476	\N	1	0	ball	2026-04-18 14:32:55.834789	ecef8da8-79ce-4322-a835-a468d5663394	1.1500	0.5000	\N	\N
80a93ab7-abea-4ada-9f42-246925979ba0	f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	fastball	\N	0.1549	0.8112	\N	2	0	swinging_strike	2026-04-18 14:33:07.553778	ecef8da8-79ce-4322-a835-a468d5663394	0.8330	0.8330	\N	\N
0bfbecaf-167a-4b16-bb0f-e6c85afce177	f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	fastball	\N	0.0062	0.8916	\N	2	1	foul	2026-04-18 14:33:20.329784	ecef8da8-79ce-4322-a835-a468d5663394	0.8330	0.8330	\N	\N
67e9416c-525a-4784-adce-2ad25d94be51	f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	5	slider	\N	-0.1015	0.6713	\N	2	2	ball	2026-04-18 14:33:40.658261	ecef8da8-79ce-4322-a835-a468d5663394	1.1500	0.5000	\N	\N
fbc08ca3-2b71-4fde-8402-58e87e2fe91e	f0747fa7-7b19-4747-8216-0162559d7f4c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	6	slider	\N	0.3549	0.8706	\N	3	2	in_play	2026-04-18 14:34:00.632368	ecef8da8-79ce-4322-a835-a468d5663394	0.5000	0.8330	\N	\N
7cdec14f-6ccb-477f-9bba-8a919790ef34	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	0.9600	0.8042	\N	0	0	ball	2026-04-18 14:34:27.566573	9f0bbac7-9861-44ab-8fae-5179816f6151	1.1500	0.5000	\N	\N
7866f5d3-5359-4c19-a2aa-114b8eb1fb0a	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	fastball	\N	-0.1528	0.5979	\N	1	0	swinging_strike	2026-04-18 14:34:39.608382	9f0bbac7-9861-44ab-8fae-5179816f6151	-0.1500	0.5000	\N	\N
72d58973-f4df-4b7d-b02e-de47fdaea7db	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.9651	1.0385	\N	1	1	ball	2026-04-18 14:34:56.099993	9f0bbac7-9861-44ab-8fae-5179816f6151	0.8330	0.8330	\N	\N
d51bc815-c325-4a73-8ff1-8eea2e998a06	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	slider	\N	0.9138	0.6573	\N	2	1	called_strike	2026-04-18 14:35:14.89085	9f0bbac7-9861-44ab-8fae-5179816f6151	0.8330	0.5000	\N	\N
fc9b6bb6-da57-48ac-8b03-3ac6e893fa4d	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	5	fastball	\N	0.8215	0.6084	\N	2	2	foul	2026-04-18 14:35:27.207522	9f0bbac7-9861-44ab-8fae-5179816f6151	0.8330	0.5000	\N	\N
3fba4ead-a988-4f09-a7cd-12150e0ef917	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	6	slider	\N	1.0318	1.0629	\N	2	2	ball	2026-04-18 14:35:43.711981	9f0bbac7-9861-44ab-8fae-5179816f6151	0.8330	0.8330	\N	\N
76f1b162-800f-4e21-b7e1-e09dd0c4a301	3aef00ae-f0b2-40c5-bcec-29c509f5be78	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	7	slider	\N	0.7856	0.8392	\N	3	2	in_play	2026-04-18 14:36:04.348705	9f0bbac7-9861-44ab-8fae-5179816f6151	0.8330	0.8330	\N	\N
011c95c4-83d0-430e-88cc-c4c17e68b330	19109550-2cfe-4f8f-b3fd-2bf4e5525250	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	1.0985	0.6434	\N	0	0	called_strike	2026-04-18 14:52:17.265619	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.1670	0.5000	\N	\N
ee2cb69b-b6ef-42ec-909b-8bf191a517c3	19109550-2cfe-4f8f-b3fd-2bf4e5525250	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	fastball	\N	-0.0195	0.6399	\N	0	1	swinging_strike	2026-04-18 14:52:31.038158	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.8330	0.5000	\N	\N
1c780b0d-a361-4282-8ab7-ac1cbaab051d	19109550-2cfe-4f8f-b3fd-2bf4e5525250	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.3292	0.9336	\N	0	2	foul	2026-04-18 14:52:46.617843	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.8330	0.8330	\N	\N
8ddc6321-2084-4a5d-853d-8aed2faa83aa	19109550-2cfe-4f8f-b3fd-2bf4e5525250	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	slider	\N	0.7036	1.1643	\N	0	2	ball	2026-04-18 14:53:03.527586	3539b425-cb5b-43f0-bf7a-685f26022c7e	0.5000	1.1500	\N	\N
723e2f75-1434-4324-9a23-8cf963162126	19109550-2cfe-4f8f-b3fd-2bf4e5525250	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	5	fastball	\N	-0.0246	0.2657	\N	1	2	swinging_strike	2026-04-18 14:53:16.916803	3539b425-cb5b-43f0-bf7a-685f26022c7e	1.1500	0.5000	\N	\N
502c3ebd-add5-4655-b85a-5d6991afaff5	8b0bfce1-29c9-4dde-b20d-7ebf905d5188	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	fastball	\N	0.0421	0.6119	\N	0	0	called_strike	2026-04-18 14:53:42.919795	97c0431d-f710-4e36-9cd8-790825dde339	0.8330	0.5000	\N	\N
65348662-fed9-4a2e-964f-468a94afe4fc	8b0bfce1-29c9-4dde-b20d-7ebf905d5188	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	-0.1118	0.2797	\N	0	1	ball	2026-04-18 14:53:57.535944	97c0431d-f710-4e36-9cd8-790825dde339	1.1500	0.5000	\N	\N
b398bf5e-842b-43e8-b837-786577b0ae18	8b0bfce1-29c9-4dde-b20d-7ebf905d5188	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	slider	\N	0.1087	0.7378	\N	1	1	in_play	2026-04-18 14:54:19.447975	97c0431d-f710-4e36-9cd8-790825dde339	0.8330	0.8330	\N	\N
808257be-4e58-4a43-9c67-7931b206f9f6	0bb5c41d-f0f8-4246-9116-9e4543c0f54c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	0.2677	1.1503	\N	0	0	ball	2026-04-18 14:54:45.798084	73ec00f4-6f42-4ac9-805b-082fc25033c0	0.5000	1.1500	\N	\N
40d74311-f7cd-4e07-9130-9f23417c015b	0bb5c41d-f0f8-4246-9116-9e4543c0f54c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	0.2882	0.7972	\N	1	0	foul	2026-04-18 14:55:18.99215	73ec00f4-6f42-4ac9-805b-082fc25033c0	0.5000	0.8330	\N	\N
11fb9848-4bdd-48dc-96f5-481266f5d8a2	0bb5c41d-f0f8-4246-9116-9e4543c0f54c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	3	fastball	\N	0.8626	0.9091	\N	1	1	called_strike	2026-04-18 14:55:37.846648	73ec00f4-6f42-4ac9-805b-082fc25033c0	0.8330	0.8330	\N	\N
96a5093c-07d4-4cdc-87fc-affee25e6e1c	0bb5c41d-f0f8-4246-9116-9e4543c0f54c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	4	slider	\N	0.4164	0.8147	\N	1	2	in_play	2026-04-18 14:56:20.089494	73ec00f4-6f42-4ac9-805b-082fc25033c0	0.5000	0.8330	\N	\N
a3b185d1-135f-437a-bcda-c4b26f0243cb	4cd28416-314d-42ce-b1fb-b851ccf52b7c	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	0.3754	0.8916	\N	0	0	in_play	2026-04-18 14:56:55.293927	fa92c880-1d31-437f-a3c4-0b3a49a6c460	0.5000	0.8330	\N	\N
fe8da37d-850a-4259-8cd9-10304793ff8e	2b68671a-5d91-4cf8-a614-5be2b81d77b8	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	1	slider	\N	0.4369	0.9860	\N	0	0	ball	2026-04-18 14:57:31.732876	1cd1f6ca-23d2-4f35-877a-869e499b3d2c	0.5000	1.1500	\N	\N
acde6073-cb9a-4140-8257-3b980d769066	2b68671a-5d91-4cf8-a614-5be2b81d77b8	7937c2ca-f234-41de-b723-c616911bb04d	88809758-99ac-475e-b2dd-6f0f16470634	\N	2	slider	\N	0.4574	0.8776	\N	1	0	in_play	2026-04-18 14:57:48.095798	1cd1f6ca-23d2-4f35-877a-869e499b3d2c	0.5000	0.8330	\N	\N
12d3a496-0ec3-4175-8f95-4be1c4337e18	d40b9921-5d23-4f92-8fb3-d0b69c0d4cb6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	1	2-seam	\N	0.0660	0.5758	\N	0	0	called_strike	2026-04-20 22:08:12.596761	e2995a92-2246-4497-b99f-04ae060f476e	0.8330	0.5000	\N	\N
d1ce8e41-12e3-4483-afce-0b56aa6b6de9	d40b9921-5d23-4f92-8fb3-d0b69c0d4cb6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	2	changeup	\N	0.0574	0.8904	\N	0	1	foul	2026-04-20 22:08:24.557649	e2995a92-2246-4497-b99f-04ae060f476e	0.8330	0.8330	\N	\N
2980cfb4-4fa1-490f-b832-d823b198c735	d40b9921-5d23-4f92-8fb3-d0b69c0d4cb6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	3	4-seam	\N	-0.0366	0.7855	\N	0	2	ball	2026-04-20 22:08:43.555198	e2995a92-2246-4497-b99f-04ae060f476e	0.8330	0.8330	\N	\N
c4a03c0a-2fca-4574-b9e1-502efb5cd1ed	d40b9921-5d23-4f92-8fb3-d0b69c0d4cb6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	4	slider	\N	0.9720	0.8730	\N	1	2	swinging_strike	2026-04-20 22:09:00.95356	e2995a92-2246-4497-b99f-04ae060f476e	0.1670	0.8330	\N	\N
dc503802-68e6-4aa7-8837-6fc63a6d91bb	c700452e-74b2-4abd-91a9-226438bb0a1b	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	1	changeup	\N	0.0660	0.9167	\N	0	0	in_play	2026-04-20 22:09:29.572853	d234fc41-3f80-4a6c-b0ba-f3af8bfbb18b	0.8330	0.8330	\N	\N
ff99d91b-672e-4360-ac35-5107dc0903a8	971c95ad-5ef0-47b6-bbeb-a66546b6dcd6	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	1	fastball	\N	0.7797	0.0775	\N	0	0	in_play	2026-04-20 22:09:41.021632	7ca6976d-2558-4e98-a13c-b3a99f6fb7e6	0.1670	0.1670	\N	\N
e8cee636-ffb0-4136-b0bb-3a8d44320748	165e4760-51fc-4156-b2b8-3008a3d743b8	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	1	fastball	\N	0.1173	0.5437	\N	0	0	swinging_strike	2026-04-20 22:42:13.601683	b7647a23-7ee8-4490-abf7-f74d408a34bc	0.8330	0.5000	\N	\N
bfdd1dd6-061b-4e3c-9c05-563439ae440d	165e4760-51fc-4156-b2b8-3008a3d743b8	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	2	2-seam	\N	0.0788	0.8467	\N	0	1	foul	2026-04-20 22:42:19.56764	b7647a23-7ee8-4490-abf7-f74d408a34bc	0.8330	0.8330	\N	\N
c1dd48c5-1032-4ed6-b6e5-d9e5023f4e8a	165e4760-51fc-4156-b2b8-3008a3d743b8	b31f67fb-6a60-4556-84d6-bf4b2a566fc2	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	3	4-seam	\N	1.2626	-0.1702	\N	0	2	swinging_strike	2026-04-20 22:42:39.046208	b7647a23-7ee8-4490-abf7-f74d408a34bc	-0.1500	-0.1500	\N	\N
c3b56433-d095-4fad-9acc-bbb30484715a	01e9cd46-514d-4f11-9b73-5c657f0006e7	2a83067c-022d-4dcb-9682-dff5b0b83956	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	1	4-seam	\N	0.0361	0.9720	\N	0	0	in_play	2026-04-21 20:00:41.27505	f0140070-929e-48d3-a4bd-683b061bfc16	0.8330	0.8330	\N	\N
319a0d64-1a36-4c1b-8182-a5ed81975aec	d3a92c04-f55f-4313-ba85-9d8dbea1be5a	2a83067c-022d-4dcb-9682-dff5b0b83956	1ed97449-4736-42e1-8e76-8838ea0c4530	\N	1	4-seam	\N	0.0959	0.8934	\N	0	0	swinging_strike	2026-04-21 20:01:29.147391	788fbc6c-08f3-42ce-adb0-f8c598520887	0.8330	0.8330	\N	\N
a53c75e7-3860-44ff-a81f-3c24c26ee7a4	09a1f00d-b7d6-48c1-ae3a-556049a9bc68	2a83067c-022d-4dcb-9682-dff5b0b83956	7dc1a211-fbb8-4d00-8b20-03469e026785	\N	1	4-seam	\N	-0.0138	0.5898	\N	0	0	called_strike	2026-04-21 22:44:03.380983	f0140070-929e-48d3-a4bd-683b061bfc16	0.8330	0.5000	1-2	our_team
2f0a3568-822e-403f-817b-ea30babd268f	09a1f00d-b7d6-48c1-ae3a-556049a9bc68	2a83067c-022d-4dcb-9682-dff5b0b83956	7dc1a211-fbb8-4d00-8b20-03469e026785	\N	2	4-seam	\N	0.2230	0.9382	\N	0	1	called_strike	2026-04-21 22:44:22.046632	f0140070-929e-48d3-a4bd-683b061bfc16	0.8330	0.8330	2-2	our_team
c9bf91dc-0a4c-4797-8081-d9fa227b74ff	09a1f00d-b7d6-48c1-ae3a-556049a9bc68	2a83067c-022d-4dcb-9682-dff5b0b83956	7dc1a211-fbb8-4d00-8b20-03469e026785	\N	3	cutter	\N	0.9832	0.4709	\N	0	2	swinging_strike	2026-04-21 22:44:29.732358	f0140070-929e-48d3-a4bd-683b061bfc16	0.1670	0.5000	1-0	our_team
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.players (id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws, is_active, created_at, updated_at, user_id) FROM stdin;
10000000-0000-0000-0000-000000000001	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Tommy	Martinez	7	P	R	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483	\N
10000000-0000-0000-0000-000000000002	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Jake	Anderson	12	SS	R	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483	\N
10000000-0000-0000-0000-000000000003	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Marcus	Williams	23	CF	L	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483	\N
10000000-0000-0000-0000-000000000004	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Ryan	Taylor	5	3B	R	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483	\N
10000000-0000-0000-0000-000000000005	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Chris	Brown	18	1B	L	L	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483	\N
20000000-0000-0000-0000-000000000001	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	David	Johnson	21	P	R	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294	\N
20000000-0000-0000-0000-000000000002	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Alex	Garcia	9	C	R	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294	\N
20000000-0000-0000-0000-000000000003	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Kevin	Rodriguez	3	2B	S	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294	\N
20000000-0000-0000-0000-000000000004	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Brandon	Miller	15	LF	L	L	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294	\N
20000000-0000-0000-0000-000000000005	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Tyler	Davis	8	RF	R	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294	\N
f0420064-7cb6-40e5-83c3-abfd8a964f49	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Volante	\N	P	L	L	t	2026-01-17 16:24:42.323021	2026-01-17 16:24:42.323021	\N
5aadaa79-756c-4352-b039-877b6fa3652a	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Test	\N	P	L	L	t	2026-01-17 16:26:57.536401	2026-01-17 16:26:57.536401	\N
1684189b-aa2c-4a49-b4e5-9ac55c955566	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Test	\N	P	L	L	t	2026-01-17 16:29:47.544615	2026-01-17 16:29:47.544615	\N
a2b0f880-b9a9-4127-bd0d-4bea38b46e2e	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Test	1	P	L	L	t	2026-01-17 16:30:05.316883	2026-01-17 16:30:05.316883	\N
ba572510-0315-424f-990a-73eb34c3bc65	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Peter	Hebert	25	P	R	R	t	2026-01-20 22:49:26.501522	2026-01-21 00:16:46.639543	\N
51e16641-e136-455a-80ee-4a07873b79e5	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Giovanni	Volante	22	P	R	R	t	2026-01-20 22:49:06.936248	2026-01-21 00:16:56.22728	\N
ee6b9172-c188-4d42-a1a8-096635d2c6cc	0afb754c-95f0-4296-96f8-528cc689f0d7	Gino	Volante	1	P	R	R	t	2026-02-02 19:51:29.520193	2026-02-02 19:51:29.520193	\N
351ac884-2701-4be0-a855-071557cb07d0	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test	Player1	11	P	R	R	t	2026-02-03 23:29:36.549209	2026-02-03 23:29:36.549209	\N
d6ca532f-44e5-4297-a28c-c331034bf836	b1fc0e0f-2478-4f4d-a35f-e8f645ec7483	John	Pitcher	1	P	R	R	t	2026-02-08 22:17:47.614466	2026-02-08 22:17:47.614466	\N
9d973e4d-32eb-4b78-af3c-682d622ceccc	0afb754c-95f0-4296-96f8-528cc689f0d7	Gabe	Lopez	15	P	R	R	t	2026-02-09 13:35:46.395999	2026-02-09 13:35:46.395999	\N
6ea3ab5c-0826-43e2-894d-3e18657959da	46b83059-538e-4a2c-9ba4-10cc22bb1c94	Hunter	Poe	40	P	R	R	t	2026-02-13 16:26:13.173717	2026-02-13 16:26:13.173717	\N
a3862bcd-180d-45f6-ae5f-eac1c0e9feb5	45e73824-30e0-4d5d-a6a6-00164eae12b8	Gino	Volante	5	P	R	R	t	2026-03-04 23:47:30.894553	2026-03-04 23:47:30.894553	\N
f84ccab6-70e3-4f9e-987d-56f2c2b9e4e1	49217130-66b3-45ee-87b2-687a8e8d749a	Johnny	Walker	1	P	R	R	t	2026-04-13 23:26:18.963748	2026-04-13 23:26:18.963748	\N
18aa761f-ad20-488a-afaf-017d8b82edf4	7bb4cf59-011e-4847-86da-30e3ebb28408	Hunter	Poe	40	P	R	R	t	2026-04-17 18:20:31.339312	2026-04-17 18:20:31.339312	\N
6bf69e3c-e266-4c8e-b8b6-d111f4cb6c6b	7bb4cf59-011e-4847-86da-30e3ebb28408	Jerek	Pena	5	P	R	R	t	2026-04-17 18:22:29.778882	2026-04-17 18:22:29.778882	\N
968bd313-8ab8-4699-ae45-6ae68afa2268	7bb4cf59-011e-4847-86da-30e3ebb28408	Cooper	Marshall	11	P	R	R	t	2026-04-17 18:22:46.509587	2026-04-17 18:22:46.509587	\N
1ed97449-4736-42e1-8e76-8838ea0c4530	7bb4cf59-011e-4847-86da-30e3ebb28408	Adam	Trevino	14	P	R	R	t	2026-04-17 18:23:00.806918	2026-04-17 18:23:00.806918	\N
7dc1a211-fbb8-4d00-8b20-03469e026785	7bb4cf59-011e-4847-86da-30e3ebb28408	David	Perez	15	P	R	R	t	2026-04-17 18:23:16.107143	2026-04-17 18:23:16.107143	\N
a5be271f-29e2-484d-b109-c503d420103d	7bb4cf59-011e-4847-86da-30e3ebb28408	Trey	Gomez	21	P	R	L	t	2026-04-17 18:23:34.711011	2026-04-17 18:23:34.711011	\N
011bc2f2-b2d3-47fc-a93e-920eb8d01252	7bb4cf59-011e-4847-86da-30e3ebb28408	Hagen	Tate	23	P	R	R	t	2026-04-17 18:23:51.310628	2026-04-17 18:23:51.310628	\N
f14de3ef-ca63-4b01-b9db-190d4dc6089f	7bb4cf59-011e-4847-86da-30e3ebb28408	Gianni	Cade	28	P	R	L	t	2026-04-17 18:24:09.108413	2026-04-17 18:24:09.108413	\N
88809758-99ac-475e-b2dd-6f0f16470634	7bb4cf59-011e-4847-86da-30e3ebb28408	Brayden	Durst	29	P	R	L	t	2026-04-17 18:24:24.108357	2026-04-17 18:24:24.108357	\N
3204fde4-75c8-4b60-bb86-ef11fcd88b3d	7bb4cf59-011e-4847-86da-30e3ebb28408	Cole	Prasse	32	P	R	R	t	2026-04-17 18:26:05.39637	2026-04-17 18:26:05.39637	\N
49e6f37a-1bb7-4447-befc-2a282550c4af	7bb4cf59-011e-4847-86da-30e3ebb28408	Camp	Churchill	33	P	R	R	t	2026-04-17 18:26:17.011844	2026-04-17 18:26:17.011844	\N
761bae6f-3943-444f-873e-ea6c510561ff	7bb4cf59-011e-4847-86da-30e3ebb28408	Tony	Heredia	39	P	R	R	t	2026-04-17 18:26:43.818747	2026-04-17 18:26:43.818747	\N
47a0d1de-a464-48ea-b643-7b74e3a5de27	7bb4cf59-011e-4847-86da-30e3ebb28408	Brian	Biggs	41	P	R	L	t	2026-04-17 18:26:55.998263	2026-04-17 18:26:55.998263	\N
\.


--
-- Data for Name: plays; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.plays (id, pitch_id, at_bat_id, contact_type, contact_quality, hit_direction, field_location, hit_depth, hit_result, out_type, fielded_by_position, is_error, is_out, runs_scored, notes, created_at) FROM stdin;
\.


--
-- Data for Name: scouting_report_batters; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.scouting_report_batters (id, report_id, player_name, jersey_number, batting_order, bats, notes, zone_weakness, pitch_vulnerabilities, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scouting_reports; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.scouting_reports (id, team_id, opponent_name, game_id, game_date, notes, steal_frequency, bunt_frequency, hit_and_run_frequency, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.team_members (id, team_id, user_id, role, player_id, created_at) FROM stdin;
659a61b7-1fa5-8754-1e1c-9f50ae4fd781	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	owner	\N	2026-02-03 23:23:05.21081
8657e3d3-cef2-8a66-0573-4b2752c62e2e	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22	owner	\N	2026-02-03 23:23:05.21081
ad826e17-5a9d-d3f0-427c-dad1073a0c5b	f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66	c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33	owner	\N	2026-02-03 23:23:05.21081
596f439b-ea8b-6110-0283-04f5de7331ae	6788b680-875d-4318-8a15-cf7f1d53bb67	ed70782c-33dd-4895-beff-b4c200de03fa	owner	\N	2026-02-03 23:23:05.21081
d861f6a7-5d02-911e-97b5-57ebf7a227ce	07cb5001-1965-49d5-97c6-5a5a52dc2a67	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	owner	\N	2026-02-03 23:23:05.21081
c27b0112-b70f-0fad-e588-defe44a787f8	0afb754c-95f0-4296-96f8-528cc689f0d7	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	owner	\N	2026-02-03 23:23:05.21081
4f7d0965-feec-4b07-8ee7-67ba13242a1a	9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	2a4cd21b-36a0-41c6-8a02-7220db6483c8	owner	\N	2026-02-03 23:29:11.141054
aff6d2b9-154e-4402-a518-26e39e08ba0b	b1fc0e0f-2478-4f4d-a35f-e8f645ec7483	975e4ad9-2666-4ffb-8c41-282d5738335a	owner	\N	2026-02-08 22:08:51.787053
30cf4234-6859-4464-81b6-be229a4dbae4	46b83059-538e-4a2c-9ba4-10cc22bb1c94	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	owner	\N	2026-02-13 16:25:59.947814
88a16159-9780-48de-8afe-84c8acd03b41	45e73824-30e0-4d5d-a6a6-00164eae12b8	65a849fb-4d0e-47d4-a350-c10937671bbd	owner	\N	2026-03-04 23:47:11.788461
7ef0814b-7a2a-431b-b319-48bf624bc717	49217130-66b3-45ee-87b2-687a8e8d749a	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	owner	\N	2026-04-13 23:26:00.95523
f76d8c61-d677-47c1-a988-6c4aee626ae9	7bb4cf59-011e-4847-86da-30e3ebb28408	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	owner	\N	2026-04-17 18:20:03.797966
141a28e3-d864-433f-a32b-5c349329766e	470d1130-b914-4a75-a2a0-76ef533525f3	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	owner	\N	2026-04-22 00:24:39.581243
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.teams (id, name, owner_id, organization, age_group, season, created_at, updated_at, logo_path, primary_color, secondary_color, accent_color, organization_id, team_type, year) FROM stdin;
d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Wildcats	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279	\N	#3b82f6	#1f2937	#22c55e	\N	\N	\N
e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Thunder	b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279	\N	#3b82f6	#1f2937	#22c55e	\N	\N	\N
f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66	Lightning	c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279	\N	#3b82f6	#1f2937	#22c55e	\N	\N	\N
6788b680-875d-4318-8a15-cf7f1d53bb67	Bombers	ed70782c-33dd-4895-beff-b4c200de03fa	\N	\N	\N	2026-01-17 16:09:13.541125	2026-01-17 16:09:13.541125	\N	#3b82f6	#1f2937	#22c55e	\N	\N	\N
07cb5001-1965-49d5-97c6-5a5a52dc2a67	Wildcatters	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	\N	\N	\N	2026-01-20 22:48:54.247903	2026-01-24 00:23:20.646842	\N	#f59e0b	#083f8c	#FFFFFF	\N	\N	\N
0afb754c-95f0-4296-96f8-528cc689f0d7	Atascocita JV	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	\N	\N	\N	2026-02-02 19:50:54.867045	2026-02-02 19:50:54.867045	\N	#3b82f6	#1f2937	#22c55e	\N	\N	\N
9ce5834a-79f1-4266-bbd0-a4f5baa7bee1	Test Team	2a4cd21b-36a0-41c6-8a02-7220db6483c8	\N	\N	\N	2026-02-03 23:29:11.141054	2026-02-03 23:29:11.141054	\N	#3b82f6	#1f2937	#22c55e	\N	\N	\N
b1fc0e0f-2478-4f4d-a35f-e8f645ec7483	Test team	975e4ad9-2666-4ffb-8c41-282d5738335a	\N	\N	Spring	2026-02-08 22:08:51.787053	2026-02-08 22:08:51.787053	\N	#3b82f6	#1f2937	#22c55e	\N	high_school	2026
46b83059-538e-4a2c-9ba4-10cc22bb1c94	McMurry	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	\N	\N	Spring	2026-02-13 16:25:59.947814	2026-02-13 16:25:59.947814	\N	#3b82f6	#1f2937	#22c55e	\N	college	2026
45e73824-30e0-4d5d-a6a6-00164eae12b8	Atascocita JV	65a849fb-4d0e-47d4-a350-c10937671bbd	\N	\N	Spring	2026-03-04 23:47:11.788461	2026-03-04 23:47:11.788461	\N	#3b82f6	#1f2937	#22c55e	\N	high_school	2026
49217130-66b3-45ee-87b2-687a8e8d749a	Test team 1	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	\N	\N	Summer	2026-04-13 23:26:00.95523	2026-04-13 23:26:00.95523	\N	#3b82f6	#1f2937	#22c55e	\N	travel	2026
7bb4cf59-011e-4847-86da-30e3ebb28408	McMurry	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	\N	\N	Spring	2026-04-17 18:20:03.797966	2026-04-17 18:20:03.797966	\N	#3b82f6	#1f2937	#22c55e	\N	college	2026
470d1130-b914-4a75-a2a0-76ef533525f3	AHS Eagles	7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	\N	\N	Spring	2026-04-22 00:24:39.581243	2026-04-22 00:24:39.581243	\N	#3b82f6	#1f2937	#22c55e	\N	high_school	2026
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.users (id, email, password_hash, first_name, last_name, created_at, updated_at) FROM stdin;
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	coach.smith@example.com	$2b$10$abcdefghijklmnopqrstuvwxyz123456	John	Smith	2026-01-10 22:42:15.807157	2026-01-10 22:42:15.807157
b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22	coach.jones@example.com	$2b$10$abcdefghijklmnopqrstuvwxyz123456	Mike	Jones	2026-01-10 22:42:15.807157	2026-01-10 22:42:15.807157
c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33	coach.davis@example.com	$2b$10$abcdefghijklmnopqrstuvwxyz123456	Sarah	Davis	2026-01-10 22:42:15.807157	2026-01-10 22:42:15.807157
ed70782c-33dd-4895-beff-b4c200de03fa	brian@email.com	$2b$10$QYk1pZnJBUKYvl3GzFVNG.H6IyxSeU4CAHA0lhSmYqh7k5uoxCv9a	Brian	TestCase	2026-01-14 23:24:58.024553	2026-01-14 23:24:58.024553
d39453d8-d476-4d84-9894-fd6a2a14398e	brian.volante@bvolante.com	$2b$10$7OKGaP3K9FgJy2LyqsX8meTSzEM6hKBLq40nlQWVz5k7ItJhBjDVu	Brian	Volante	2026-01-15 23:12:56.00034	2026-01-15 23:12:56.00034
b79c9ec0-dab5-407b-87cf-e5d39ac5121f	brian.volante@email.com	$2b$10$x6PkGgvGdIIo8HbB07RzsO3yHhF/8eSanez49dgf95Q/3RD725kJy	Brian	Volante	2026-01-20 22:48:34.10027	2026-01-20 22:48:34.10027
2a4cd21b-36a0-41c6-8a02-7220db6483c8	brian.volante@gmail.com	$2b$10$t3YHp4OLk.WPiCmiotAWQevIfql9rn6OdDfjM/RDHxD6yJd935y4G	Brian	Volante	2026-02-03 23:16:44.753445	2026-02-03 23:16:44.753445
975e4ad9-2666-4ffb-8c41-282d5738335a	brianv7@bvolante.com	$2b$10$O/B8uKvnCQAYsmXvAgluseje1pP2uJoZdJ0ldUfiSjVJhKwRmiGgS	Brian	Volante	2026-02-08 22:08:24.421202	2026-02-08 22:08:24.421202
65a849fb-4d0e-47d4-a350-c10937671bbd	brian@bvolante.com	$2b$10$m5Eqa8hwgsLL99K7G.3.oehrX5gfPzgctuBoQgaFRuSCTddjHACSW	Brian	Volante	2026-03-04 23:46:45.916604	2026-03-04 23:46:45.916604
7f27ea2a-b4ad-4d67-b19e-8ace6ad55b76	admin@wc.com	$2b$10$qi5s7IimNP.obPbrIbloFuJz2XuDQVc1ldCTZ0SVVwBUMT5kIAe6q	Test	Admin	2026-04-13 23:25:32.06822	2026-04-20 02:24:41.368306
\.


--
-- Name: at_bats at_bats_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_pkey PRIMARY KEY (id);


--
-- Name: baserunner_events baserunner_events_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.baserunner_events
    ADD CONSTRAINT baserunner_events_pkey PRIMARY KEY (id);


--
-- Name: batter_scouting_notes batter_scouting_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_scouting_notes
    ADD CONSTRAINT batter_scouting_notes_pkey PRIMARY KEY (id);


--
-- Name: batter_scouting_profiles batter_scouting_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_scouting_profiles
    ADD CONSTRAINT batter_scouting_profiles_pkey PRIMARY KEY (id);


--
-- Name: batter_scouting_profiles batter_scouting_profiles_team_id_opponent_team_name_normali_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_scouting_profiles
    ADD CONSTRAINT batter_scouting_profiles_team_id_opponent_team_name_normali_key UNIQUE (team_id, opponent_team_name, normalized_name);


--
-- Name: batter_tendencies batter_tendencies_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_tendencies
    ADD CONSTRAINT batter_tendencies_pkey PRIMARY KEY (id);


--
-- Name: batter_tendencies batter_tendencies_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_tendencies
    ADD CONSTRAINT batter_tendencies_profile_id_key UNIQUE (profile_id);


--
-- Name: bullpen_pitches bullpen_pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_pitches
    ADD CONSTRAINT bullpen_pitches_pkey PRIMARY KEY (id);


--
-- Name: bullpen_plan_assignments bullpen_plan_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_assignments
    ADD CONSTRAINT bullpen_plan_assignments_pkey PRIMARY KEY (id);


--
-- Name: bullpen_plan_assignments bullpen_plan_assignments_plan_id_pitcher_id_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_assignments
    ADD CONSTRAINT bullpen_plan_assignments_plan_id_pitcher_id_key UNIQUE (plan_id, pitcher_id);


--
-- Name: bullpen_plan_pitches bullpen_plan_pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_pitches
    ADD CONSTRAINT bullpen_plan_pitches_pkey PRIMARY KEY (id);


--
-- Name: bullpen_plans bullpen_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plans
    ADD CONSTRAINT bullpen_plans_pkey PRIMARY KEY (id);


--
-- Name: bullpen_sessions bullpen_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_sessions
    ADD CONSTRAINT bullpen_sessions_pkey PRIMARY KEY (id);


--
-- Name: game_pitchers game_pitchers_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_pitchers
    ADD CONSTRAINT game_pitchers_pkey PRIMARY KEY (id);


--
-- Name: game_roles game_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_roles
    ADD CONSTRAINT game_roles_pkey PRIMARY KEY (id);


--
-- Name: game_roles game_roles_user_id_game_id_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_roles
    ADD CONSTRAINT game_roles_user_id_game_id_key UNIQUE (user_id, game_id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: innings innings_game_id_inning_number_half_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.innings
    ADD CONSTRAINT innings_game_id_inning_number_half_key UNIQUE (game_id, inning_number, half);


--
-- Name: innings innings_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.innings
    ADD CONSTRAINT innings_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: join_requests join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_pkey PRIMARY KEY (id);


--
-- Name: my_team_lineup my_team_lineup_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.my_team_lineup
    ADD CONSTRAINT my_team_lineup_pkey PRIMARY KEY (id);


--
-- Name: opponent_lineup opponent_lineup_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup
    ADD CONSTRAINT opponent_lineup_pkey PRIMARY KEY (id);


--
-- Name: opponent_lineup_profiles opponent_lineup_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup_profiles
    ADD CONSTRAINT opponent_lineup_profiles_pkey PRIMARY KEY (opponent_lineup_id);


--
-- Name: opposing_pitchers opposing_pitchers_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opposing_pitchers
    ADD CONSTRAINT opposing_pitchers_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: performance_summaries performance_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.performance_summaries
    ADD CONSTRAINT performance_summaries_pkey PRIMARY KEY (id);


--
-- Name: pitch_calls pitch_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_pkey PRIMARY KEY (id);


--
-- Name: pitcher_pitch_types pitcher_pitch_types_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitcher_pitch_types
    ADD CONSTRAINT pitcher_pitch_types_pkey PRIMARY KEY (id);


--
-- Name: pitcher_pitch_types pitcher_pitch_types_player_id_pitch_type_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitcher_pitch_types
    ADD CONSTRAINT pitcher_pitch_types_player_id_pitch_type_key UNIQUE (player_id, pitch_type);


--
-- Name: pitches pitches_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: plays plays_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.plays
    ADD CONSTRAINT plays_pkey PRIMARY KEY (id);


--
-- Name: scouting_report_batters scouting_report_batters_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.scouting_report_batters
    ADD CONSTRAINT scouting_report_batters_pkey PRIMARY KEY (id);


--
-- Name: scouting_reports scouting_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.scouting_reports
    ADD CONSTRAINT scouting_reports_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_at_bats_batter; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_at_bats_batter ON public.at_bats USING btree (batter_id);


--
-- Name: idx_at_bats_batter_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_at_bats_batter_game ON public.at_bats USING btree (batter_id, game_id);


--
-- Name: idx_at_bats_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_at_bats_game ON public.at_bats USING btree (game_id);


--
-- Name: idx_at_bats_inning; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_at_bats_inning ON public.at_bats USING btree (inning_id);


--
-- Name: idx_at_bats_opponent_batter; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_at_bats_opponent_batter ON public.at_bats USING btree (opponent_batter_id);


--
-- Name: idx_at_bats_pitcher; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_at_bats_pitcher ON public.at_bats USING btree (pitcher_id);


--
-- Name: idx_baserunner_events_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_baserunner_events_game ON public.baserunner_events USING btree (game_id);


--
-- Name: idx_baserunner_events_inning; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_baserunner_events_inning ON public.baserunner_events USING btree (inning_id);


--
-- Name: idx_bullpen_pitches_session; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_pitches_session ON public.bullpen_pitches USING btree (session_id);


--
-- Name: idx_bullpen_plan_assignments_pitcher; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_plan_assignments_pitcher ON public.bullpen_plan_assignments USING btree (pitcher_id);


--
-- Name: idx_bullpen_plan_assignments_plan; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_plan_assignments_plan ON public.bullpen_plan_assignments USING btree (plan_id);


--
-- Name: idx_bullpen_plan_pitches_plan; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_plan_pitches_plan ON public.bullpen_plan_pitches USING btree (plan_id);


--
-- Name: idx_bullpen_plans_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_plans_team ON public.bullpen_plans USING btree (team_id);


--
-- Name: idx_bullpen_sessions_date; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_sessions_date ON public.bullpen_sessions USING btree (date DESC);


--
-- Name: idx_bullpen_sessions_pitcher; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_sessions_pitcher ON public.bullpen_sessions USING btree (pitcher_id);


--
-- Name: idx_bullpen_sessions_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_bullpen_sessions_team ON public.bullpen_sessions USING btree (team_id);


--
-- Name: idx_game_pitchers_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_game_pitchers_game ON public.game_pitchers USING btree (game_id);


--
-- Name: idx_game_pitchers_game_order; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE UNIQUE INDEX idx_game_pitchers_game_order ON public.game_pitchers USING btree (game_id, pitching_order);


--
-- Name: idx_game_pitchers_player; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_game_pitchers_player ON public.game_pitchers USING btree (player_id);


--
-- Name: idx_game_roles_game_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_game_roles_game_id ON public.game_roles USING btree (game_id);


--
-- Name: idx_games_away_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_games_away_team ON public.games USING btree (away_team_id);


--
-- Name: idx_games_date; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_games_date ON public.games USING btree (game_date);


--
-- Name: idx_games_home_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_games_home_team ON public.games USING btree (home_team_id);


--
-- Name: idx_games_status; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_games_status ON public.games USING btree (status);


--
-- Name: idx_innings_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_innings_game ON public.innings USING btree (game_id);


--
-- Name: idx_invites_status; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_invites_status ON public.invites USING btree (status);


--
-- Name: idx_invites_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_invites_team ON public.invites USING btree (team_id);


--
-- Name: idx_invites_token; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_invites_token ON public.invites USING btree (token);


--
-- Name: idx_join_requests_status; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_join_requests_status ON public.join_requests USING btree (status);


--
-- Name: idx_join_requests_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_join_requests_team ON public.join_requests USING btree (team_id);


--
-- Name: idx_join_requests_user; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_join_requests_user ON public.join_requests USING btree (user_id);


--
-- Name: idx_lineup_profiles_profile; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_lineup_profiles_profile ON public.opponent_lineup_profiles USING btree (profile_id);


--
-- Name: idx_my_team_lineup_game_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_my_team_lineup_game_id ON public.my_team_lineup USING btree (game_id);


--
-- Name: idx_opponent_lineup_batting_order; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opponent_lineup_batting_order ON public.opponent_lineup USING btree (game_id, batting_order);


--
-- Name: idx_opponent_lineup_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opponent_lineup_game ON public.opponent_lineup USING btree (game_id);


--
-- Name: idx_opposing_pitchers_game_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opposing_pitchers_game_id ON public.opposing_pitchers USING btree (game_id);


--
-- Name: idx_org_members_org; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_org_members_org ON public.organization_members USING btree (organization_id);


--
-- Name: idx_org_members_user; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_org_members_user ON public.organization_members USING btree (user_id);


--
-- Name: idx_organizations_created_by; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_organizations_created_by ON public.organizations USING btree (created_by);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_performance_summaries_pitcher; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_performance_summaries_pitcher ON public.performance_summaries USING btree (pitcher_id, created_at DESC);


--
-- Name: idx_performance_summaries_source; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE UNIQUE INDEX idx_performance_summaries_source ON public.performance_summaries USING btree (source_type, source_id);


--
-- Name: idx_performance_summaries_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_performance_summaries_team ON public.performance_summaries USING btree (team_id, created_at DESC);


--
-- Name: idx_pitch_calls_at_bat_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitch_calls_at_bat_id ON public.pitch_calls USING btree (at_bat_id);


--
-- Name: idx_pitch_calls_game_call_number; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitch_calls_game_call_number ON public.pitch_calls USING btree (game_id, call_number);


--
-- Name: idx_pitch_calls_game_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitch_calls_game_id ON public.pitch_calls USING btree (game_id);


--
-- Name: idx_pitch_calls_original_call_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitch_calls_original_call_id ON public.pitch_calls USING btree (original_call_id);


--
-- Name: idx_pitch_calls_pitcher_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitch_calls_pitcher_id ON public.pitch_calls USING btree (pitcher_id);


--
-- Name: idx_pitch_calls_team_id; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitch_calls_team_id ON public.pitch_calls USING btree (team_id);


--
-- Name: idx_pitches_at_bat; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitches_at_bat ON public.pitches USING btree (at_bat_id);


--
-- Name: idx_pitches_batter; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitches_batter ON public.pitches USING btree (batter_id);


--
-- Name: idx_pitches_batter_pitcher; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitches_batter_pitcher ON public.pitches USING btree (batter_id, pitcher_id);


--
-- Name: idx_pitches_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitches_game ON public.pitches USING btree (game_id);


--
-- Name: idx_pitches_opponent_batter; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitches_opponent_batter ON public.pitches USING btree (opponent_batter_id);


--
-- Name: idx_pitches_pitcher; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_pitches_pitcher ON public.pitches USING btree (pitcher_id);


--
-- Name: idx_players_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_players_team ON public.players USING btree (team_id);


--
-- Name: idx_players_user; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_players_user ON public.players USING btree (user_id);


--
-- Name: idx_plays_at_bat; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_plays_at_bat ON public.plays USING btree (at_bat_id);


--
-- Name: idx_plays_pitch; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_plays_pitch ON public.plays USING btree (pitch_id);


--
-- Name: idx_scouting_notes_profile; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_notes_profile ON public.batter_scouting_notes USING btree (profile_id);


--
-- Name: idx_scouting_profiles_normalized; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_profiles_normalized ON public.batter_scouting_profiles USING btree (normalized_name);


--
-- Name: idx_scouting_profiles_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_profiles_team ON public.batter_scouting_profiles USING btree (team_id);


--
-- Name: idx_scouting_report_batters_jersey; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_report_batters_jersey ON public.scouting_report_batters USING btree (report_id, jersey_number) WHERE (jersey_number IS NOT NULL);


--
-- Name: idx_scouting_report_batters_name; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_report_batters_name ON public.scouting_report_batters USING btree (report_id, lower((player_name)::text));


--
-- Name: idx_scouting_report_batters_report; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_report_batters_report ON public.scouting_report_batters USING btree (report_id);


--
-- Name: idx_scouting_reports_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_reports_game ON public.scouting_reports USING btree (game_id) WHERE (game_id IS NOT NULL);


--
-- Name: idx_scouting_reports_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_scouting_reports_team ON public.scouting_reports USING btree (team_id);


--
-- Name: idx_team_members_player; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_team_members_player ON public.team_members USING btree (player_id);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_teams_organization; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_teams_organization ON public.teams USING btree (organization_id);


--
-- Name: idx_teams_owner; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_teams_owner ON public.teams USING btree (owner_id);


--
-- Name: idx_teams_type; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_teams_type ON public.teams USING btree (team_type);


--
-- Name: idx_teams_year; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_teams_year ON public.teams USING btree (year);


--
-- Name: idx_tendencies_profile; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_tendencies_profile ON public.batter_tendencies USING btree (profile_id);


--
-- Name: idx_tendencies_stale; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_tendencies_stale ON public.batter_tendencies USING btree (is_stale) WHERE (is_stale = true);


--
-- Name: at_bats at_bats_notify; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER at_bats_notify AFTER INSERT OR UPDATE ON public.at_bats FOR EACH ROW EXECUTE PROCEDURE public.notify_game_update();


--
-- Name: pitches pitches_notify; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER pitches_notify AFTER INSERT OR UPDATE ON public.pitches FOR EACH ROW EXECUTE PROCEDURE public.notify_game_update();


--
-- Name: batter_scouting_notes update_batter_scouting_notes_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_batter_scouting_notes_updated_at BEFORE UPDATE ON public.batter_scouting_notes FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: batter_scouting_profiles update_batter_scouting_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_batter_scouting_profiles_updated_at BEFORE UPDATE ON public.batter_scouting_profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: batter_tendencies update_batter_tendencies_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_batter_tendencies_updated_at BEFORE UPDATE ON public.batter_tendencies FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: bullpen_plans update_bullpen_plans_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_bullpen_plans_updated_at BEFORE UPDATE ON public.bullpen_plans FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: bullpen_sessions update_bullpen_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_bullpen_sessions_updated_at BEFORE UPDATE ON public.bullpen_sessions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: games update_games_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: players update_players_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: scouting_report_batters update_scouting_report_batters_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_scouting_report_batters_updated_at BEFORE UPDATE ON public.scouting_report_batters FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: scouting_reports update_scouting_reports_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_scouting_reports_updated_at BEFORE UPDATE ON public.scouting_reports FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


--
-- Name: at_bats at_bats_batter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_batter_id_fkey FOREIGN KEY (batter_id) REFERENCES public.players(id);


--
-- Name: at_bats at_bats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: at_bats at_bats_inning_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_inning_id_fkey FOREIGN KEY (inning_id) REFERENCES public.innings(id) ON DELETE CASCADE;


--
-- Name: at_bats at_bats_opponent_batter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_opponent_batter_id_fkey FOREIGN KEY (opponent_batter_id) REFERENCES public.opponent_lineup(id) ON DELETE SET NULL;


--
-- Name: at_bats at_bats_pitcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_pitcher_id_fkey FOREIGN KEY (pitcher_id) REFERENCES public.players(id);


--
-- Name: baserunner_events baserunner_events_at_bat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.baserunner_events
    ADD CONSTRAINT baserunner_events_at_bat_id_fkey FOREIGN KEY (at_bat_id) REFERENCES public.at_bats(id) ON DELETE SET NULL;


--
-- Name: baserunner_events baserunner_events_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.baserunner_events
    ADD CONSTRAINT baserunner_events_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: baserunner_events baserunner_events_inning_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.baserunner_events
    ADD CONSTRAINT baserunner_events_inning_id_fkey FOREIGN KEY (inning_id) REFERENCES public.innings(id) ON DELETE CASCADE;


--
-- Name: batter_scouting_notes batter_scouting_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_scouting_notes
    ADD CONSTRAINT batter_scouting_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: batter_scouting_notes batter_scouting_notes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_scouting_notes
    ADD CONSTRAINT batter_scouting_notes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.batter_scouting_profiles(id) ON DELETE CASCADE;


--
-- Name: batter_scouting_profiles batter_scouting_profiles_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_scouting_profiles
    ADD CONSTRAINT batter_scouting_profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: batter_tendencies batter_tendencies_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.batter_tendencies
    ADD CONSTRAINT batter_tendencies_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.batter_scouting_profiles(id) ON DELETE CASCADE;


--
-- Name: bullpen_pitches bullpen_pitches_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_pitches
    ADD CONSTRAINT bullpen_pitches_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.bullpen_sessions(id) ON DELETE CASCADE;


--
-- Name: bullpen_plan_assignments bullpen_plan_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_assignments
    ADD CONSTRAINT bullpen_plan_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bullpen_plan_assignments bullpen_plan_assignments_pitcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_assignments
    ADD CONSTRAINT bullpen_plan_assignments_pitcher_id_fkey FOREIGN KEY (pitcher_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: bullpen_plan_assignments bullpen_plan_assignments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_assignments
    ADD CONSTRAINT bullpen_plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.bullpen_plans(id) ON DELETE CASCADE;


--
-- Name: bullpen_plan_pitches bullpen_plan_pitches_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plan_pitches
    ADD CONSTRAINT bullpen_plan_pitches_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.bullpen_plans(id) ON DELETE CASCADE;


--
-- Name: bullpen_plans bullpen_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plans
    ADD CONSTRAINT bullpen_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bullpen_plans bullpen_plans_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_plans
    ADD CONSTRAINT bullpen_plans_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: bullpen_sessions bullpen_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_sessions
    ADD CONSTRAINT bullpen_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bullpen_sessions bullpen_sessions_pitcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_sessions
    ADD CONSTRAINT bullpen_sessions_pitcher_id_fkey FOREIGN KEY (pitcher_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: bullpen_sessions bullpen_sessions_plan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_sessions
    ADD CONSTRAINT bullpen_sessions_plan_fkey FOREIGN KEY (plan_id) REFERENCES public.bullpen_plans(id) ON DELETE SET NULL;


--
-- Name: bullpen_sessions bullpen_sessions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.bullpen_sessions
    ADD CONSTRAINT bullpen_sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: game_pitchers game_pitchers_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_pitchers
    ADD CONSTRAINT game_pitchers_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_pitchers game_pitchers_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_pitchers
    ADD CONSTRAINT game_pitchers_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: game_roles game_roles_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_roles
    ADD CONSTRAINT game_roles_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_roles game_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_roles
    ADD CONSTRAINT game_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: games games_away_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: games games_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: games games_home_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: innings innings_batting_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.innings
    ADD CONSTRAINT innings_batting_team_id_fkey FOREIGN KEY (batting_team_id) REFERENCES public.teams(id);


--
-- Name: innings innings_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.innings
    ADD CONSTRAINT innings_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: innings innings_pitching_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.innings
    ADD CONSTRAINT innings_pitching_team_id_fkey FOREIGN KEY (pitching_team_id) REFERENCES public.teams(id);


--
-- Name: invites invites_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id);


--
-- Name: invites invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: invites invites_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: invites invites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: join_requests join_requests_linked_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_linked_player_id_fkey FOREIGN KEY (linked_player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: join_requests join_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: join_requests join_requests_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: join_requests join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: my_team_lineup my_team_lineup_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.my_team_lineup
    ADD CONSTRAINT my_team_lineup_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: my_team_lineup my_team_lineup_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.my_team_lineup
    ADD CONSTRAINT my_team_lineup_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: my_team_lineup my_team_lineup_replaced_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.my_team_lineup
    ADD CONSTRAINT my_team_lineup_replaced_by_id_fkey FOREIGN KEY (replaced_by_id) REFERENCES public.my_team_lineup(id);


--
-- Name: opponent_lineup opponent_lineup_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup
    ADD CONSTRAINT opponent_lineup_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: opponent_lineup_profiles opponent_lineup_profiles_opponent_lineup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup_profiles
    ADD CONSTRAINT opponent_lineup_profiles_opponent_lineup_id_fkey FOREIGN KEY (opponent_lineup_id) REFERENCES public.opponent_lineup(id) ON DELETE CASCADE;


--
-- Name: opponent_lineup_profiles opponent_lineup_profiles_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup_profiles
    ADD CONSTRAINT opponent_lineup_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.batter_scouting_profiles(id) ON DELETE CASCADE;


--
-- Name: opponent_lineup opponent_lineup_replaced_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup
    ADD CONSTRAINT opponent_lineup_replaced_by_id_fkey FOREIGN KEY (replaced_by_id) REFERENCES public.opponent_lineup(id) ON DELETE SET NULL;


--
-- Name: opposing_pitchers opposing_pitchers_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opposing_pitchers
    ADD CONSTRAINT opposing_pitchers_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: performance_summaries performance_summaries_pitcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.performance_summaries
    ADD CONSTRAINT performance_summaries_pitcher_id_fkey FOREIGN KEY (pitcher_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: performance_summaries performance_summaries_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.performance_summaries
    ADD CONSTRAINT performance_summaries_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: pitch_calls pitch_calls_at_bat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_at_bat_id_fkey FOREIGN KEY (at_bat_id) REFERENCES public.at_bats(id) ON DELETE SET NULL;


--
-- Name: pitch_calls pitch_calls_batter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_batter_id_fkey FOREIGN KEY (batter_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: pitch_calls pitch_calls_called_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_called_by_fkey FOREIGN KEY (called_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pitch_calls pitch_calls_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: pitch_calls pitch_calls_opponent_batter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_opponent_batter_id_fkey FOREIGN KEY (opponent_batter_id) REFERENCES public.opponent_lineup(id) ON DELETE SET NULL;


--
-- Name: pitch_calls pitch_calls_original_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_original_call_id_fkey FOREIGN KEY (original_call_id) REFERENCES public.pitch_calls(id) ON DELETE SET NULL;


--
-- Name: pitch_calls pitch_calls_pitch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_pitch_id_fkey FOREIGN KEY (pitch_id) REFERENCES public.pitches(id) ON DELETE SET NULL;


--
-- Name: pitch_calls pitch_calls_pitcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_pitcher_id_fkey FOREIGN KEY (pitcher_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: pitch_calls pitch_calls_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitch_calls
    ADD CONSTRAINT pitch_calls_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: pitcher_pitch_types pitcher_pitch_types_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitcher_pitch_types
    ADD CONSTRAINT pitcher_pitch_types_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: pitches pitches_at_bat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_at_bat_id_fkey FOREIGN KEY (at_bat_id) REFERENCES public.at_bats(id) ON DELETE CASCADE;


--
-- Name: pitches pitches_batter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_batter_id_fkey FOREIGN KEY (batter_id) REFERENCES public.players(id);


--
-- Name: pitches pitches_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: pitches pitches_opponent_batter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_opponent_batter_id_fkey FOREIGN KEY (opponent_batter_id) REFERENCES public.opponent_lineup(id) ON DELETE SET NULL;


--
-- Name: pitches pitches_pitcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.pitches
    ADD CONSTRAINT pitches_pitcher_id_fkey FOREIGN KEY (pitcher_id) REFERENCES public.players(id);


--
-- Name: players players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: players players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: plays plays_at_bat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.plays
    ADD CONSTRAINT plays_at_bat_id_fkey FOREIGN KEY (at_bat_id) REFERENCES public.at_bats(id) ON DELETE CASCADE;


--
-- Name: plays plays_pitch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.plays
    ADD CONSTRAINT plays_pitch_id_fkey FOREIGN KEY (pitch_id) REFERENCES public.pitches(id) ON DELETE CASCADE;


--
-- Name: scouting_report_batters scouting_report_batters_report_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.scouting_report_batters
    ADD CONSTRAINT scouting_report_batters_report_fkey FOREIGN KEY (report_id) REFERENCES public.scouting_reports(id) ON DELETE CASCADE;


--
-- Name: scouting_reports scouting_reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.scouting_reports
    ADD CONSTRAINT scouting_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: scouting_reports scouting_reports_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.scouting_reports
    ADD CONSTRAINT scouting_reports_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE SET NULL;


--
-- Name: scouting_reports scouting_reports_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.scouting_reports
    ADD CONSTRAINT scouting_reports_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: TABLE at_bats; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.at_bats TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.at_bats TO bvolante_claudecode;


--
-- Name: TABLE baserunner_events; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.baserunner_events TO bvolante_pitch_tracker;


--
-- Name: TABLE batter_scouting_notes; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.batter_scouting_notes TO bvolante_pitch_tracker;


--
-- Name: TABLE batter_scouting_profiles; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.batter_scouting_profiles TO bvolante_pitch_tracker;


--
-- Name: TABLE batter_tendencies; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.batter_tendencies TO bvolante_pitch_tracker;


--
-- Name: TABLE bullpen_pitches; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.bullpen_pitches TO bvolante_pitch_tracker;


--
-- Name: TABLE bullpen_plan_assignments; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.bullpen_plan_assignments TO bvolante_pitch_tracker;


--
-- Name: TABLE bullpen_plan_pitches; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.bullpen_plan_pitches TO bvolante_pitch_tracker;


--
-- Name: TABLE bullpen_plans; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.bullpen_plans TO bvolante_pitch_tracker;


--
-- Name: TABLE bullpen_sessions; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.bullpen_sessions TO bvolante_pitch_tracker;


--
-- Name: TABLE game_pitchers; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.game_pitchers TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.game_pitchers TO bvolante_claudecode;


--
-- Name: TABLE game_roles; Type: ACL; Schema: public; Owner: bvolante
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.game_roles TO bvolante_pitch_tracker;


--
-- Name: TABLE games; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.games TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.games TO bvolante_claudecode;


--
-- Name: TABLE innings; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.innings TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.innings TO bvolante_claudecode;


--
-- Name: TABLE invites; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.invites TO bvolante_pitch_tracker;


--
-- Name: TABLE join_requests; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.join_requests TO bvolante_pitch_tracker;


--
-- Name: TABLE my_team_lineup; Type: ACL; Schema: public; Owner: bvolante
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.my_team_lineup TO bvolante_pitch_tracker;


--
-- Name: TABLE opponent_lineup; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.opponent_lineup TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.opponent_lineup TO bvolante_claudecode;


--
-- Name: TABLE opponent_lineup_profiles; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.opponent_lineup_profiles TO bvolante_pitch_tracker;


--
-- Name: TABLE opposing_pitchers; Type: ACL; Schema: public; Owner: bvolante
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.opposing_pitchers TO bvolante_pitch_tracker;


--
-- Name: TABLE organization_members; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.organization_members TO bvolante_pitch_tracker;


--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.organizations TO bvolante_pitch_tracker;


--
-- Name: TABLE performance_summaries; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.performance_summaries TO bvolante_pitch_tracker;


--
-- Name: TABLE pitch_calls; Type: ACL; Schema: public; Owner: bvolante
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pitch_calls TO bvolante_pitch_tracker;


--
-- Name: TABLE pitcher_pitch_types; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.pitcher_pitch_types TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.pitcher_pitch_types TO bvolante_claudecode;


--
-- Name: TABLE pitches; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.pitches TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.pitches TO bvolante_claudecode;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.players TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.players TO bvolante_claudecode;


--
-- Name: TABLE plays; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.plays TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.plays TO bvolante_claudecode;


--
-- Name: TABLE scouting_report_batters; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.scouting_report_batters TO bvolante_pitch_tracker;


--
-- Name: TABLE scouting_reports; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.scouting_reports TO bvolante_pitch_tracker;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.team_members TO bvolante_pitch_tracker;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.teams TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.teams TO bvolante_claudecode;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.users TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.users TO bvolante_claudecode;


--
-- PostgreSQL database dump complete
--

