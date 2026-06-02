import { daysBetween } from './db';
import type { EligibilityInput, EligibilityResult } from './types';

// High School (NFHS) rules — v1 enforces only the per-game 110-pitch cap with
// mid-AB grace. State-specific rest schedules vary; deferred.
//
// For selection: eligibility is ALWAYS 'eligible'. The 110 cap is surfaced on
// the live PitcherStats counter at pitch entry, not at selection. Mid-AB grace
// means a pitcher under 110 may finish the current batter.

export const HS_DAILY_MAX = 110;

export function evaluate(input: EligibilityInput): EligibilityResult {
    const { sanction, age_division, history, game_date } = input;
    return {
        sanction,
        age_division,
        eligibility: 'eligible',
        reasons: [],
        pitches_today: history.pitches_today,
        games_pitched_today: history.games_today.length,
        daily_max: HS_DAILY_MAX,
        rest_required_days: 0,
        days_since_last_pitched: history.last_appearance ? daysBetween(history.last_appearance.date, game_date) : null,
        consecutive_days_pitched: history.consecutive_days_pitched,
    };
}
