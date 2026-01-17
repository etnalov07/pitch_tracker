// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    updated_at?: string;
}

export interface UserWithPassword extends User {
    password_hash: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface JWTPayload {
    id: string;
    email: string;
}

// ============================================================================
// Team Types
// ============================================================================

export interface Team {
    id: string;
    name: string;
    owner_id: string;
    abbreviation?: string;
    city?: string;
    organization?: string;
    age_group?: string;
    season?: string;
    created_at: string;
    updated_at?: string;
}

export interface TeamWithPlayers extends Team {
    players: Player[];
}

// ============================================================================
// Player Types
// ============================================================================

export type PlayerPosition = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'UTIL';

export type HandednessType = 'R' | 'L' | 'S';

export type ThrowingHand = 'R' | 'L';

export interface Player {
    id: string;
    team_id: string;
    first_name: string;
    last_name: string;
    jersey_number?: number;
    primary_position: PlayerPosition;
    bats: HandednessType;
    throws: ThrowingHand;
    is_active?: boolean;
    created_at: string;
    updated_at?: string;
}

// ============================================================================
// Game Types
// ============================================================================

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InningHalf = 'top' | 'bottom';

export interface Game {
    id: string;
    home_team_id: string;
    away_team_id: string;
    game_date: string;
    game_time?: string;
    location?: string;
    status: GameStatus;
    home_score: number;
    away_score: number;
    current_inning: number;
    inning_half: InningHalf;
    created_by: string;
    created_at: string;
    updated_at?: string;
}

export interface GameWithTeams extends Game {
    home_team: Team;
    away_team: Team;
}

// ============================================================================
// Inning Types
// ============================================================================

export interface Inning {
    id: string;
    game_id: string;
    inning_number: number;
    half: InningHalf;
    batting_team_id: string;
    pitching_team_id: string;
    runs_scored: number;
    hits?: number;
    errors?: number;
    created_at: string;
}

// ============================================================================
// At-Bat Types
// ============================================================================

export interface AtBat {
    id: string;
    game_id: string;
    inning_id: string;
    batter_id: string;
    pitcher_id: string;
    batting_order?: number;
    balls: number;
    strikes: number;
    outs_before: number;
    outs_after: number;
    result?: string;
    rbi: number;
    runs_scored: number;
    ab_start_time: string;
    ab_end_time?: string;
    created_at: string;
}

export interface AtBatWithPitches extends AtBat {
    pitches: Pitch[];
    play?: Play;
}

// ============================================================================
// Pitch Types
// ============================================================================

export type PitchType =
    | 'fastball'
    | '2-seam'
    | '4-seam'
    | 'cutter'
    | 'sinker'
    | 'slider'
    | 'curveball'
    | 'changeup'
    | 'splitter'
    | 'knuckleball'
    | 'screwball'
    | 'other';

export type PitchResult = 'ball' | 'called_strike' | 'swinging_strike' | 'foul' | 'in_play' | 'hit_by_pitch';

export interface Pitch {
    id: string;
    at_bat_id: string;
    game_id: string;
    pitcher_id: string;
    batter_id: string;
    pitch_number: number;
    pitch_type: PitchType;
    velocity?: number;
    location_x?: number;
    location_y?: number;
    zone?: string;
    balls_before: number;
    strikes_before: number;
    pitch_result: PitchResult;
    created_at: string;
}

// ============================================================================
// Play Types (Ball in Play)
// ============================================================================

export type ContactType = 'ground_ball' | 'fly_ball' | 'line_drive' | 'pop_up' | 'bunt';
export type ContactQuality = 'hard' | 'medium' | 'soft' | 'weak';
export type HitDirection = 'pull_side' | 'center' | 'opposite_field';
export type FieldLocation =
    | 'left_field_line'
    | 'left_center_gap'
    | 'center_field'
    | 'right_center_gap'
    | 'right_field_line'
    | 'infield_left'
    | 'infield_center'
    | 'infield_right';
export type HitDepth = 'infield' | 'shallow_outfield' | 'medium_outfield' | 'deep_outfield' | 'warning_track';
export type HitResult = 'single' | 'double' | 'triple' | 'home_run';
export type OutType =
    | 'groundout'
    | 'flyout'
    | 'lineout'
    | 'popout'
    | 'double_play'
    | 'triple_play'
    | 'fielders_choice'
    | 'force_out'
    | 'tag_out'
    | 'caught_stealing';

export interface Play {
    id: string;
    pitch_id: string;
    at_bat_id: string;
    contact_type: ContactType;
    contact_quality?: ContactQuality;
    hit_direction?: HitDirection;
    field_location?: FieldLocation;
    hit_depth?: HitDepth;
    hit_result?: HitResult;
    out_type?: OutType;
    fielded_by_position?: PlayerPosition;
    is_error: boolean;
    is_out: boolean;
    runs_scored: number;
    notes?: string;
    created_at: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface BatterStats {
    total_abs: number;
    hits: number;
    strikeouts: number;
    walks: number;
    batting_average: number;
}

export interface BatterHistory {
    batter_id: string;
    batter_name: string;
    pitcher_id?: string;
    pitcher_name?: string;
    at_bats: AtBatWithPitches[];
    stats: BatterStats;
}

export interface PitchLocationData {
    location_x: number;
    location_y: number;
    pitch_type: PitchType;
    pitch_result: PitchResult;
    velocity?: number;
}

export interface PitchLocationHeatMap {
    batter_id: string;
    pitcher_id?: string;
    zones: {
        [zone: string]: {
            count: number;
            swings: number;
            hits: number;
            avg: number;
        };
    };
}

export interface SprayChartData {
    field_location: FieldLocation;
    contact_quality: ContactQuality;
    hit_result?: HitResult;
    count: number;
}

export interface SprayChart {
    batter_id: string;
    plays: Play[];
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
    data?: T;
    message?: string;
    error?: string;
}

export interface TeamsResponse {
    teams: Team[];
}

export interface TeamResponse {
    team: Team;
    message?: string;
}

export interface PlayersResponse {
    players: Player[];
}

export interface PlayerResponse {
    player: Player;
    message?: string;
}

export interface GamesResponse {
    games: Game[];
}

export interface GameResponse {
    game: Game;
    message?: string;
}
