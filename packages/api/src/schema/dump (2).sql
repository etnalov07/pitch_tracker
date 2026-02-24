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
    CONSTRAINT opponent_lineup_batting_order_check CHECK (((batting_order >= 1) AND (batting_order <= 9)))
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
    target_location_y numeric(5,4)
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
    organization_id uuid
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
adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2	1	1	walk	0	0	2026-02-02 20:38:07.300944	\N	2026-02-02 20:38:07.300944	fe099dde-7555-47ae-b3ec-72120f6b4fda
c9c11c3f-f0eb-43b0-a977-617d57bc9338	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	1	1	2	popout	0	0	2026-02-02 20:40:00.946706	\N	2026-02-02 20:40:00.946706	be9d483f-4d8c-4104-9e50-f4cbbb36e0b6
8ecf4e87-05af-435e-81e5-69bfc21ae40b	e05c3902-4c93-411a-b119-369cc8294fa4	b093a5a1-1d83-4c58-b780-113711e1f872	\N	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	0	0	2	2	\N	0	0	2026-02-02 20:41:58.565393	\N	2026-02-02 20:41:58.565393	1f17134b-d9fa-4559-aae0-c2d3cbfc6fb5
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
\.


--
-- Data for Name: batter_tendencies; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.batter_tendencies (id, profile_id, total_pitches_seen, total_at_bats, pitches_outside_zone, swings_outside_zone, chase_rate, pitches_inside_zone, takes_inside_zone, watch_rate, early_count_pitches, early_count_swings, early_count_rate, first_pitches, first_pitch_takes, first_pitch_take_rate, breaking_outside, breaking_outside_swings, breaking_chase_rate, zone_tendencies, last_calculated_at, is_stale, created_at, updated_at) FROM stdin;
f38861e6-3ae9-49c1-b9a0-5a4a268d972e	ee4a8fe1-aaa9-45a2-99b2-6e5de1ef9fac	11	2	3	0	0.0000	8	5	0.6250	4	0	0.0000	2	2	1.0000	1	0	0.0000	{"BL": {"count": 1, "swing_rate": 1}, "BR": {"count": 1, "swing_rate": 0}, "ML": {"count": 2, "swing_rate": 0.5}, "MR": {"count": 1, "swing_rate": 0}, "OR": {"count": 2, "swing_rate": 0}, "OT": {"count": 1, "swing_rate": 0}, "TL": {"count": 1, "swing_rate": 0}, "TM": {"count": 1, "swing_rate": 1}, "TR": {"count": 1, "swing_rate": 0}}	2026-01-23 22:47:28.912398	f	2026-01-23 22:47:28.912398	2026-01-23 22:47:28.912398
a987dc3b-fcf1-4ecb-a009-b65b13c718f3	302c95c4-6f33-42a4-bda0-24dcef061867	4	1	2	1	0.5000	2	1	0.5000	2	0	0.0000	1	1	1.0000	2	1	0.5000	{"ML": {"count": 1, "swing_rate": 1}, "MR": {"count": 1, "swing_rate": 0}, "OL": {"count": 1, "swing_rate": 1}, "OR": {"count": 1, "swing_rate": 0}}	2026-01-27 22:13:24.550025	t	2026-01-27 22:13:24.550025	2026-01-27 22:13:59.273242
eacced56-83e5-48d5-b816-b41995e00ce6	1ef42cd1-9e16-4f1d-8f31-dc753ce2c460	31	11	9	3	0.3333	22	9	0.4091	18	9	0.5000	11	4	0.3636	2	1	0.5000	{"BL": {"count": 1, "swing_rate": 0}, "BM": {"count": 1, "swing_rate": 0}, "BR": {"count": 3, "swing_rate": 0.3333333333333333}, "ML": {"count": 2, "swing_rate": 1}, "MM": {"count": 1, "swing_rate": 1}, "MR": {"count": 5, "swing_rate": 0.4}, "OL": {"count": 4, "swing_rate": 0.25}, "OR": {"count": 5, "swing_rate": 0.4}, "TL": {"count": 1, "swing_rate": 1}, "TM": {"count": 3, "swing_rate": 0.6666666666666666}, "TR": {"count": 5, "swing_rate": 0.8}}	2026-01-31 19:43:01.910485	t	2026-01-31 19:43:01.910485	2026-01-31 19:43:12.812912
\.


