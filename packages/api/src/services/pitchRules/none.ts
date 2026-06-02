import { daysBetween } from './db';
import type { EligibilityInput, EligibilityResult } from './types';

// No sanction → no rules apply. Always eligible.

export function evaluate(input: EligibilityInput): EligibilityResult {
    const { sanction, age_division, history, game_date } = input;
    return {
        sanction,
        age_division,
        eligibility: 'eligible',
        reasons: [],
        pitches_today: history.pitches_today,
        games_pitched_today: history.games_today.length,
        daily_max: null,
        rest_required_days: 0,
        days_since_last_pitched: history.last_appearance ? daysBetween(history.last_appearance.date, game_date) : null,
        consecutive_days_pitched: history.consecutive_days_pitched,
    };
}
