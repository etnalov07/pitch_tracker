// ============================================================================
// Utility Functions
// ============================================================================

export { isOutResult, getOutsForResult, getSuggestedAdvancement, removeRunner, clearBases } from './utils/atBatHelpers';
export {
    BALL_RADIUS,
    BALL_DIAMETER,
    TARGET_ACCURACY_THRESHOLD,
    SUMMARY_TARGET_ACCURACY_THRESHOLD,
    targetDistance,
    isTargetHit,
} from './utils/pitchLocation';
export { scoreAccuracy } from './utils/scoreAccuracy';
export { getCountBucket, deriveGameMode } from './utils/gameMode';
export { getNextBattingOrder, getNextBatter, getInningLeadoffBatter, applyAtBatResult, advanceHalf } from './utils/gameSimulation';
export { formatFielderSequence, parseFielderSequence } from './utils/fielderSequence';
export { describeBaserunnerEvent } from './utils/baserunnerEvent';
export { filterUserPitcherPitches, groupPitchesByAtBat, buildReplaySequence } from './utils/replayBuilder';
export type { LineupSlot, HalfInningState, AtBatOutcome } from './utils/gameSimulation';
export type { ReplayAtBat, ReplayLookups } from './utils/replayBuilder';

// ============================================================================
// User & Authentication Types
// ============================================================================

export type RegistrationType = 'coach' | 'player' | 'org_admin';

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    updated_at?: string;
    // Mode the user signed up under. NULL for users who pre-date the column —
    // treated as 'coach' by the dashboard branching shell.
    registration_type?: RegistrationType | null;
    // Derived server-side from the SUPER_ADMIN_EMAILS env allowlist; present on
    // every user response. Falsy for normal users. The web hides the /admin
    // link unless true; server re-checks on every admin route.
    is_super_admin?: boolean;
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
    registration_type?: RegistrationType;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface JWTPayload {
    id: string;
    email: string;
    // Set by jsonwebtoken on sign; present on verified/decoded tokens. Used to
    // reject tokens issued before a password change.
    iat?: number;
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

export type PlayerPosition = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'OF' | 'INF' | 'MIF' | 'DH' | 'UTIL';

// Standard baseball position numbers (1=P, 2=C, 3=1B, ..., 9=RF). Used for
// putout/assist sequences (e.g. "9-2" = throw from RF to C) and any future
// scoring notation. Group positions (OF, INF, MIF, DH, UTIL) are not numbered.
export const POSITION_NUM = {
    P: 1,
    C: 2,
    '1B': 3,
    '2B': 4,
    '3B': 5,
    SS: 6,
    LF: 7,
    CF: 8,
    RF: 9,
} as const;

export const NUM_TO_POSITION: Record<number, PlayerPosition> = {
    1: 'P',
    2: 'C',
    3: '1B',
    4: '2B',
    5: '3B',
    6: 'SS',
    7: 'LF',
    8: 'CF',
    9: 'RF',
};

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
// Player Self-Stats (PlayerDashboard "My Stats")
// ============================================================================

export interface MyPlayerBatting {
    games: number;
    at_bats: number;
    hits: number;
    rbi: number;
    runs: number;
    walks: number;
    strikeouts: number;
    batting_average: string;
}

export interface MyPlayerPitching {
    games: number;
    batters_faced: number;
    total_pitches: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
}

export interface PlayerStatGame {
    game_id: string;
    game_date: string;
    opponent_name: string | null;
    team_score: number | null;
    opponent_score: number | null;
    result: 'W' | 'L' | 'T' | null;
    batting_line: string | null;
    pitching_line: string | null;
}

export interface MyPlayerStats {
    player_id: string;
    team_id: string;
    team_name: string | null;
    batting: MyPlayerBatting | null;
    pitching: MyPlayerPitching | null;
    games: PlayerStatGame[];
}

// ============================================================================
// Game Types
// ============================================================================

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InningHalf = 'top' | 'bottom';
export type ChartingMode = 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting' | 'scrimmage';
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
    | 'balk'
    | 'advance_on_throw'
    | 'thrown_out_advancing';

export type RunnerBase = 'first' | 'second' | 'third';

export interface BaserunnerEvent {
    id: string;
    game_id: string;
    inning_id: string;
    at_bat_id?: string;
    event_type: BaserunnerEventType;
    // 'home' represents the batter as origin — used for advance_on_throw events
    // where the batter took an extra base on a fielding/throwing error.
    runner_base: RunnerBase | 'home';
    runner_to_base?: RunnerBase | 'home' | null;
    out_recorded: boolean;
    outs_before: number;
    outs_after: number;
    // Putout/assist fielder sequence (1-9). For thrown_out_advancing events
    // this captures e.g. [9, 2] for "throw from RF, putout by C".
    fielder_sequence?: number[] | null;
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
    scouting_focus?: 'both' | 'home' | 'away';
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

// Snapshot of at-bat + game state captured at logPitch time so the pitch can be
// fully reversed (undo). Restoring this snapshot rewinds count, runners, score,
// and at-bat lifecycle (result/outs_after/rbi/runs_scored/ab_end_time).
export interface PitchPrevState {
    at_bat: {
        balls: number;
        strikes: number;
        result: string | null;
        outs_after: number;
        rbi: number;
        runs_scored: number;
        ab_end_time: string | null;
    };
    game: {
        base_runners: BaseRunners;
        home_score: number;
        away_score: number;
    };
}

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
    prev_state?: PitchPrevState | null;
    created_at: string;
}

// Request body for PATCH /bt-api/pitches/:id — see UX-LG-01 "Fix Last Pitch" plan.
// Only result-only edits are supported, and only for the most-recent pitch in its at-bat
// when neither the old nor new result crosses an at-bat-ending boundary
// (4 balls / 3 strikes / in_play / hit_by_pitch).
export interface UpdatePitchResultRequest {
    pitch_result: PitchResult;
}

// Error code emitted by PATCH /bt-api/pitches/:id when the requested edit would
// cross an at-bat-ending boundary. Clients should fall back to the Undo flow.
export type PitchUpdateErrorCode = 'AB_BOUNDARY' | 'NOT_LATEST' | 'NO_PREV_STATE';

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
    target_location_x?: number;
    target_location_y?: number;
    balls_before?: number;
    strikes_before?: number;
}

