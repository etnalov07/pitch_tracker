// User & Authentication Types
export interface User {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

// Team Types
export interface Team {
    id: string;
    name: string;
    abbreviation?: string;
    city?: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

// Player Types
export type PlayerPosition = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'UTIL';

export type HandednessType = 'R' | 'L' | 'S';

export interface Player {
    id: string;
    teamId: string;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    position: PlayerPosition;
    bats: HandednessType;
    throws: HandednessType;
    createdAt: string;
    updatedAt: string;
}

// Game Types
export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InningHalf = 'top' | 'bottom';

export interface Game {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    gameDate: string;
    location?: string;
    status: GameStatus;
    currentInning?: number;
    inningHalf?: InningHalf;
    homeScore?: number;
    awayScore?: number;
    createdAt: string;
    updatedAt: string;
}

// Inning Types
export interface Inning {
    id: string;
    gameId: string;
    inningNumber: number;
    half: InningHalf;
    runs: number;
    hits: number;
    errors: number;
    createdAt: string;
}

// At-Bat Types
export interface AtBat {
    id: string;
    gameId: string;
    inningId: string;
    batterId: string;
    pitcherId: string;
    balls: number;
    strikes: number;
    outs: number;
    result?: string;
    rbis?: number;
    startedAt: string;
    endedAt?: string;
    createdAt: string;
}

// Pitch Types
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
    atBatId: string;
    pitchNumber: number;
    pitchType: PitchType;
    velocity?: number;
    locationX?: number; // 0-1 normalized (0 = left, 1 = right)
    locationY?: number; // 0-1 normalized (0 = top, 1 = bottom)
    zone?: string;
    result: PitchResult;
    createdAt: string;
}

// Play Types (Ball in Play)
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
    atBatId: string;
    pitchId?: string;
    contactType?: ContactType;
    contactQuality?: ContactQuality;
    hitDirection?: HitDirection;
    fieldLocation?: FieldLocation;
    hitDepth?: HitDepth;
    hitResult?: HitResult;
    outType?: OutType;
    fieldedByPosition?: PlayerPosition;
    isError: boolean;
    runsScored?: number;
    createdAt: string;
}

// Analytics Types
export interface BatterHistory {
    batterId: string;
    batterName: string;
    pitcherId?: string;
    pitcherName?: string;
    atBats: AtBatWithPitches[];
    stats: {
        totalAtBats: number;
        hits: number;
        walks: number;
        strikeouts: number;
        avg?: number;
    };
}

export interface AtBatWithPitches extends AtBat {
    pitches: Pitch[];
    play?: Play;
}

export interface PitchLocationHeatMap {
    batterId: string;
    pitcherId?: string;
    zones: {
        [zone: string]: {
            count: number;
            swings: number;
            hits: number;
            avg: number;
        };
    };
}

export interface SprayChart {
    batterId: string;
    plays: Play[];
}
