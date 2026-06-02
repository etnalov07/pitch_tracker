import type { AgeDivision } from '../../types';
import { evaluate, getDailyMax, getRestRequiredAfter } from '../pitchRules/pg';
import type { PitcherHistory } from '../pitchRules/types';

function emptyHistory(): PitcherHistory {
    return { pitches_today: 0, games_today: [], last_appearance: null, consecutive_days_pitched: 0 };
}

function input(opts: { game_date?: string; age_division?: AgeDivision | null; history?: PitcherHistory } = {}) {
    return {
        pitcher_id: 'p1',
        game_id: 'g1',
        game_date: opts.game_date ?? '2026-06-15',
        sanction: 'PG' as const,
        // `??` would coerce explicit null → default; use `in` to honor explicit null from the caller.
        age_division: ('age_division' in opts ? opts.age_division : ('14U' as AgeDivision)) ?? null,
        history: opts.history ?? emptyHistory(),
    };
}

describe('pg.getDailyMax', () => {
    it.each([
        ['8U', 50],
        ['10U', 75],
        ['12U', 85],
        ['14U', 95],
        ['16U', 95],
        ['18U', 105],
    ] as Array<[AgeDivision, number]>)('returns the published max for %s', (div, expected) => {
        expect(getDailyMax(div)).toBe(expected);
    });
});

describe('pg.getRestRequiredAfter — 7-14 tiers (1-20 / 21-35 / 36-50 / 51-65 / 66+)', () => {
    const div: AgeDivision = '14U';
    it('1 pitch → 0 days rest', () => expect(getRestRequiredAfter(1, div).days).toBe(0));
    it('20 pitches → 0 days rest', () => expect(getRestRequiredAfter(20, div).days).toBe(0));
    it('21 pitches → 1 day rest', () => expect(getRestRequiredAfter(21, div).days).toBe(1));
    it('35 pitches → 1 day rest', () => expect(getRestRequiredAfter(35, div).days).toBe(1));
    it('36 pitches → 2 days rest', () => expect(getRestRequiredAfter(36, div).days).toBe(2));
    it('50 pitches → 2 days rest', () => expect(getRestRequiredAfter(50, div).days).toBe(2));
    it('51 pitches → 3 days rest', () => expect(getRestRequiredAfter(51, div).days).toBe(3));
    it('65 pitches → 3 days rest', () => expect(getRestRequiredAfter(65, div).days).toBe(3));
    it('66 pitches → 4 days rest', () => expect(getRestRequiredAfter(66, div).days).toBe(4));
    it('95 pitches → 4 days rest', () => expect(getRestRequiredAfter(95, div).days).toBe(4));
});

describe('pg.getRestRequiredAfter — 15-16 tiers (1-30 / 31-45 / 46-60 / 61-75 / 76+)', () => {
    const div: AgeDivision = '16U';
    it('30 → 0', () => expect(getRestRequiredAfter(30, div).days).toBe(0));
    it('31 → 1', () => expect(getRestRequiredAfter(31, div).days).toBe(1));
    it('45 → 1', () => expect(getRestRequiredAfter(45, div).days).toBe(1));
    it('46 → 2', () => expect(getRestRequiredAfter(46, div).days).toBe(2));
    it('60 → 2', () => expect(getRestRequiredAfter(60, div).days).toBe(2));
    it('61 → 3', () => expect(getRestRequiredAfter(61, div).days).toBe(3));
    it('75 → 3', () => expect(getRestRequiredAfter(75, div).days).toBe(3));
    it('76 → 4', () => expect(getRestRequiredAfter(76, div).days).toBe(4));
});

