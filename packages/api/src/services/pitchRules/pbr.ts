import type { AgeDivision } from '../../types';
import { daysBetween } from './db';
import type { EligibilityInput, EligibilityResult } from './types';

// PBR (Prep Baseball Report) — Kansas City Events guideline table.
// Source: user-supplied from Prep Baseball KC tournament documentation.
//
// PBR rules are GUIDELINES — tournament officials do not police them. The app
// hard-blocks anyway because nobody else is checking; the goal is the kid's arm,
// not the tournament's compliance.
//
// Coverage gap: the PBR table only covers 13-14 / 15-16 / 17-18 (mapped to our
// 14U / 16U / 18U divisions). Younger divisions (8U / 10U / 12U) return
// 'unknown_rules' — caveat chip, no block.

const DAILY_MAX: Partial<Record<AgeDivision, number>> = {
    '14U': 95, // covers ages 13-14
    '16U': 95, // covers ages 15-16
    '18U': 105, // covers ages 17-18
};

interface RestTier {
    upTo: number;
    days: number;
}

// 13-14: 1-20 / 21-35 / 36-50 / 51-65 / 66+
const REST_TIERS_13_14: RestTier[] = [
    { upTo: 20, days: 0 },
    { upTo: 35, days: 1 },
    { upTo: 50, days: 2 },
    { upTo: 65, days: 3 },
    { upTo: Infinity, days: 4 },
];

// 15-16: 1-30 / 31-45 / 46-60 / 61-75 / 76+
const REST_TIERS_15_16: RestTier[] = [
    { upTo: 30, days: 0 },
    { upTo: 45, days: 1 },
    { upTo: 60, days: 2 },
    { upTo: 75, days: 3 },
    { upTo: Infinity, days: 4 },
];

// 17-18: 1-30 / 31-45 / 46-60 / 61-75 / 76+
// Note: PBR is one tier tighter than PG 17-18 on the top bracket
// (PG 17-18: 61-80 / 81+; PBR 17-18: 61-75 / 76+).
const REST_TIERS_17_18: RestTier[] = [
    { upTo: 30, days: 0 },
    { upTo: 45, days: 1 },
    { upTo: 60, days: 2 },
    { upTo: 75, days: 3 },
    { upTo: Infinity, days: 4 },
];

export function getDailyMax(div: AgeDivision): number | null {
    return DAILY_MAX[div] ?? null;
}

export function getRestTiers(div: AgeDivision): RestTier[] | null {
    if (div === '14U') return REST_TIERS_13_14;
    if (div === '16U') return REST_TIERS_15_16;
    if (div === '18U') return REST_TIERS_17_18;
    return null;
}

export function getRestRequiredAfter(pitchCount: number, div: AgeDivision): { days: number; tier: string } | null {
    const tiers = getRestTiers(div);
    if (!tiers) return null;
    for (const tier of tiers) {
        if (pitchCount <= tier.upTo) {
            return { days: tier.days, tier: `≤${tier.upTo === Infinity ? '∞' : tier.upTo}` };
        }
    }
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
            reasons: ['Set team age division to enforce PBR rules'],
            daily_max: null,
            rest_required_days: 0,
        };
    }

    const daily_max = getDailyMax(age_division);
    if (daily_max === null) {
        // PBR doesn't publish rules below 13U. Treat as unknown so the chip
        // shows but selection isn't blocked.
        return {
            ...baseFields,
            eligibility: 'unknown_rules',
            reasons: [`PBR rules only cover 14U/16U/18U — verify ${age_division} manually`],
            daily_max: null,
            rest_required_days: 0,
        };
    }

    const reasons: string[] = [];

    // Rule 1: required rest from most recent appearance.
    let rest_required_days = 0;
    if (history.last_appearance) {
        const restTier = getRestRequiredAfter(history.last_appearance.pitches, age_division);
        if (restTier) {
            const daysElapsed = daysBetween(history.last_appearance.date, game_date);
            const remaining = restTier.days - daysElapsed;
            if (remaining > 0) {
                rest_required_days = remaining;
                reasons.push(
                    `Needs ${remaining} more day${remaining === 1 ? '' : 's'} rest (threw ${history.last_appearance.pitches} on ${history.last_appearance.date})`
                );
            }
        }
    }

    // Rule 2: daily max already reached today.
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
