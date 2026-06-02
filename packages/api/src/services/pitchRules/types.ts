import type { AgeDivision, Sanction } from '../../types';

// Pitch-rules engine shared contracts.

export type EligibilityState = 'eligible' | 'ineligible' | 'unknown_division' | 'unknown_rules';

export interface PitcherHistory {
    // SUM of pitches by this pitcher today across all games.
    pitches_today: number;
    // Per-game breakdown of today's appearances (for "≤20 in game 1 allows game 2" PG check).
    games_today: { game_id: string; pitches: number }[];
    // Most recent calendar day this pitcher threw (excluding today). null = no prior appearance.
    last_appearance: { date: string; pitches: number } | null;
    // Distinct calendar days in (today-1, today-2) that this pitcher threw.
    // 2 → today would be 3-in-a-row → blocked.
    consecutive_days_pitched: number;
}

export interface EligibilityInput {
    pitcher_id: string;
    game_id: string;
    game_date: string; // YYYY-MM-DD
    sanction: Sanction | null;
    age_division: AgeDivision | null;
    history: PitcherHistory;
}

export interface EligibilityResult {
    sanction: Sanction | null;
    age_division: AgeDivision | null;
    eligibility: EligibilityState;
    reasons: string[];
    pitches_today: number;
    games_pitched_today: number;
    daily_max: number | null;
    rest_required_days: number;
    days_since_last_pitched: number | null;
    consecutive_days_pitched: number;
}