--
-- Data for Name: game_pitchers; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.game_pitchers (id, game_id, player_id, pitching_order, inning_entered, inning_exited, created_at) FROM stdin;
b1d4c5b2-08ad-4d3a-b177-1e780e50d724	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	1	1	\N	2026-01-20 23:37:21.374233
ffa6fd94-0cff-4edf-ac29-9c82d29b9234	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	1	1	\N	2026-01-21 00:17:04.03196
6c6ddc05-29cd-4f22-91c4-1544e0503237	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	1	1	\N	2026-02-02 19:53:03.035969
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.games (id, home_team_id, away_team_id, game_date, game_time, location, status, home_score, away_score, current_inning, inning_half, created_by, created_at, updated_at, opponent_name) FROM stdin;
e233efaa-5749-4c7f-9647-2db19d4a9f0b	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	GIants Field	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-20 23:36:47.674019	2026-01-23 22:09:14.923976	Stars
634fd53a-11f5-415e-88d9-db923f545bad	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	\N	in_progress	2	0	5	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-21 00:14:48.722113	2026-01-31 19:42:50.790059	Test
e05c3902-4c93-411a-b119-369cc8294fa4	0afb754c-95f0-4296-96f8-528cc689f0d7	\N	2026-02-04	\N	AHS	completed	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-02-02 19:51:58.748617	2026-02-02 20:42:02.536755	Klein cain
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
\.


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.invites (id, token, team_id, player_id, invited_by, invited_email, role, status, expires_at, accepted_by, accepted_at, created_at) FROM stdin;
\.


--
-- Data for Name: join_requests; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.join_requests (id, team_id, user_id, message, status, reviewed_by, linked_player_id, reviewed_at, created_at) FROM stdin;
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
\.


--
-- Data for Name: opponent_lineup_profiles; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.opponent_lineup_profiles (opponent_lineup_id, profile_id) FROM stdin;
a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	302c95c4-6f33-42a4-bda0-24dcef061867
e3afda0f-473b-4aa5-85f4-9b652c492a80	ee4a8fe1-aaa9-45a2-99b2-6e5de1ef9fac
cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1ef42cd1-9e16-4f1d-8f31-dc753ce2c460
f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	d3a05c7e-09ad-4661-8f85-130e0a5f2dde
b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	a113e999-0a4e-48f3-bac2-afbcf3e099cb
fe099dde-7555-47ae-b3ec-72120f6b4fda	a90c1c38-4c98-4b41-a844-afef236c0c5f
be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	da739c62-903d-4ee7-8f1c-904fe556a94d
1f17134b-d9fa-4559-aae0-c2d3cbfc6fb5	76ef4460-5f00-4651-b19d-b0b1e0492e1c
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
\.


