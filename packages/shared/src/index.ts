// ============================================================================
// Utility Functions
// ============================================================================

export { isOutResult, getOutsForResult, getSuggestedAdvancement, removeRunner, clearBases } from './utils/atBatHelpers';
export { BALL_RADIUS, BALL_DIAMETER, TARGET_ACCURACY_THRESHOLD, targetDistance, isTargetHit } from './utils/pitchLocation';
export { getCountBucket, deriveGameMode } from './utils/gameMode';
export { getNextBattingOrder, getNextBatter, applyAtBatResult, advanceHalf } from './utils/gameSimulation';
export type { LineupSlot, HalfInningState, AtBatOutcome } from './utils/gameSimulation';

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
    registration_type?: 'coach' | 'player' | 'org_admin';
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

export type TeamType = 'high_school' | 'travel' | 'club' | 'college';
export type TeamSeason = 'Spring' | 'Summer' | 'Fall' | 'Winter';

export interface Team {
    id: string;
    name: string;
    owner_id: string;
    organization_id?: string;
    abbreviation?: string;
    city?: string;
    organization?: string;
    age_group?: string;
    season?: string;
    team_type?: TeamType;
    year?: number;
    logo_path?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
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
    user_id?: string;
    first_name: string;
    last_name: string;
    jersey_number?: number;
    primary_position: PlayerPosition;
    secondary_position?: PlayerPosition;
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
export type ChartingMode = 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting';
export type GameMode = 'our_pitcher' | 'opp_pitcher';
export type TeamSide = 'our_team' | 'opponent';
export type CountBucket = '1st_pitch' | 'ahead' | 'even' | 'behind';

// ============================================================================
// Base Runner Types
// ============================================================================

export interface BaseRunners {
    first: boolean;
    second: boolean;
    third: boolean;
}

export type BaserunnerEventType =
    | 'caught_stealing'
    | 'pickoff'
    | 'interference'
    | 'passed_runner'
    | 'appeal_out'
    | 'other'
    | 'stolen_base'
    | 'wild_pitch'
    | 'passed_ball'
    | 'balk';

export type RunnerBase = 'first' | 'second' | 'third';

export interface BaserunnerEvent {
    id: string;
    game_id: string;
    inning_id: string;
    at_bat_id?: string;
    event_type: BaserunnerEventType;
    runner_base: RunnerBase;
    runner_to_base?: RunnerBase | 'home' | null;
    out_recorded: boolean;
    outs_before: number;
    outs_after: number;
    notes?: string;
    created_at: string;
}

export interface Game {
    id: string;
    home_team_id: string;
    away_team_id?: string | null;
    opponent_name?: string;
    is_home_game?: boolean;
    lineup_size?: number;
    total_innings?: number;
    charting_mode?: ChartingMode;
    game_date: string;
    game_time?: string;
    location?: string;
    status: GameStatus;
    home_score: number;
    away_score: number;
    current_inning: number;
    inning_half: InningHalf;
    home_team_name?: string;
    base_runners?: BaseRunners;
    total_pitches?: number;
    shake_count?: number;
    scouting_home_team?: string | null;
    opponent_team_id?: string | null;
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
    team_side?: 'home' | 'away';
    created_at: string;
}

export interface OpponentLineupWithSub extends OpponentLineupPlayer {
    replaced_by?: OpponentLineupPlayer;
}

// ============================================================================
// My Team Lineup Types
// ============================================================================

export interface MyTeamLineupPlayer {
    id: string;
    game_id: string;
    player_id: string;
    batting_order: number;
    position?: string;
    is_starter: boolean;
    replaced_by_id?: string | null;
    inning_entered?: number | null;
    created_at: string;
    player?: Player;
}

export interface CreateMyTeamLineupPlayerParams {
    player_id: string;
    batting_order: number;
    position?: string;
    is_starter: boolean;
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
    pitcher_id?: string;
    opposing_pitcher_id?: string;
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
    target_zone?: PitchCallZone;
    zone?: string;
    balls_before: number;
    strikes_before: number;
    pitch_result: PitchResult;
    team_side?: TeamSide;
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
    contact_quality?: ContactQuality;
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
    opponent_team_id?: string | null;
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
// Bullpen Mode Types
// ============================================================================

export type BullpenIntensity = 'low' | 'medium' | 'high';
export type BullpenSessionStatus = 'in_progress' | 'completed' | 'cancelled';
export type BullpenPitchResult = 'ball' | 'called_strike' | 'swinging_strike' | 'foul';

export interface BullpenSession {
    id: string;
    team_id: string;
    pitcher_id: string;
    date: string;
    intensity: BullpenIntensity;
    notes?: string;
    plan_id?: string;
    status: BullpenSessionStatus;
    created_by?: string;
    created_at: string;
    updated_at?: string;
}

export interface BullpenSessionWithDetails extends BullpenSession {
    pitcher_first_name: string;
    pitcher_last_name: string;
    pitcher_jersey_number?: number;
    total_pitches: number;
    strikes: number;
    balls: number;
    plan_name?: string;
}

export interface BullpenPitch {
    id: string;
    session_id: string;
    pitch_number: number;
    pitch_type: PitchType;
    target_x?: number;
    target_y?: number;
    actual_x?: number;
    actual_y?: number;
    velocity?: number;
    result?: BullpenPitchResult | null;
    created_at: string;
}

export interface BullpenPlan {
    id: string;
    team_id: string;
    name: string;
    description?: string;
    max_pitches?: number;
    created_by?: string;
    created_at: string;
    updated_at?: string;
}

export interface BullpenPlanPitch {
    id: string;
    plan_id: string;
    sequence: number;
    pitch_type: PitchType;
    target_x?: number;
    target_y?: number;
    instruction?: string;
}

export interface BullpenPlanAssignment {
    id: string;
    plan_id: string;
    pitcher_id: string;
    assigned_by?: string;
    created_at: string;
}

export interface BullpenPlanWithPitches extends BullpenPlan {
    pitches: BullpenPlanPitch[];
    assignments?: BullpenPlanAssignment[];
}

export interface BullpenSessionSummary {
    session_id: string;
    date: string;
    intensity: BullpenIntensity;
    total_pitches: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
    target_accuracy_percentage: number | null;
    pitch_type_breakdown: {
        pitch_type: string;
        count: number;
        strikes: number;
        balls: number;
        avg_velocity: number | null;
        top_velocity: number | null;
    }[];
    plan_name?: string;
    notes?: string;
}

// ============================================================================
// Pitch Calling Types
// ============================================================================

export type PitchCallResult = 'strike' | 'ball' | 'foul' | 'in_play';

export type PitchCallCategory = 'pitch' | 'situational';

export type SituationalCallType = 'pickoff' | 'bunt_coverage' | '1st_3rd_coverage' | 'shake';

export type PitchCallZone =
    | '0-0'
    | '0-1'
    | '0-2'
    | '1-0'
    | '1-1'
    | '1-2'
    | '2-0'
    | '2-1'
    | '2-2'
    | 'W-high'
    | 'W-low'
    | 'W-in'
    | 'W-out'
    | 'W-high-in'
    | 'W-high-out'
    | 'W-low-in'
    | 'W-low-out';

export type PitchCallAbbrev = 'FB' | 'CB' | 'CH' | 'SL' | 'CT' | '2S';

export const PITCH_CALL_LABELS: Record<PitchCallAbbrev, string> = {
    FB: 'Fastball',
    CB: 'Curveball',
    CH: 'Changeup',
    SL: 'Slider',
    CT: 'Cutter',
    '2S': 'Two-Seam',
};

export const PITCH_CALL_ZONE_LABELS: Record<PitchCallZone, string> = {
    '0-0': 'Up and In',
    '0-1': 'Up the Middle',
    '0-2': 'Up and Away',
    '1-0': 'Middle In',
    '1-1': 'Middle Middle',
    '1-2': 'Middle Away',
    '2-0': 'Down and In',
    '2-1': 'Down the Middle',
    '2-2': 'Down and Away',
    'W-high': 'High at the Shoulders',
    'W-low': 'Low in the Dirt',
    'W-in': 'Tight Inside',
    'W-out': 'Extended Outside',
    'W-high-in': 'High and Tight',
    'W-high-out': 'High and Away',
    'W-low-in': 'Low and Tight',
    'W-low-out': 'Low and Away',
};

// Center coordinates (0-1 normalized) for each zone, used for rendering targets on the strike zone
export const PITCH_CALL_ZONE_COORDS: Record<PitchCallZone, { x: number; y: number }> = {
    '0-0': { x: 0.167, y: 0.167 },
    '0-1': { x: 0.5, y: 0.167 },
    '0-2': { x: 0.833, y: 0.167 },
    '1-0': { x: 0.167, y: 0.5 },
    '1-1': { x: 0.5, y: 0.5 },
    '1-2': { x: 0.833, y: 0.5 },
    '2-0': { x: 0.167, y: 0.833 },
    '2-1': { x: 0.5, y: 0.833 },
    '2-2': { x: 0.833, y: 0.833 },
    'W-high': { x: 0.5, y: -0.15 },
    'W-low': { x: 0.5, y: 1.15 },
    'W-in': { x: -0.15, y: 0.5 },
    'W-out': { x: 1.15, y: 0.5 },
    'W-high-in': { x: -0.15, y: -0.15 },
    'W-high-out': { x: 1.15, y: -0.15 },
    'W-low-in': { x: -0.15, y: 1.15 },
    'W-low-out': { x: 1.15, y: 1.15 },
};

// Find the nearest PitchCallZone for a given coordinate pair
export function getNearestPitchCallZone(x: number, y: number): PitchCallZone {
    let best: PitchCallZone = '1-1';
    let bestDist = Infinity;
    for (const [zone, coords] of Object.entries(PITCH_CALL_ZONE_COORDS) as [PitchCallZone, { x: number; y: number }][]) {
        const dx = x - coords.x;
        const dy = y - coords.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            bestDist = dist;
            best = zone;
        }
    }
    return best;
}

export interface PitchCall {
    id: string;
    game_id: string;
    at_bat_id?: string;
    team_id: string;
    pitcher_id?: string;
    batter_id?: string;
    opponent_batter_id?: string;
    call_number: number;
    category: PitchCallCategory;
    pitch_type: PitchCallAbbrev;
    zone: PitchCallZone;
    situational_type?: SituationalCallType;
    pickoff_base?: '1B' | '2B' | '3B';
    is_change: boolean;
    original_call_id?: string;
    result?: PitchCallResult;
    pitch_id?: string;
    bt_transmitted: boolean;
    called_by: string;
    inning?: number;
    balls_before: number;
    strikes_before: number;
    created_at: string;
    result_logged_at?: string;
}

export interface PitchCallWithDetails extends PitchCall {
    pitcher_first_name?: string;
    pitcher_last_name?: string;
    batter_name?: string;
    caller_first_name?: string;
    caller_last_name?: string;
    original_pitch_type?: PitchCallAbbrev;
    original_zone?: PitchCallZone;
}

export interface PitchCallGameSummary {
    game_id: string;
    total_calls: number;
    changes: number;
    results: {
        strike: number;
        ball: number;
        foul: number;
        in_play: number;
    };
    pitch_type_breakdown: {
        pitch_type: PitchCallAbbrev;
        count: number;
        strikes: number;
        balls: number;
    }[];
    zone_breakdown: {
        zone: PitchCallZone;
        count: number;
        strikes: number;
        balls: number;
    }[];
}

// ============================================================================
// Pitch Call Analytics
// ============================================================================

export interface PitchCallAccuracy {
    /** Pitcher who executed the calls */
    pitcher_id: string;
    pitcher_name?: string;
    /** Total calls with linked pitches */
    total_linked: number;
    /** % of pitches where actual type matches called type */
    type_accuracy: number;
    /** % of pitches landing in the called zone */
    zone_accuracy: number;
    /** Breakdown by pitch type */
    by_type: {
        called_type: PitchCallAbbrev;
        total: number;
        type_match: number;
        zone_match: number;
    }[];
    /** Breakdown by count */
    by_count: {
        balls: number;
        strikes: number;
        total: number;
        type_accuracy: number;
        zone_accuracy: number;
    }[];
}

export interface GameCallAnalytics {
    game_id: string;
    total_calls: number;
    total_linked: number;
    type_accuracy: number;
    zone_accuracy: number;
    results: {
        strike: number;
        ball: number;
        foul: number;
        in_play: number;
    };
    /** Per-pitcher breakdown */
    by_pitcher: {
        pitcher_id: string;
        pitcher_name: string;
        total: number;
        type_accuracy: number;
        zone_accuracy: number;
    }[];
}

export interface SeasonCallAnalytics {
    team_id: string;
    games_with_calls: number;
    total_calls: number;
    total_linked: number;
    type_accuracy: number;
    zone_accuracy: number;
    results: {
        strike: number;
        ball: number;
        foul: number;
        in_play: number;
    };
}

// ============================================================================
// Performance Summary
// ============================================================================

export type SummarySourceType = 'game' | 'bullpen' | 'scouting';
export type MetricRating = 'highlight' | 'concern' | 'neutral';

export interface PerformanceMetric {
    metric_name: string;
    value: number;
    benchmark_value: number;
    historical_avg: number | null;
    rating: MetricRating;
    delta_from_avg: number | null;
}

export interface PitchTypeSummary {
    pitch_type: string;
    count: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
    avg_velocity: number | null;
    top_velocity: number | null;
    target_accuracy_percentage: number | null;
    rating: MetricRating;
}

export interface PerformanceSummary {
    id: string;
    source_type: SummarySourceType;
    source_id: string;
    pitcher_id: string;
    pitcher_name: string;
    team_id: string;
    created_at: string;
    narrative: string | null;
    narrative_generated_at: string | null;
    total_pitches: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
    target_accuracy_percentage: number | null;
    batters_faced: number | null;
    innings_pitched: number | null;
    runs_allowed: number | null;
    hits_allowed: number | null;
    intensity: string | null;
    plan_name: string | null;
    metrics: PerformanceMetric[];
    pitch_type_breakdown: PitchTypeSummary[];
    highlights: string[];
    concerns: string[];
}

// ============================================================================
// Batter Breakdown (per-game pitch-by-pitch view)
// ============================================================================

export interface BatterAtBatPitch {
    pitch_number: number;
    pitch_type: PitchType;
    pitch_result: PitchResult;
    balls_before: number;
    strikes_before: number;
    velocity?: number;
    is_ab_ending: boolean;
    target_zone?: PitchCallZone;
    target_location_x?: number;
    target_location_y?: number;
}

export interface BatterAtBatSummary {
    at_bat_id: string;
    inning_number: number;
    inning_half: InningHalf;
    result?: string;
    fielded_by_position?: string;
    pitches: BatterAtBatPitch[];
}

export interface BatterBreakdown {
    batter_id: string;
    batter_name: string;
    batting_order: number;
    bats: HandednessType;
    position?: string;
    at_bats: BatterAtBatSummary[];
}

// ============================================================================
// Opposing Pitcher Types
// ============================================================================

export interface OpposingPitcher {
    id: string;
    game_id: string;
    team_name: string;
    pitcher_name: string;
    jersey_number?: number | null;
    throws: ThrowingHand;
    team_side?: 'home' | 'away';
    profile_id?: string | null;
    created_at: string;
}

export interface CreateOpposingPitcherParams {
    game_id: string;
    team_name: string;
    pitcher_name: string;
    jersey_number?: number | null;
    throws: ThrowingHand;
    team_side?: 'home' | 'away';
}

// ============================================================================
// WebSocket / Real-Time Sync Types
// ============================================================================

export type GameRole = 'charter' | 'viewer';

export type WsMessageType = 'pitch_logged' | 'at_bat_ended' | 'inning_changed' | 'runners_updated';

export interface WsMessage {
    type: WsMessageType;
    game_id: string;
    payload: Record<string, unknown>;
}

export interface GameRoleRecord {
    id: string;
    user_id: string;
    game_id: string;
    role: GameRole;
    assigned_at: string;
}

// ============================================================================
// Count Breakdown Types
// ============================================================================

export interface CountBucketStats {
    total: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
    pitch_type_breakdown: {
        pitch_type: PitchType;
        count: number;
        strikes: number;
        strike_percentage: number;
    }[];
}

export interface CountBucketBreakdown {
    game_id: string;
    pitcher_id?: string;
    team_side?: TeamSide;
    '1st_pitch': CountBucketStats;
    ahead: CountBucketStats;
    even: CountBucketStats;
    behind: CountBucketStats;
}

// ============================================================================
// Pitch Chart Types (per-count breakdown, matches traditional pitcher's chart)
// ============================================================================

export interface PitchChartCountData {
    total: number;
    strike_pct: number;
    by_type: Array<{ pitch_type: string; count: number }>;
}

export interface PitchChart {
    game_id: string;
    pitcher_id: string | null;
    team_side: string | null;
    pitch_types: string[];
    counts: Record<string, PitchChartCountData>;
    totals_by_type: Array<{ pitch_type: string; count: number; strike_pct: number }>;
    grand_total: number;
}

// ============================================================================
// Roster Import Types
// ============================================================================

export interface RosterImportRow {
    first_name: string;
    last_name: string;
    jersey_number?: number;
    primary_position: string;
    bats: string;
    throws: string;
    pitch_types?: string[];
    _errors?: string[];
}

export interface RosterImportResult {
    imported: number;
    skipped: number;
    errors: string[];
    players: Player[];
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

// ============================================================================
// Role Types
// ============================================================================

export type OrgRole = 'owner' | 'admin' | 'coach';
export type TeamRole = 'owner' | 'coach' | 'assistant' | 'player';

// ============================================================================
// Organization Types
// ============================================================================

export interface Organization {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_path?: string;
    primary_color?: string;
    secondary_color?: string;
    created_by: string;
    created_at: string;
    updated_at?: string;
}

export interface OrganizationMember {
    id: string;
    organization_id: string;
    user_id: string;
    role: OrgRole;
    created_at: string;
    user_first_name?: string;
    user_last_name?: string;
    user_email?: string;
}

export interface OrganizationWithTeams extends Organization {
    teams: Team[];
    member_count: number;
}

// ============================================================================
// Team Member Types
// ============================================================================

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: TeamRole;
    player_id?: string;
    created_at: string;
    user_first_name?: string;
    user_last_name?: string;
    user_email?: string;
}

// ============================================================================
// Invite Types
// ============================================================================

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invite {
    id: string;
    token: string;
    team_id: string;
    player_id?: string;
    invited_by: string;
    invited_email?: string;
    role: TeamRole;
    status: InviteStatus;
    expires_at: string;
    accepted_by?: string;
    accepted_at?: string;
    created_at: string;
    team_name?: string;
    inviter_name?: string;
    player_name?: string;
}

// ============================================================================
// Join Request Types
// ============================================================================

export type JoinRequestStatus = 'pending' | 'approved' | 'denied';

export interface JoinRequest {
    id: string;
    team_id: string;
    user_id: string;
    message?: string;
    status: JoinRequestStatus;
    reviewed_by?: string;
    linked_player_id?: string;
    reviewed_at?: string;
    created_at: string;
    user_first_name?: string;
    user_last_name?: string;
    team_name?: string;
}

// ============================================================================
// Extended User Type (with role context)
// ============================================================================

export interface UserWithRoles extends User {
    team_memberships: TeamMember[];
    org_memberships: OrganizationMember[];
}

// ============================================================================
// Live Tendencies Types
// ============================================================================

export interface SuggestedPitch {
    pitch_type: string;
    zone: PitchCallZone | null;
    zone_label: string;
    rationale: string;
}

export interface PitcherPitchTypeStat {
    pitch_type: string;
    count: number;
    usage_pct: number;
    strike_pct: number;
    whiff_pct: number;
    avg_velocity: number | null;
}

export interface PitcherZoneStat {
    zone: string;
    count: number;
    usage_pct: number;
    strike_pct: number;
}

export interface PitcherTendenciesLive {
    pitcher_id: string;
    pitcher_name: string;
    batter_hand: 'L' | 'R';
    total_pitches: number;
    has_data: boolean;
    pitch_mix: PitcherPitchTypeStat[];
    zone_grid: PitcherZoneStat[];
    suggested_sequence: SuggestedPitch[];
}

export interface HitterZoneStat {
    zone: string;
    swing_rate: number;
    contact_rate: number;
    count: number;
}

export interface HitterPitchTypeStat {
    pitch_type: string;
    times_seen: number;
    swing_pct: number;
    whiff_pct: number;
}

export interface HitterTendenciesLive {
    batter_id: string;
    batter_name: string;
    batter_hand: string;
    total_pitches: number;
    has_data: boolean;
    zone_weakness_map: HitterZoneStat[];
    pitch_type_vulnerability: HitterPitchTypeStat[];
    early_count_swing_rate: number | null;
    two_strike_chase_rate: number | null;
    first_pitch_take_rate: number | null;
    suggested_sequence: SuggestedPitch[];
}

// ============================================================================
// Opponent Scouting Reports (Pre-game scouting)
// ============================================================================

export type TeamTendencyFrequency = 'low' | 'medium' | 'high';
export type ScoutingZoneCell = 'hot' | 'cold' | 'neutral';

export interface ScoutingReport {
    id: string;
    team_id: string;
    opponent_name: string;
    game_id?: string | null;
    game_date?: string | null;
    notes?: string | null;
    steal_frequency?: TeamTendencyFrequency | null;
    bunt_frequency?: TeamTendencyFrequency | null;
    hit_and_run_frequency?: TeamTendencyFrequency | null;
    created_by?: string | null;
    created_by_name?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ScoutingReportBatter {
    id: string;
    report_id: string;
    player_name: string;
    jersey_number?: number | null;
    batting_order?: number | null;
    bats: HandednessType;
    notes?: string | null;
    // 9-zone map keyed by zone id (e.g. "1".."9") describing pre-filled weakness
    zone_weakness?: Record<string, ScoutingZoneCell> | null;
    // Free-form tags like ["fastball_high","slider_low"]
    pitch_vulnerabilities?: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface ScoutingReportWithBatters extends ScoutingReport {
    batters: ScoutingReportBatter[];
}

export interface ScoutingReportBatterInput {
    player_name: string;
    jersey_number?: number | null;
    batting_order?: number | null;
    bats?: HandednessType;
    notes?: string | null;
    zone_weakness?: Record<string, ScoutingZoneCell> | null;
    pitch_vulnerabilities?: string[] | null;
}

export interface ScoutingReportInput {
    opponent_name: string;
    game_id?: string | null;
    game_date?: string | null;
    notes?: string | null;
    steal_frequency?: TeamTendencyFrequency | null;
    bunt_frequency?: TeamTendencyFrequency | null;
    hit_and_run_frequency?: TeamTendencyFrequency | null;
}

// ============================================================================
// Opponent Intelligence Types
// ============================================================================

export interface OpponentTeam {
    id: string;
    team_id: string;
    name: string;
    normalized_name: string;
    city?: string | null;
    state?: string | null;
    level?: string | null;
    notes?: string | null;
    games_played: number;
    last_game_date?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface CreateOpponentTeamParams {
    name: string;
    city?: string | null;
    state?: string | null;
    level?: string | null;
    notes?: string | null;
}

export interface OpponentPitcherProfile {
    id: string;
    opponent_team_id: string;
    team_id: string;
    pitcher_name: string;
    normalized_name: string;
    jersey_number?: number | null;
    throws: ThrowingHand;
    games_pitched: number;
    last_seen_date?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface OpponentPitcherTendencies {
    id: string;
    profile_id: string;
    total_pitches: number;
    total_at_bats: number;
    strike_percentage: number | null;
    first_pitch_strike_pct: number | null;
    fastball_pct: number | null;
    offspeed_pct: number | null;
    breaking_pct: number | null;
    early_count_fastball_pct: number | null;
    two_strike_offspeed_pct: number | null;
    pitch_mix: Record<string, { count: number; pct: number; strike_pct: number }>;
    zone_tendencies: Record<string, { count: number; strike_pct: number }>;
    last_calculated_at: string | null;
    is_stale: boolean;
}

export interface OpponentTeamWithRoster extends OpponentTeam {
    pitchers: OpponentPitcherProfile[];
    batters: BatterScoutingProfile[];
}