describe('pg.getRestRequiredAfter — 17-18 tiers (1-30 / 31-45 / 46-60 / 61-80 / 81+)', () => {
    const div: AgeDivision = '18U';
    it('30 → 0', () => expect(getRestRequiredAfter(30, div).days).toBe(0));
    it('60 → 2', () => expect(getRestRequiredAfter(60, div).days).toBe(2));
    it('61 → 3', () => expect(getRestRequiredAfter(61, div).days).toBe(3));
    it('80 → 3', () => expect(getRestRequiredAfter(80, div).days).toBe(3));
    it('81 → 4', () => expect(getRestRequiredAfter(81, div).days).toBe(4));
});

describe('pg.evaluate — selection eligibility', () => {
    it('eligible when no history and age set', () => {
        const r = evaluate(input());
        expect(r.eligibility).toBe('eligible');
        expect(r.reasons).toEqual([]);
        expect(r.daily_max).toBe(95);
    });

    it('returns unknown_division when no age set', () => {
        const r = evaluate(input({ age_division: null }));
        expect(r.eligibility).toBe('unknown_division');
        expect(r.daily_max).toBeNull();
    });

    it('blocks on 3rd consecutive day', () => {
        const r = evaluate(input({ history: { ...emptyHistory(), consecutive_days_pitched: 2 } }));
        expect(r.eligibility).toBe('ineligible');
        expect(r.reasons.join(' ')).toMatch(/3 days in a row/);
    });

    it('blocks when 2 games already pitched today', () => {
        const r = evaluate(
            input({
                history: {
                    ...emptyHistory(),
                    games_today: [
                        { game_id: 'g0', pitches: 10 },
                        { game_id: 'g1', pitches: 5 },
                    ],
                    pitches_today: 15,
                },
            })
        );
        expect(r.eligibility).toBe('ineligible');
        expect(r.reasons.join(' ')).toMatch(/max 2 per day/);
    });

    it('blocks 2nd game when game 1 was >20 pitches', () => {
        // gameUnderEval is 'g_new'; existing game today is 'g0' with 25 pitches.
        const r = evaluate({
            ...input(),
            game_id: 'g_new',
            history: {
                ...emptyHistory(),
                games_today: [{ game_id: 'g0', pitches: 25 }],
                pitches_today: 25,
            },
        });
        expect(r.eligibility).toBe('ineligible');
        expect(r.reasons.join(' ')).toMatch(/Threw 25 pitches in game 1/);
    });

    it('allows 2nd game when game 1 was ≤20 pitches', () => {
        const r = evaluate({
            ...input(),
            game_id: 'g_new',
            history: {
                ...emptyHistory(),
                games_today: [{ game_id: 'g0', pitches: 18 }],
                pitches_today: 18,
            },
        });
        expect(r.eligibility).toBe('eligible');
    });

    it('blocks when required rest from a prior day is still active', () => {
        // 14U pitcher threw 95 yesterday → needs 4 days. Only 1 day elapsed → 3 days remaining.
        const r = evaluate(
            input({
                game_date: '2026-06-15',
                history: {
                    ...emptyHistory(),
                    last_appearance: { date: '2026-06-14', pitches: 95 },
                },
            })
        );
        expect(r.eligibility).toBe('ineligible');
        expect(r.rest_required_days).toBe(3);
        expect(r.reasons.join(' ')).toMatch(/3 more days rest/);
    });

    it('allows when required rest has elapsed', () => {
        const r = evaluate(
            input({
                game_date: '2026-06-19',
                history: {
                    ...emptyHistory(),
                    last_appearance: { date: '2026-06-14', pitches: 95 },
                },
            })
        );
        expect(r.eligibility).toBe('eligible');
        expect(r.rest_required_days).toBe(0);
    });

    it('blocks when today already at daily max', () => {
        const r = evaluate(
            input({
                history: {
                    ...emptyHistory(),
                    pitches_today: 95,
                    games_today: [{ game_id: 'g0', pitches: 95 }],
                },
            })
        );
        expect(r.eligibility).toBe('ineligible');
        expect(r.reasons.join(' ')).toMatch(/Already at daily max/);
    });
});