--
-- Data for Name: pitches; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.pitches (id, at_bat_id, game_id, pitcher_id, batter_id, pitch_number, pitch_type, velocity, location_x, location_y, zone, balls_before, strikes_before, pitch_result, created_at, opponent_batter_id, target_location_x, target_location_y) FROM stdin;
a95bc341-0802-42de-ada4-d9f77096447a	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	81.00	0.8000	0.7358	\N	0	0	called_strike	2026-01-20 23:56:48.602163	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N
eec96e21-2974-4c92-a548-b7877c4ee3ec	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	cutter	78.00	0.8075	0.5025	\N	0	1	ball	2026-01-20 23:57:11.023028	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N
02557d84-c82d-41fc-8ab8-787bddd7585d	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	curveball	71.00	0.0625	0.2625	\N	1	1	ball	2026-01-20 23:57:31.903447	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N
6b87f2c8-ba81-40a0-b913-78b6317ae48c	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	84.00	0.2450	0.5783	\N	2	1	swinging_strike	2026-01-20 23:57:54.085391	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N
f6c7ff6c-bced-4f6e-8d45-7eadfb7e0415	ef2fd27e-b4ce-4cd8-b6af-981bc1a8e14f	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	changeup	74.00	0.6650	0.7375	\N	2	2	swinging_strike	2026-01-20 23:58:14.053389	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	\N	\N
f51d4e46-38c1-41d4-b345-779994df05f2	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	81.00	0.8009	0.3948	\N	0	0	called_strike	2026-01-21 00:23:52.927621	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N
23350331-e4ab-43e4-ba37-3968a42051a1	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	2-seam	84.00	0.2112	0.5571	\N	0	1	called_strike	2026-01-21 00:24:09.953055	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N
7bc6e77d-a9c8-4e08-969a-01231801bf51	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	curveball	71.00	0.8060	0.7219	\N	0	2	ball	2026-01-21 00:24:40.127845	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N
2ffe2b16-2a7c-45fe-bbe9-592bcf7dddb7	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	curveball	72.00	0.6695	0.8172	\N	1	2	foul	2026-01-21 00:24:53.146365	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N
e13aa9dd-cea3-4ec1-b0a0-91839bb7878c	69d2c875-7fa4-4921-987a-ec85126d77c5	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	4-seam	83.00	0.2034	0.1914	\N	1	2	swinging_strike	2026-01-21 00:25:07.554962	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N
df8f0b6e-b6ac-4480-9469-5cf1ee3a12dd	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	82.00	0.7983	0.6283	\N	0	0	called_strike	2026-01-21 00:30:56.989892	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
dec8ab33-82ad-4bc0-abfa-f8753b0a7bfa	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	curveball	73.00	0.8395	0.7725	\N	0	1	ball	2026-01-21 00:31:17.250256	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
70b0c40f-27a2-440f-ae31-a76b6bc13bf5	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	4-seam	82.00	0.1803	0.2163	\N	1	1	ball	2026-01-21 00:31:26.318093	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
20c14864-1f36-47e1-b90a-6835e510f764	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	83.00	0.1880	0.7622	\N	2	1	swinging_strike	2026-01-21 00:31:44.573249	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
b4b240ff-1649-45ad-bf9f-93ffed22a875	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	2-seam	81.00	0.8549	0.1416	\N	2	2	ball	2026-01-21 00:31:56.67838	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
967c711b-c6aa-4458-9fa1-a31e34ef6188	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	6	changeup	73.00	0.4120	0.8060	\N	3	2	foul	2026-01-21 00:32:08.538923	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
d9646f79-2f47-43f9-8242-a3e1e4ce6d6c	35291c95-f2f5-45a5-946f-a0d960171f8a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	7	4-seam	83.00	0.5768	0.1365	\N	3	2	ball	2026-01-21 00:32:21.775393	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
9abe2c06-d023-453c-8746-5ce032bc8c13	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	changeup	71.00	0.7957	0.5871	\N	0	0	in_play	2026-01-21 00:47:29.404909	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
63a4a5fa-ed41-415f-9cae-6a0c56c6b7a4	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	changeup	\N	0.3399	0.3966	\N	0	0	in_play	2026-01-21 00:47:31.424441	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
4ebbcbfc-eebe-4ab2-bb2b-2488a410aca5	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	changeup	\N	0.7906	0.3657	\N	0	0	called_strike	2026-01-21 00:47:36.334382	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
46a6a955-6b14-4db2-bc80-d8755f2d04f7	e7bd9384-cb68-49e8-b9f5-402d949f3dd9	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	changeup	\N	0.3399	0.7030	\N	0	1	called_strike	2026-01-21 00:47:39.671779	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
8026d077-4a9f-4fa0-9dd3-0074891bc6c5	fa85d054-2cff-424c-9d38-ea6cf07feff0	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	changeup	81.00	0.6412	0.7219	\N	0	0	in_play	2026-01-21 22:45:29.644101	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
dd6723ba-81db-48a4-a3cc-c9bd3ff09ef5	be2b9521-7b69-4ce2-b8f8-485a98840cdd	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	72.00	0.2781	0.6378	\N	0	0	in_play	2026-01-21 22:46:06.007565	d687b69b-cbbe-4122-af75-7e786a1cf1a7	\N	\N
f9478b1a-c366-47e9-a473-5f281e26a33a	2a32c6d7-7fb3-4e67-8dd1-106372114976	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	72.00	0.7236	0.7399	\N	0	0	in_play	2026-01-21 22:53:03.906341	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
b4db104d-7cdb-4679-a464-60d50bf78a1f	a80440ad-acb9-4d95-8ece-1401fd21db99	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.7262	0.6318	\N	0	0	in_play	2026-01-21 22:53:44.030462	d687b69b-cbbe-4122-af75-7e786a1cf1a7	\N	\N
b8df84e8-dd44-4c26-8ca8-32fb25cb53fc	23ce0076-952d-47bd-afc8-4cf86e6d2dfc	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	1.2835	0.1105	\N	0	0	ball	2026-01-22 00:02:06.252191	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
bd1b6e4b-976d-4f42-a6a7-74b599d65ab3	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	-0.0022	0.8190	\N	0	0	called_strike	2026-01-22 00:02:37.472992	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
4eada657-b235-4b08-a409-74dd3ab3c367	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	2-seam	\N	1.0923	0.3962	\N	0	1	ball	2026-01-22 00:04:51.791917	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
7ad307b7-58ef-4f61-ad61-c3efa788b75c	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2-seam	\N	1.1055	0.7962	\N	1	1	swinging_strike	2026-01-22 00:05:05.19271	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
163dea43-3fd9-4646-99f1-90c329958d5b	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	\N	-0.1407	0.4476	\N	1	2	ball	2026-01-22 00:05:26.033503	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
6c3b2692-089c-4d29-923a-95ddec22c9e6	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	4-seam	\N	1.1978	0.1448	\N	2	2	ball	2026-01-22 00:13:26.361181	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	\N	\N
67a7af24-0dc8-437a-900d-d5996c34c3b1	ccbea7ed-3b1f-4803-accc-bccad51210f6	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	6	4-seam	\N	0.8813	0.9162	\N	3	2	in_play	2026-01-22 00:14:26.664301	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.8813	0.8990
a8376b61-bb98-4d31-90bd-dab0a56e0591	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.9186	0.5003	\N	0	0	swinging_strike	2026-01-22 22:48:20.249606	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0589	0.2976
5d066025-0a36-4980-93ed-47e4c258e62b	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	4-seam	84.00	1.0744	0.3247	\N	0	1	swinging_strike	2026-01-22 22:48:39.800517	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0978	0.2909
9e6e41f5-364b-4a04-ab44-3304de7d15dd	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	changeup	74.00	-0.0714	0.8719	\N	0	2	ball	2026-01-22 22:48:58.486403	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	-0.1649	0.8989
30c63384-b54b-4577-a0bc-bbe6908d7bd4	217e0a8f-9b18-4baf-9448-877345e298d7	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	curveball	73.00	0.8562	0.9394	\N	1	2	swinging_strike	2026-01-22 22:49:19.230178	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.8874	0.9394
457e0852-a099-45ef-b0d4-8b37ef8d1782	f9a58a1f-20d0-47f8-ad12-56a29941cf78	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	78.00	-0.0217	0.6418	\N	0	0	swinging_strike	2026-01-22 22:51:06.897092	d687b69b-cbbe-4122-af75-7e786a1cf1a7	-0.0139	0.7848
f909bf68-4a6a-4157-9f6a-19e828dfe34f	476dabaa-1b9c-4def-bfce-980d6ac71f92	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	89.00	0.8945	0.0781	\N	0	0	foul	2026-01-22 23:13:32.532949	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.9604	0.0724
6671b4f1-2eff-4008-be8c-13c09af1f849	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	81.00	0.9865	0.3925	\N	0	0	called_strike	2026-01-22 23:44:15.091977	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	1.0400	0.2361
9b19853d-c36f-4457-846e-34f3a837e289	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	curveball	73.00	1.0400	0.9540	\N	0	1	ball	2026-01-22 23:44:29.635245	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	1.0600	1.0177
c6c43505-46c0-4bf7-b4c8-06c5272f71bc	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2-seam	80.00	0.0313	0.4967	\N	1	1	swinging_strike	2026-01-22 23:44:47.613432	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	0.0046	0.5024
36a58776-f869-40a0-a6b0-4fed5124cd3c	a9e294fb-5e2b-464d-a676-3252b7d6cebe	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	changeup	\N	-0.0556	0.9598	\N	1	2	swinging_strike	2026-01-22 23:45:00.927941	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	\N	\N
ba11253e-1b3f-44c0-9e5b-de798df0a82c	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	-0.1290	0.8614	\N	0	0	called_strike	2026-01-22 23:51:31.745133	d687b69b-cbbe-4122-af75-7e786a1cf1a7	\N	\N
30f24229-181a-47d9-84ed-38585fdd0363	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	changeup	\N	1.0533	0.4851	\N	0	1	swinging_strike	2026-01-22 23:51:43.323073	d687b69b-cbbe-4122-af75-7e786a1cf1a7	1.1535	0.4967
0f00f593-ea3b-466f-b929-2a3c79ade227	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	curveball	\N	0.1582	0.6935	\N	0	2	foul	2026-01-22 23:51:55.660895	d687b69b-cbbe-4122-af75-7e786a1cf1a7	0.5924	0.9482
1cf5d693-25f8-4840-9b5c-619b4c9aa21b	dd826bb6-f9cd-422d-b7af-319b150dcacf	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	4-seam	\N	0.9799	0.8961	\N	0	2	swinging_strike	2026-01-22 23:52:04.34257	d687b69b-cbbe-4122-af75-7e786a1cf1a7	1.0133	0.9077
7392bca9-bbc5-46b8-862f-7d3ce2997fb3	b51af127-cf10-4489-bd45-64d00926b7a8	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	82.00	0.9682	0.6115	\N	0	0	called_strike	2026-01-23 11:54:54.217344	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0671	0.8800
3f082bed-2262-4d11-b187-7851a57dcbfe	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	curveball	73.00	0.9089	0.8800	\N	0	0	swinging_strike	2026-01-23 15:12:48.962557	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.9682	0.9143
ed5ddb2a-02ef-4670-807e-83cf8163e03c	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	4-seam	82.00	0.9682	0.0057	\N	0	1	ball	2026-01-23 15:13:15.45587	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.9419	0.0057
791be1d3-c81e-4f73-a69a-0399e59cbe79	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	changeup	\N	-0.0669	0.9371	\N	1	1	swinging_strike	2026-01-23 15:13:28.689644	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	-0.0669	0.8571
1bf7273a-a973-4a3b-8efb-e421cd09c12e	a43a7224-a389-4482-965e-7dd9108e7e85	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	2-seam	\N	0.2957	0.5943	\N	1	2	swinging_strike	2026-01-23 15:13:38.047761	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.2100	0.6057
691e3019-b2c6-4600-ac71-bbeff1411f21	7e09826d-ada8-47de-9efd-c4d2db0f7177	e233efaa-5749-4c7f-9647-2db19d4a9f0b	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	-0.0076	0.4914	\N	0	0	called_strike	2026-01-23 22:09:10.242321	3d9b8c8f-3652-4e5f-8a6a-5556285445fe	0.0122	0.5600
fd93b451-0bd5-48a3-99e5-de213c7521fb	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	\N	1.0561	0.6362	\N	0	0	ball	2026-01-23 22:43:49.610198	e3afda0f-473b-4aa5-85f4-9b652c492a80	1.0561	0.6362
2a1fc52e-304f-4e12-895c-3a19681082d2	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	2	2-seam	\N	1.0759	0.9048	\N	1	0	ball	2026-01-23 22:43:57.982053	e3afda0f-473b-4aa5-85f4-9b652c492a80	1.0759	0.9048
01b1c0ea-966c-4c19-9929-4d3551d277b0	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	3	2-seam	\N	0.0078	0.5962	\N	2	0	swinging_strike	2026-01-23 22:44:06.471131	e3afda0f-473b-4aa5-85f4-9b652c492a80	0.0078	0.5962
b688f48a-90d8-4bdb-889c-cff2c5798e6c	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	4	curveball	\N	0.9704	1.0248	\N	2	1	ball	2026-01-23 22:44:15.715813	e3afda0f-473b-4aa5-85f4-9b652c492a80	1.0759	0.9962
5034a5fe-b5db-4bce-a2cf-1e81e18b2952	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	5	4-seam	\N	0.9308	0.0819	\N	3	1	called_strike	2026-01-23 22:44:28.266615	e3afda0f-473b-4aa5-85f4-9b652c492a80	0.9638	0.0648
ac7b41fa-c616-4228-a92f-6071e95cd65e	2af2c302-ffea-4d7b-a686-ce7a82674b71	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	6	changeup	\N	0.0012	0.8933	\N	3	2	called_strike	2026-01-23 22:44:36.484222	e3afda0f-473b-4aa5-85f4-9b652c492a80	\N	\N
e9be608a-4b14-48d6-a9f0-010d21123e64	b3b82072-0219-4544-9aa6-0863f6360576	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	0.0473	0.5619	\N	0	0	in_play	2026-01-23 22:44:53.294087	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	0.0473	0.5619
7adef1f0-2728-4e00-a200-37959665e6be	a0938b80-5e21-40a3-846c-a421f9d6a31e	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	2-seam	83.00	1.0045	0.1840	\N	0	0	called_strike	2026-01-27 22:13:59.267969	a5067b10-06a5-4fe7-aa8e-3f105f1c2a92	1.0440	0.1726
09b8fee0-bc12-4d8f-a41b-32361f7d2f4c	45bf3f90-d4ec-46d1-b7ab-f5c0628f295a	634fd53a-11f5-415e-88d9-db923f545bad	51e16641-e136-455a-80ee-4a07873b79e5	\N	1	4-seam	\N	1.0736	0.6800	\N	0	0	called_strike	2026-01-31 19:43:12.806964	cabfb8c4-99a8-4882-8eac-6827b6cec2f7	1.0736	0.7257
1c531ce7-ea8e-4f08-af35-4c44f8ada824	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	4-seam	\N	1.0143	0.7486	\N	0	0	ball	2026-02-02 20:34:21.969279	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	1.1066	0.7715
91d68130-0c79-4745-af3e-63064143aaa7	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	4-seam	\N	-0.0868	0.0572	\N	1	0	ball	2026-02-02 20:34:38.086398	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	-0.0538	0.6457
9af7d88c-0de7-49a9-a489-26245d57df23	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	-0.1527	0.4743	\N	2	0	ball	2026-02-02 20:34:50.923186	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	-0.1659	0.5143
4ae03fdc-76fe-491d-9846-82ca0b09db99	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2-seam	\N	-0.0209	0.5715	\N	3	0	called_strike	2026-02-02 20:35:05.772071	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	0.0516	0.5372
4fa76cb5-bcd0-48a4-971b-2e30d9d99fc7	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	4-seam	\N	0.4802	0.6172	\N	3	1	called_strike	2026-02-02 20:35:19.676726	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	\N	\N
6351a3fe-129c-4121-a008-2b153fe82f35	2da12bf6-f2e4-4bd8-8097-a4eadbcba9bf	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	curveball	\N	0.5462	1.0458	\N	3	2	ball	2026-02-02 20:35:40.218664	f14afbf2-c91b-4ba3-8523-ce1bd84c0ba1	0.5198	1.0229
82e23169-f5bf-40ce-9948-fcf4950ab114	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	0.2033	1.0400	\N	0	0	ball	2026-02-02 20:36:21.600994	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	0.2099	1.0286
0022e843-9e8c-4369-a134-745db80ee1ed	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	4-seam	\N	-0.1396	0.5086	\N	1	0	ball	2026-02-02 20:36:48.324235	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	-0.1527	0.5143
8ac0f712-fbfa-41f7-aaf2-ea9c892c3011	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	4-seam	\N	0.3549	0.6457	\N	2	0	swinging_strike	2026-02-02 20:37:05.429656	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	\N	\N
f9d4b36a-8491-4cf7-b96f-a38127da3117	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	2-seam	\N	0.0451	0.6229	\N	2	1	foul	2026-02-02 20:37:28.955555	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	0.0253	0.5886
994cc8e7-ff2e-4625-a08b-d0013f4419ce	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	2-seam	\N	0.5462	-0.0457	\N	2	2	ball	2026-02-02 20:37:48.290233	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	0.5659	-0.0286
66452201-4a1d-4d3f-8469-312f6ea81dc7	f0d492e5-642b-4cb4-897a-e08109207ea4	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	2-seam	\N	1.0077	0.5257	\N	3	2	called_strike	2026-02-02 20:38:06.994917	b3c0e64a-25f1-4c9b-bb91-2bbebe11d628	1.0538	0.4743
daa61eae-7779-4677-b932-8b6b861e5122	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	changeup	\N	-0.1330	0.6057	\N	0	0	ball	2026-02-02 20:38:37.726711	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0055	0.5715
3340ac15-94a8-4784-b6d9-a89827fe0c7e	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	1.0077	0.5600	\N	1	0	called_strike	2026-02-02 20:38:53.247775	fe099dde-7555-47ae-b3ec-72120f6b4fda	1.0868	0.5486
c81c5b90-a764-4480-b6fd-d8a37e914848	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	3	2-seam	\N	0.9945	0.8686	\N	1	1	ball	2026-02-02 20:39:09.437246	fe099dde-7555-47ae-b3ec-72120f6b4fda	-0.1000	0.8515
42bae4b0-dd9f-4b10-a496-dbda92ce0866	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	4	changeup	\N	-0.0077	0.6629	\N	2	1	foul	2026-02-02 20:39:26.589729	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0121	0.6115
c9aea824-e008-4cad-9c10-a7d0353c1fa5	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	5	changeup	\N	-0.0473	1.0058	\N	2	2	ball	2026-02-02 20:39:43.834338	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0319	0.8000
990d3e0e-31c4-4eec-9046-2a8f528e0d8d	adf5e638-4db2-4fb4-8fee-bf427b0f8e54	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	6	changeup	\N	-0.0341	0.0343	\N	3	2	ball	2026-02-02 20:40:00.664584	fe099dde-7555-47ae-b3ec-72120f6b4fda	0.0055	0.4343
cf0aa97d-8bbe-4c8b-aaf4-507b3cb6b6e6	c9c11c3f-f0eb-43b0-a977-617d57bc9338	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	1	curveball	\N	0.0451	0.4572	\N	0	0	ball	2026-02-02 20:40:47.702419	be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	0.2165	0.3257
c63d012b-a086-4cd4-8e16-1b1703f79f40	c9c11c3f-f0eb-43b0-a977-617d57bc9338	e05c3902-4c93-411a-b119-369cc8294fa4	ee6b9172-c188-4d42-a1a8-096635d2c6cc	\N	2	2-seam	\N	0.0648	0.5372	\N	1	0	called_strike	2026-02-02 20:41:19.85852	be9d483f-4d8c-4104-9e50-f4cbbb36e0b6	\N	\N
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
\.


