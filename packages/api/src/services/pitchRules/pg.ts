import type { AgeDivision } from '../../types';
import { daysBetween } from './db';
import type { EligibilityInput, EligibilityResult } from './types';

// Perfect Game rules — daily max + tiered rest by age division.

const DAILY_MAX: Record<AgeDivision, number> = {
    '8U': 50,
    '10U': 75,
    '12U': 85,
    '14U': 95,
    '16U': 95,
    '18U': 105,
};

interface RestTier {
    upTo: number;
    days: number;
}

// 7-14 age groups (8U / 10U / 12U / 14U): 1-20 / 21-35 / 36-50 / 51-65 / 66+.
const REST_TIERS_YOUNG: RestTier[] = [
    { upTo: 20, days: 0 },
    { upTo: 35, days: 1 },
    { upTo: 50, days: 2 },
    { upTo: 65, days: 3 },
    { upTo: Infinity, days: 4 },
];

// 15-16: 1-30 / 31-45 / 46-60 / 61-75 / 76+.
const REST_TIERS_15_16: RestTier[] = [
    { upTo: 30, days: 0 },
    { upTo: 45, days: 1 },
    { upTo: 60, days: 2 },
    { upTo: 75, days: 3 },
    { upTo: Infinity, days: 4 },
];

// 17-18: 1-30 / 31-45 / 46-60 / 61-80 / 81+.
const REST_TIERS_17_18: RestTier[] = [
    { upTo: 30, days: 0 },
    { upTo: 45, days: 1 },
    { upTo: 60, days: 2 },
    { upTo: 80, days: 3 },
    { upTo: Infinity, days: 4 },
];

export function getDailyMax(div: AgeDivision): number {
    return DAILY_MAX[div];
}

export function getRestTiers(div: AgeDivision): RestTier[] {
    if (div === '16U') return REST_TIERS_15_16;
    if (div === '18U') return REST_TIERS_17_18;
    // 8U / 10U / 12U / 14U
    return REST_TIERS_YOUNG;
}

export function getRestRequiredAfter(pitchCount: number, div: AgeDivision): { days: number; tier: string } {
    const tiers = getRestTiers(div);
    for (const tier of tiers) {
        if (pitchCount <= tier.upTo) {
            return { days: tier.days, tier: `≤${tier.upTo === Infinity ? '∞' : tier.upTo}` };
        }
    }
    // Unreachable — last tier is Infinity.
    return { days: 4, tier: '≤∞' };
}

export function evaluate(input: EligibilityInput): EligibilityResult {
    const { sanction, age_division, history, game_date } = input;
    const baseFields = {
        sanction,
        age_division,
        pitches_today: history.pitches_today,
        games_pitched_today: history.games_today.length,
        consecutive_days_pitched: history.consecutive_days_pitched,
        days_since_last_pitched: history.last_appearance ? daysBetween(history.last_appearance.date, game_date) : null,
    };

    if (!age_division) {
        return {
            ...baseFields,
            eligibility: 'unknown_division',
            reasons: ['Set team age division to enforce PG rules'],
            daily_max: null,
            rest_required_days: 0,
        };
    }

    const daily_max = getDailyMax(age_division);
    const reasons: string[] = [];

    // Rule 1: 3 consecutive days = blocked regardless of pitch counts.
    if (history.consecutive_days_pitched >= 2) {
        reasons.push('3rd consecutive day — no pitcher may pitch 3 days in a row');
    }

    // Rule 2: 2 games today already → no 3rd.
    if (history.games_today.length >= 2) {
        reasons.push('Already pitched 2 games today — max 2 per day');
    }

    // Rule 3: 1 game today with >20 pitches → no 2nd game.
    if (
        history.games_today.length === 1 &&
        history.games_today[0].pitches > 20 &&
        history.games_today[0].game_id !== input.game_id
    ) {
        reasons.push(`Threw ${history.games_today[0].pitches} pitches in game 1 today — only ≤20 allows a 2nd game`);
    }

    // Rule 4: required rest still active from last appearance.
    let rest_required_days = 0;
    if (history.last_appearance) {
        const restTier = getRestRequiredAfter(history.last_appearance.pitches, age_division);
        const daysElapsed = daysBetween(history.last_appearance.date, game_date);
        const remaining = restTier.days - daysElapsed;
        if (remaining > 0) {
            rest_required_days = remaining;
            reasons.push(
                `Needs ${remaining} more day${remaining === 1 ? '' : 's'} rest (threw ${history.last_appearance.pitches} on ${history.last_appearance.date})`
            );
        }
    }

    // Rule 5: daily max already reached today.
    if (history.pitches_today >= daily_max) {
        reasons.push(`Already at daily max (${history.pitches_today}/${daily_max})`);
    }

    return {
        ...baseFields,
        eligibility: reasons.length === 0 ? 'eligible' : 'ineligible',
        reasons,
        daily_max,
        rest_required_days,
    };
}
