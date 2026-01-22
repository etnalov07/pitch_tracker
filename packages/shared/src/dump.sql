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
    batter_id uuid NOT NULL,
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
-- Name: pitches; Type: TABLE; Schema: public; Owner: bvolante
--

CREATE TABLE public.pitches (
    id uuid NOT NULL,
    at_bat_id uuid NOT NULL,
    game_id uuid NOT NULL,
    pitcher_id uuid NOT NULL,
    batter_id uuid NOT NULL,
    pitch_number integer NOT NULL,
    pitch_type character varying(50) NOT NULL,
    velocity numeric(5,2),
    location_x numeric(5,4),
    location_y numeric(5,4),
    target_location_x numeric(5,4),
    target_location_y numeric(5,4),
    zone character varying(20),
    balls_before integer NOT NULL,
    strikes_before integer NOT NULL,
    pitch_result character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    opponent_batter_id uuid
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	10000000-0000-0000-0000-000000000001	3	3	2	1	2	strikeout	0	0	2026-01-10 22:42:15.817322	2026-01-10 19:42:15.817322	2026-01-10 22:42:15.817322	\N
50000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000003	20000000-0000-0000-0000-000000000003	10000000-0000-0000-0000-000000000001	3	1	2	0	0	single	1	0	2026-01-10 22:42:15.821927	2026-01-10 20:42:15.821927	2026-01-10 22:42:15.821927	\N
50000000-0000-0000-0000-000000000003	30000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000005	20000000-0000-0000-0000-000000000003	10000000-0000-0000-0000-000000000001	3	0	1	1	2	groundout	0	0	2026-01-10 22:42:15.825436	2026-01-10 21:42:15.825436	2026-01-10 22:42:15.825436	\N
\.


--
-- Data for Name: game_pitchers; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.game_pitchers (id, game_id, player_id, pitching_order, inning_entered, inning_exited, created_at) FROM stdin;
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.games (id, home_team_id, away_team_id, game_date, game_time, location, status, home_score, away_score, current_inning, inning_half, created_by, created_at, updated_at, opponent_name) FROM stdin;
30000000-0000-0000-0000-000000000001	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	2025-01-08	18:00:00	Central Park Field 1	completed	5	3	7	bottom	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	2026-01-10 22:42:15.814013	2026-01-10 22:42:15.814013	\N
8c590d21-9fb8-440c-8d85-629935cf0fd1	6788b680-875d-4318-8a15-cf7f1d53bb67	\N	2026-01-21	\N	The Nest	scheduled	0	0	1	top	ed70782c-33dd-4895-beff-b4c200de03fa	2026-01-20 01:22:41.419559	2026-01-20 01:22:41.419559	Test
986931b5-6a12-48dd-8823-bcac48771385	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	Premier	scheduled	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-20 22:49:57.335271	2026-01-20 22:49:57.335271	Banditos
5027db70-bf1e-455f-b4c6-cc095caa7ea5	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	Premier	scheduled	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-20 22:52:13.656632	2026-01-20 22:52:13.656632	Banditos
1c5ea882-cf3f-4dab-90f7-fc044c8cb7db	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	Premier	scheduled	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-20 22:52:46.179479	2026-01-20 22:52:46.179479	Banditos
9ad38e06-964b-48ab-94d9-494441a3b7e8	07cb5001-1965-49d5-97c6-5a5a52dc2a67	\N	2026-01-22	\N	Premier	scheduled	0	0	1	top	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	2026-01-20 23:08:48.877449	2026-01-20 23:08:48.877449	Banditos
\.


--
-- Data for Name: innings; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.innings (id, game_id, inning_number, half, batting_team_id, pitching_team_id, runs_scored, created_at, is_opponent_batting) FROM stdin;
40000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	1	top	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	0	2026-01-10 22:42:15.815611	f
40000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000001	1	bottom	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	2	2026-01-10 22:42:15.815611	f
40000000-0000-0000-0000-000000000003	30000000-0000-0000-0000-000000000001	2	top	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	1	2026-01-10 22:42:15.815611	f
40000000-0000-0000-0000-000000000004	30000000-0000-0000-0000-000000000001	2	bottom	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	1	2026-01-10 22:42:15.815611	f
40000000-0000-0000-0000-000000000005	30000000-0000-0000-0000-000000000001	3	top	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	2	2026-01-10 22:42:15.815611	f
40000000-0000-0000-0000-000000000006	30000000-0000-0000-0000-000000000001	3	bottom	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	0	2026-01-10 22:42:15.815611	f
\.


--
-- Data for Name: opponent_lineup; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.opponent_lineup (id, game_id, player_name, batting_order, "position", bats, is_starter, replaced_by_id, inning_entered, created_at) FROM stdin;
\.


--
-- Data for Name: pitches; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.pitches (id, at_bat_id, game_id, pitcher_id, batter_id, pitch_number, pitch_type, velocity, location_x, location_y, zone, balls_before, strikes_before, pitch_result, created_at, opponent_batter_id) FROM stdin;
60000000-0000-0000-0000-000000000001	50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	1	fastball	71.00	0.8000	0.6000	high_away	0	0	ball	2026-01-10 22:42:15.819675	\N
60000000-0000-0000-0000-000000000002	50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	2	curveball	59.00	0.2000	0.2000	low_inside	1	0	ball	2026-01-10 22:42:15.819675	\N
60000000-0000-0000-0000-000000000003	50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	3	fastball	73.50	0.5000	0.5000	middle_middle	2	0	called_strike	2026-01-10 22:42:15.819675	\N
60000000-0000-0000-0000-000000000004	50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	4	slider	65.00	0.1500	0.3500	low_inside	2	1	ball	2026-01-10 22:42:15.819675	\N
60000000-0000-0000-0000-000000000005	50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	5	fastball	74.00	0.6000	0.5500	middle_away	3	1	swinging_strike	2026-01-10 22:42:15.819675	\N
60000000-0000-0000-0000-000000000006	50000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	6	curveball	57.50	0.6500	0.2500	low_away	3	2	swinging_strike	2026-01-10 22:42:15.819675	\N
60000000-0000-0000-0000-000000000007	50000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	1	fastball	72.50	0.5500	0.4500	middle_middle	0	0	called_strike	2026-01-10 22:42:15.823142	\N
60000000-0000-0000-0000-000000000008	50000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	2	curveball	58.00	0.5000	0.1500	low_middle	0	1	ball	2026-01-10 22:42:15.823142	\N
60000000-0000-0000-0000-000000000009	50000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	3	fastball	73.00	0.7000	0.5000	middle_away	1	1	foul	2026-01-10 22:42:15.823142	\N
60000000-0000-0000-0000-000000000010	50000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	4	changeup	62.00	0.4500	0.4000	low_inside	1	2	in_play	2026-01-10 22:42:15.823142	\N
60000000-0000-0000-0000-000000000011	50000000-0000-0000-0000-000000000003	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	1	fastball	72.00	0.3500	0.5500	middle_inside	0	0	foul	2026-01-10 22:42:15.826525	\N
60000000-0000-0000-0000-000000000012	50000000-0000-0000-0000-000000000003	30000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000003	2	slider	64.50	0.3000	0.3500	low_inside	0	1	in_play	2026-01-10 22:42:15.826525	\N
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.players (id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws, is_active, created_at, updated_at) FROM stdin;
10000000-0000-0000-0000-000000000001	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Tommy	Martinez	7	P	R	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483
10000000-0000-0000-0000-000000000002	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Jake	Anderson	12	SS	R	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483
10000000-0000-0000-0000-000000000003	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Marcus	Williams	23	CF	L	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483
10000000-0000-0000-0000-000000000004	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Ryan	Taylor	5	3B	R	R	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483
10000000-0000-0000-0000-000000000005	d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Chris	Brown	18	1B	L	L	t	2026-01-10 22:42:15.811483	2026-01-10 22:42:15.811483
20000000-0000-0000-0000-000000000001	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	David	Johnson	21	P	R	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294
20000000-0000-0000-0000-000000000002	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Alex	Garcia	9	C	R	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294
20000000-0000-0000-0000-000000000003	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Kevin	Rodriguez	3	2B	S	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294
20000000-0000-0000-0000-000000000004	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Brandon	Miller	15	LF	L	L	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294
20000000-0000-0000-0000-000000000005	e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Tyler	Davis	8	RF	R	R	t	2026-01-10 22:42:15.81294	2026-01-10 22:42:15.81294
f0420064-7cb6-40e5-83c3-abfd8a964f49	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Volante	\N	P	L	L	t	2026-01-17 16:24:42.323021	2026-01-17 16:24:42.323021
5aadaa79-756c-4352-b039-877b6fa3652a	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Test	\N	P	L	L	t	2026-01-17 16:26:57.536401	2026-01-17 16:26:57.536401
1684189b-aa2c-4a49-b4e5-9ac55c955566	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Test	\N	P	L	L	t	2026-01-17 16:29:47.544615	2026-01-17 16:29:47.544615
a2b0f880-b9a9-4127-bd0d-4bea38b46e2e	6788b680-875d-4318-8a15-cf7f1d53bb67	Brian	Test	1	P	L	L	t	2026-01-17 16:30:05.316883	2026-01-17 16:30:05.316883
51e16641-e136-455a-80ee-4a07873b79e5	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Giovanni	Volante	22	P	R	R	t	2026-01-20 22:49:06.936248	2026-01-20 22:49:06.936248
ba572510-0315-424f-990a-73eb34c3bc65	07cb5001-1965-49d5-97c6-5a5a52dc2a67	Peter	Hebert	25	P	R	R	t	2026-01-20 22:49:26.501522	2026-01-20 22:49:26.501522
\.


--
-- Data for Name: plays; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.plays (id, pitch_id, at_bat_id, contact_type, contact_quality, hit_direction, field_location, hit_depth, hit_result, out_type, fielded_by_position, is_error, is_out, runs_scored, notes, created_at) FROM stdin;
70000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000010	50000000-0000-0000-0000-000000000002	line_drive	hard	opposite_field	right_center_gap	shallow_outfield	single	\N	RF	f	f	1	\N	2026-01-10 22:42:15.82414
70000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000012	50000000-0000-0000-0000-000000000003	ground_ball	medium	pull_side	infield_left	infield	\N	groundout	3B	f	t	0	\N	2026-01-10 22:42:15.83381
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: bvolante
--

COPY public.teams (id, name, owner_id, organization, age_group, season, created_at, updated_at) FROM stdin;
d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44	Wildcats	a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279
e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55	Thunder	b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279
f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66	Lightning	c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33	Metro Baseball League	12U	Spring 2025	2026-01-10 22:42:15.809279	2026-01-10 22:42:15.809279
6788b680-875d-4318-8a15-cf7f1d53bb67	Bombers	ed70782c-33dd-4895-beff-b4c200de03fa	\N	\N	\N	2026-01-17 16:09:13.541125	2026-01-17 16:09:13.541125
07cb5001-1965-49d5-97c6-5a5a52dc2a67	Wildcatters	b79c9ec0-dab5-407b-87cf-e5d39ac5121f	\N	\N	\N	2026-01-20 22:48:54.247903	2026-01-20 22:48:54.247903
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
\.


--
-- Name: at_bats at_bats_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.at_bats
    ADD CONSTRAINT at_bats_pkey PRIMARY KEY (id);


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
-- Name: opponent_lineup opponent_lineup_pkey; Type: CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup
    ADD CONSTRAINT opponent_lineup_pkey PRIMARY KEY (id);


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
-- Name: idx_opponent_lineup_batting_order; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opponent_lineup_batting_order ON public.opponent_lineup USING btree (game_id, batting_order);


--
-- Name: idx_opponent_lineup_game; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_opponent_lineup_game ON public.opponent_lineup USING btree (game_id);


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
-- Name: idx_plays_at_bat; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_plays_at_bat ON public.plays USING btree (at_bat_id);


--
-- Name: idx_plays_pitch; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_plays_pitch ON public.plays USING btree (pitch_id);


--
-- Name: idx_teams_owner; Type: INDEX; Schema: public; Owner: bvolante
--

CREATE INDEX idx_teams_owner ON public.teams USING btree (owner_id);


--
-- Name: games update_games_updated_at; Type: TRIGGER; Schema: public; Owner: bvolante
--

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


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
-- Name: opponent_lineup opponent_lineup_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup
    ADD CONSTRAINT opponent_lineup_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: opponent_lineup opponent_lineup_replaced_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.opponent_lineup
    ADD CONSTRAINT opponent_lineup_replaced_by_id_fkey FOREIGN KEY (replaced_by_id) REFERENCES public.opponent_lineup(id) ON DELETE SET NULL;


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
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bvolante
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: TABLE at_bats; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.at_bats TO bvolante_pitch_tracker;


--
-- Name: TABLE games; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.games TO bvolante_pitch_tracker;


--
-- Name: TABLE innings; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.innings TO bvolante_pitch_tracker;


--
-- Name: TABLE pitches; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.pitches TO bvolante_pitch_tracker;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.players TO bvolante_pitch_tracker;


--
-- Name: TABLE plays; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.plays TO bvolante_pitch_tracker;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.teams TO bvolante_pitch_tracker;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: bvolante
--

GRANT ALL ON TABLE public.users TO bvolante_pitch_tracker;


--
-- PostgreSQL database dump complete
--