--
-- Data for Name: plays; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.plays (id, pitch_id, at_bat_id, contact_type, contact_quality, hit_direction, field_location, hit_depth, hit_result, out_type, fielded_by_position, is_error, is_out, runs_scored, notes, created_at) FROM stdin;
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
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.teams (id, name, owner_id, organization, age_group, season, created_at, updated_at, logo_path, primary_color, secondary_color, accent_color, organization_id) FROM stdin;
d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Wildcats	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279	\N	#3b82f6	#1f2937	#22c55e	\N
e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Thunder	b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279	\N	#3b82f6	#1f2937	#22c55e	\N
f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66	Lightning	c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279	\N	#3b82f6	#1f2937	#22c55e	\N
6788b680-875d-4318-8a15-cf7f1d53bb67	Bombers	ed70782c-33dd-4895-beff-b4c200de03fa	\N	\N	\N	2026-01-17 16:09:13.541125	2026-01-17 16:09:13.541125	\N	#3b82f6	#1f2937	#22c55e	\N
07cb5001-1965-49d5-97c6-5a5a52dc2a67	Wildcatters	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	\N	\N	\N	2026-01-20 22:48:54.247903	2026-01-24 00:23:20.646842	\N	#f59e0b	#083f8c	#FFFFFF	\N
0afb754c-95f0-4296-96f8-528cc689f0d7	Atascocita JV	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	\N	\N	\N	2026-02-02 19:50:54.867045	2026-02-02 19:50:54.867045	\N	#3b82f6	#1f2937	#22c55e	\N
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
\.


--
-- Name: at_bats at_bats_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_pkey PRIMARY KEY (id);


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
-- Name: game_pitchers game_pitchers_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.game_pitchers
    ADD CONSTRAINT game_pitchers_pkey PRIMARY KEY (id);


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
-- Name: idx_opponent_lineup_batting_order; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opponent_lineup_batting_order ON public.opponent_lineup USING btree (game_id, batting_order);


--
-- Name: idx_opponent_lineup_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opponent_lineup_game ON public.opponent_lineup USING btree (game_id);


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
-- Name: idx_tendencies_profile; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_tendencies_profile ON public.batter_tendencies USING btree (profile_id);


--
-- Name: idx_tendencies_stale; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_tendencies_stale ON public.batter_tendencies USING btree (is_stale) WHERE (is_stale = true);


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
-- Name: TABLE game_pitchers; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.game_pitchers TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.game_pitchers TO bvolante_claudecode;


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
-- Name: TABLE opponent_lineup; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.opponent_lineup TO bvolante_pitch_tracker;
GRANT ALL ON TABLE public.opponent_lineup TO bvolante_claudecode;


--
-- Name: TABLE opponent_lineup_profiles; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.opponent_lineup_profiles TO bvolante_pitch_tracker;


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

