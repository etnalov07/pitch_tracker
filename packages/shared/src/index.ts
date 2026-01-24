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

export interface PitcherPitchType {
    id: string;
    player_id: string;
    pitch_type: string;
    created_at: string;
}

export interface PlayerWithPitchTypes extends Player {
    pitch_types?: string[];
}

// Pitcher statistics for live game display
export interface PitcherGameStats {
    pitcher_id: string;
    game_id: string;
    total_pitches: number;
    strikes: number;
    balls: number;
    pitch_type_breakdown: {
        [pitch_type: string]: {
            total: number;
            strikes: number;
            balls: number;
            top_velocity: number | null;
            avg_velocity: number | null;
        };
    };
}

// Pitcher game log statistics (per pitch type)
export interface PitchTypeGameStats {
    pitch_type: string;
    count: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
    target_accuracy_percentage: number | null;
    top_velocity: number | null;
    avg_velocity: number | null;
}

// Pitcher game log entry
export interface PitcherGameLog {
    game_id: string;
    game_date: string;
    opponent_name: string;
    location: string | null;
    game_status: GameStatus;
    batters_faced: number;
    total_pitches: number;
    balls: number;
    strikes: number;
    strike_percentage: number;
    target_accuracy_percentage: number | null;
    pitch_type_breakdown: PitchTypeGameStats[];
}

// Full pitcher profile with career stats and game logs
export interface PitcherProfile {
    pitcher_id: string;
    first_name: string;
    last_name: string;
    jersey_number: number | null;
    throws: ThrowingHand;
    team_id: string;
    team_name: string;
    pitch_types: string[];
    career_stats: {
        total_games: number;
        total_pitches: number;
        total_batters_faced: number;
        overall_strike_percentage: number;
        overall_target_accuracy: number | null;
    };
    game_logs: PitcherGameLog[];
}

export interface PitcherGameLogsResponse {
    game_logs: PitcherGameLog[];
    total_count: number;
}

// ============================================================================
// Game Types
// ============================================================================

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InningHalf = 'top' | 'bottom';

export interface Game {
    id: string;
    home_team_id: string;
    away_team_id?: string | null;
    opponent_name?: string;
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
    away_team?: Team;
}

// ============================================================================
// Opponent Lineup Types
// ============================================================================

export interface OpponentLineupPlayer {
    id: string;
    game_id: string;
    player_name: string;
    batting_order: number;
    position?: string;
    bats: HandednessType;
    is_starter: boolean;
    replaced_by_id?: string | null;
    inning_entered?: number | null;
    created_at: string;
}

export interface OpponentLineupWithSub extends OpponentLineupPlayer {
    replaced_by?: OpponentLineupPlayer;
}

// ============================================================================
// Game Pitchers Types
// ============================================================================

export interface GamePitcher {
    id: string;
    game_id: string;
    player_id: string;
    pitching_order: number;
    inning_entered: number;
    inning_exited?: number | null;
    created_at: string;
}

export interface GamePitcherWithPlayer extends GamePitcher {
    player: Player;
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
    is_opponent_batting?: boolean;
    created_at: string;
}

// ============================================================================
// At-Bat Types
// ============================================================================

export interface AtBat {
    id: string;
    game_id: string;
    inning_id: string;
    batter_id?: string;
    opponent_batter_id?: string;
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
    batter_id?: string;
    opponent_batter_id?: string;
    pitch_number: number;
    pitch_type: PitchType;
    velocity?: number;
    location_x?: number;
    location_y?: number;
    target_location_x?: number;
    target_location_y?: number;
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

export interface HeatZoneData {
    zone_id: string;
    total_pitches: number;
    strikes: number;
    strike_percentage: number;
}

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
// Batter Scouting Types
// ============================================================================

export interface BatterScoutingProfile {
    id: string;
    team_id: string;
    opponent_team_name: string;
    player_name: string;
    normalized_name: string;
    bats: HandednessType;
    created_at?: string;
    updated_at?: string;
}

export interface BatterScoutingNote {
    id: string;
    profile_id: string;
    note_text: string;
    created_by?: string;
    created_by_name?: string;
    created_at: string;
    updated_at?: string;
}

export interface BatterTendencies {
    id: string;
    profile_id: string;
    total_pitches_seen: number;
    total_at_bats: number;
    pitches_outside_zone: number;
    swings_outside_zone: number;
    chase_rate: number | null;
    pitches_inside_zone: number;
    takes_inside_zone: number;
    watch_rate: number | null;
    early_count_pitches: number;
    early_count_swings: number;
    early_count_rate: number | null;
    first_pitches: number;
    first_pitch_takes: number;
    first_pitch_take_rate: number | null;
    breaking_outside: number;
    breaking_outside_swings: number;
    breaking_chase_rate: number | null;
    zone_tendencies: Record<string, { swing_rate: number; count: number }>;
    last_calculated_at: string | null;
    is_stale: boolean;
}

export type TendencyType = 'chase' | 'takes' | 'aggressive' | 'passive' | 'first_pitch';
export type TendencyConfidence = 'high' | 'medium' | 'low';

export interface AutoDetectedTendency {
    type: TendencyType;
    description: string;
    confidence: TendencyConfidence;
    value: number;
    sample_size: number;
}

export interface BatterScoutingReport {
    profile: BatterScoutingProfile;
    tendencies: BatterTendencies | null;
    notes: BatterScoutingNote[];
    auto_detected: AutoDetectedTendency[];
    games_faced: number;
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

export interface OpponentLineupResponse {
    lineup: OpponentLineupPlayer[];
}

export interface OpponentLineupPlayerResponse {
    player: OpponentLineupPlayer;
    message?: string;
}

export interface GamePitchersResponse {
    pitchers: GamePitcherWithPlayer[];
}

export interface GamePitcherResponse {
    pitcher: GamePitcher;
    message?: string;
}