export type TendencyBucket = 'first_pitch' | 'hitter_count' | 'pitcher_count' | 'two_strike';

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
    contact_type?: ContactType;
    contact_quality?: ContactQuality;
    hit_result?: HitResult;
    count: number;
    /** Set when the spray chart is scoped across multiple games (opponent scope). */
    game_id?: string;
    /** ISO date of the game this aggregated row belongs to. */
    game_date?: string;
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
    jersey_number?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateBatterScoutingProfileParams {
    player_name: string;
    bats: HandednessType;
    jersey_number?: number | null;
}

export interface UpdateBatterScoutingProfileParams {
    player_name?: string;
    bats?: HandednessType;
    jersey_number?: number | null;
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

export type PitchCallAbbrev = 'FB' | '4S' | '2S' | 'CT' | 'SI' | 'SL' | 'CB' | 'CH' | 'SP' | 'KN' | 'SC' | 'OT';

export const PITCH_CALL_LABELS: Record<PitchCallAbbrev, string> = {
    FB: 'Fastball',
    '4S': '4-Seam',
    '2S': '2-Seam',
    CT: 'Cutter',
    SI: 'Sinker',
    SL: 'Slider',
    CB: 'Curveball',
    CH: 'Changeup',
    SP: 'Splitter',
    KN: 'Knuckleball',
    SC: 'Screwball',
    OT: 'Other',
};

/** Map every PitchType to its PitchCallAbbrev for display / call transmission */
export const PITCH_TYPE_TO_ABBREV: Record<PitchType, PitchCallAbbrev> = {
    fastball: 'FB',
    '4-seam': '4S',
    '2-seam': '2S',
    cutter: 'CT',
    sinker: 'SI',
    slider: 'SL',
    curveball: 'CB',
    changeup: 'CH',
    splitter: 'SP',
    knuckleball: 'KN',
    screwball: 'SC',
    other: 'OT',
};

/** Reverse map: PitchCallAbbrev → PitchType */
export const ABBREV_TO_PITCH_TYPE: Record<PitchCallAbbrev, PitchType> = {
    FB: 'fastball',
    '4S': '4-seam',
    '2S': '2-seam',
    CT: 'cutter',
    SI: 'sinker',
    SL: 'slider',
    CB: 'curveball',
    CH: 'changeup',
    SP: 'splitter',
    KN: 'knuckleball',
    SC: 'screwball',
    OT: 'other',
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

export type SummarySourceType = 'game' | 'bullpen' | 'scouting' | 'team_offense';
export type MetricRating = 'highlight' | 'concern' | 'neutral';

export interface PerformanceMetric {
    metric_name: string;
    value: number;
    benchmark_value: number;
    historical_avg: number | null;
    rating: MetricRating;
    delta_from_avg: number | null;
}

export interface PitcherZoneOutcome {
    zone: string;
    whiff_pct: number;
    called_strike_pct: number;
    hard_contact_pct: number;
    weak_contact_pct: number;
    total_pitches: number;
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
    per_zone_outcomes?: PitcherZoneOutcome[];
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
    team_side?: 'home' | 'away';
    at_bats: BatterAtBatSummary[];
}

// ============================================================================
// Team Offense Summary (postgame: how the opponent attacked our hitters)
// ============================================================================

export type CountSituation = 'first_pitch' | 'hitter_count' | 'pitcher_count' | 'two_strike';
export type OutcomeBucket = 'hit' | 'walk' | 'strikeout' | 'weak_contact_out' | 'hard_contact_out';

export interface PitchTypeMix {
    pitch_type: string;
    count: number;
    pct: number;
}

export interface ZoneHistogram {
    [zone: string]: number;
}

export interface CountSituationStat {
    situation: CountSituation;
    pitch_type_mix: PitchTypeMix[];
    total: number;
}

export interface OutcomePitchSlice {
    pitch_type: string;
    zone: string;
    count: number;
}

export interface OutcomePitchGroup {
    bucket: OutcomeBucket;
    pitches: OutcomePitchSlice[];
    total: number;
}

export interface PerHitterAttack {
    batter_id: string;
    batter_name: string;
    bats: HandednessType;
    batting_order: number;
    at_bats_count: number;
    pitch_type_mix: PitchTypeMix[];
    zone_histogram: ZoneHistogram;
    count_situations: CountSituationStat[];
    outcomes: { hits: number; walks: number; strikeouts: number; outs_in_play: number };
    what_worked: OutcomePitchGroup[];
    what_got_out: OutcomePitchGroup[];
}

export interface TeamOffenseSummary {
    game_id: string;
    pitch_type_mix: PitchTypeMix[];
    zone_histogram: ZoneHistogram;
    count_situations: CountSituationStat[];
    team_outcomes: OutcomePitchGroup[];
    per_hitter: PerHitterAttack[];
    narrative?: string | null;
    narrative_generated_at?: string | null;
}

// Shape consumed by the postgame email HTML body. The body is intentionally
// lean: just the AI coaching narratives. The CTA links recipients to the
// full live report (see `PublicGameReport`).
export interface PostGameReportContent {
    game_label: string;
    public_report_url: string;
    team_narrative: string | null;
    per_pitcher: Array<{ pitcher_name: string; narrative: string | null }>;
}

// Combined payload returned by the public `/performance-summaries/game/:gameId/public-report`
// endpoint. Renders the full Summary tab content for non-authenticated visitors.
export interface PublicGameReport {
    game_id: string;
    game_label: string;
    home_team_name: string;
    opponent_name: string;
    game_date: string | null; // formatted MM/DD/YYYY
    score: { home: number; away: number } | null;
    team_offense: TeamOffenseSummary;
    pitchers: PerformanceSummary[];
    // Per-game batter breakdown (same shape PerformanceSummaryCard fetches
    // internally on the SPA via the auth-gated endpoint). Pre-fetched here
    // so the public page can pass it as a prop and skip the auth call.
    batter_breakdown: BatterBreakdown[];
    // Same shape but for our hitters facing the opposing pitcher — used by
    // the per-hitter accordion in the team-offense section to show each
    // at-bat's pitch sequence.
    my_team_batter_breakdown: BatterBreakdown[];
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

export type WsMessageType = 'pitch_logged' | 'at_bat_ended' | 'inning_changed' | 'runners_updated' | 'pitch_call';

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
    user_email_verified?: boolean;
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

export interface CreateOpponentPitcherProfileParams {
    pitcher_name: string;
    throws: ThrowingHand;
    jersey_number?: number | null;
}

export interface UpdateOpponentPitcherProfileParams {
    pitcher_name?: string;
    throws?: ThrowingHand;
    jersey_number?: number | null;
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

/**
 * Unified opponent-team player. Merges {@link OpponentPitcherProfile} and
 * {@link BatterScoutingProfile} by normalized name so a two-way player who
 * has both pitched and batted appears as a single record with `is_pitcher`
 * and `is_batter` both true. Used by lineup pickers that draw from the
 * same pool whether the user is filling a batter slot or naming a pitcher.
 */
export interface OpponentRosterPlayer {
    name: string;
    normalized_name: string;
    bats?: HandednessType;
    throws?: ThrowingHand;
    jersey_number?: number | null;
    is_pitcher: boolean;
    is_batter: boolean;
}

// ============================================================================
// Scouting Lineup Utilities
// ============================================================================

export const SCOUTING_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'PH'];

export interface ScoutingLineupEntry {
    player_name: string;
    batting_order: number;
    position: string;
    bats: 'R' | 'L' | 'S';
}

export interface ScoutingLineupPayloadPlayer {
    player_name: string;
    batting_order: number;
    position?: string;
    bats: 'R' | 'L' | 'S';
    is_starter: true;
    team_side: 'home' | 'away';
}

export interface ScoutingPitcherPayload {
    game_id: string;
    pitcher_name: string;
    jersey_number: number | null;
    throws: 'R' | 'L';
    team_name: string;
    team_side: 'home' | 'away';
}

export function buildScoutingLineupPayload(
    entries: ScoutingLineupEntry[],
    teamSide: 'home' | 'away'
): ScoutingLineupPayloadPlayer[] {
    return entries
        .filter((e) => e.player_name.trim() !== '')
        .map((e) => ({
            player_name: e.player_name.trim(),
            batting_order: e.batting_order,
            position: e.position || undefined,
            bats: e.bats,
            is_starter: true as const,
            team_side: teamSide,
        }));
}

export function buildScoutingPitcherPayload(
    gameId: string,
    name: string,
    jersey: number | null,
    throws: 'R' | 'L',
    teamName: string,
    teamSide: 'home' | 'away'
): ScoutingPitcherPayload | null {
    if (!name.trim()) return null;
    return {
        game_id: gameId,
        pitcher_name: name.trim(),
        jersey_number: jersey,
        throws,
        team_name: teamName,
        team_side: teamSide,
    };
}

export function emptyScoutingLineup(size: number): ScoutingLineupEntry[] {
    return Array.from({ length: size }, (_, i) => ({
        player_name: '',
        batting_order: i + 1,
        position: '',
        bats: 'R' as const,
    }));
}

// ============================================================================
// Admin (Super User) Types
// ============================================================================

export type AdminActorRole = 'super' | 'org_owner' | 'org_admin';

export interface AdminUserListItem {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    email_verified: boolean;
    created_at: string;
    team_count: number;
    org_count: number;
    locked_until?: string | null;
}

export interface AdminUserDetail extends UserWithRoles {
    email_verified: boolean;
    email_verified_at?: string | null;
    recent_games: Array<{
        id: string;
        game_date: string;
        opponent_name?: string;
        home_team_name?: string;
    }>;
}

export interface AdminOrgListItem {
    id: string;
    name: string;
    slug: string;
    member_count: number;
    team_count: number;
    created_at: string;
}

export interface AdminTeamListItem {
    id: string;
    name: string;
    organization_id?: string | null;
    organization_name?: string | null;
    owner_id: string;
    owner_email?: string;
    created_at: string;
}

export interface AdminGameListItem {
    id: string;
    game_date: string;
    home_team_id: string;
    home_team_name?: string;
    opponent_name?: string;
    status: string;
    home_score: number;
    away_score: number;
    created_by: string;
    created_at: string;
}

export interface AdminAuditEntry {
    id: string;
    actor_user_id: string;
    actor_email?: string;
    actor_role: AdminActorRole;
    organization_id?: string | null;
    action: string;
    target_table?: string | null;
    target_id?: string | null;
    payload?: Record<string, unknown> | null;
    created_at: string;
}

export interface AdminAuthEventEntry {
    id: string;
    user_id: string | null;
    email: string | null;
    event_type: string;
    ip_address: string | null;
    created_at: string;
}

export interface AdminListResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}

// ============================================================================
// Pitcher Performance Report
// ============================================================================

export type PitcherReportWindow = 'last5' | 'last10' | 'last20' | 'season' | 'all';

export interface VelocityTrendPoint {
    game_id: string;
    game_date: string;
    opponent_name: string | null;
    avg_velocity: number;
    top_velocity: number;
    pitch_count: number;
}

export type PitcherTrendKind = 'velocity' | 'strike_pct' | 'command' | 'whiff' | 'first_pitch_strike';
export type PitcherTrendDirection = 'up' | 'down' | 'flat';

export interface PitcherTrendCallout {
    kind: PitcherTrendKind;
    direction: PitcherTrendDirection;
    magnitude: number;
    copy: string;
}

export interface PitcherReportPitchTypeRow {
    pitch_type: string;
    count: number;
    usage_pct: number;
    strike_pct: number;
    whiff_pct: number;
    avg_velocity: number | null;
    top_velocity: number | null;
    success: 'works' | 'mixed' | 'struggles';
}

export interface PitcherReportZoneRow {
    zone: string;
    count: number;
    strike_pct: number;
    in_play_pct: number;
    weak_contact_pct: number;
    hard_contact_pct: number;
    whiff_pct: number;
    success: 'works' | 'mixed' | 'struggles';
}

export interface PitcherReportGameLogRow {
    game_id: string;
    game_date: string;
    opponent_name: string | null;
    pitches: number;
    strikes: number;
    strike_pct: number;
    batters_faced: number;
    target_accuracy_pct: number | null;
    avg_velocity: number | null;
    runs_allowed: number;
    hits_allowed: number;
}

export interface PitcherReportStats {
    games_included: number;
    total_pitches: number;
    strikes: number;
    balls: number;
    strike_pct: number;
    target_accuracy_pct: number | null;
    first_pitch_strike_pct: number | null;
    three_ball_rate: number | null;
    batters_faced: number;
    innings_pitched: number;
    runs_allowed: number;
    hits_allowed: number;
    pitch_types: PitcherReportPitchTypeRow[];
    zones: PitcherReportZoneRow[];
}

export interface PitcherReportPayload {
    pitcher_id: string;
    pitcher_name: string;
    window: PitcherReportWindow;
    window_label: string;
    stats: PitcherReportStats;
    velocity_trend: VelocityTrendPoint[] | null;
    trends: PitcherTrendCallout[];
    games: PitcherReportGameLogRow[];
    narrative: string | null;
    narrative_generated_at: string | null;
}
