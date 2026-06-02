import { daysBetween } from './db';
import type { EligibilityInput, EligibilityResult } from './types';

// PBR (Prep Baseball Report) — STUB.
//
// The PBR rules table has not been supplied. Until it is, this engine returns
// 'unknown_rules' so the UI shows a caveat chip but does NOT block selection.
// Replacing the body of evaluate() with the real table is a 1-day follow-up.

export function evaluate(input: EligibilityInput): EligibilityResult {
    const { sanction, age_division, history, game_date } = input;
    return {
        sanction,
        age_division,
        eligibility: 'unknown_rules',
        reasons: ['PBR rules not yet configured — verify manually'],
        pitches_today: history.pitches_today,
        games_pitched_today: history.games_today.length,
        daily_max: null,
        rest_required_days: 0,
        days_since_last_pitched: history.last_appearance ? daysBetween(history.last_appearance.date, game_date) : null,
        consecutive_days_pitched: history.consecutive_days_pitched,
    };
}
