import type { AgeDivision } from '../../types';
import { evaluate, getDailyMax, getRestRequiredAfter } from '../pitchRules/pbr';
import type { PitcherHistory } from '../pitchRules/types';

function emptyHistory(): PitcherHistory {
    return { pitches_today: 0, games_today: [], last_appearance: null, consecutive_days_pitched: 0 };
}

function input(opts: { game_date?: string; age_division?: AgeDivision | null; history?: PitcherHistory } = {}) {
    return {
        pitcher_id: 'p1',
        game_id: 'g1',
        game_date: opts.game_date ?? '2026-06-15',
        sanction: 'PBR' as const,
        age_division: ('age_division' in opts ? opts.age_division : ('14U' as AgeDivision)) ?? null,
        history: opts.history ?? emptyHistory(),
    };
}

describe('pbr.getDailyMax', () => {
    it.each([
        ['14U', 95],
        ['16U', 95],
        ['18U', 105],
    ] as Array<[AgeDivision, number]>)('returns the PBR max for %s', (div, expected) => {
        expect(getDailyMax(div)).toBe(expected);
    });

    it.each([['8U'], ['10U'], ['12U']] as Array<[AgeDivision]>)('returns null for uncovered %s', (div) => {
        expect(getDailyMax(div)).toBeNull();
    });
});

describe('pbr.getRestRequiredAfter — 13-14 tier (1-20 / 21-35 / 36-50 / 51-65 / 66+)', () => {
    const div: AgeDivision = '14U';
    it('20 → 0 days', () => expect(getRestRequiredAfter(20, div)?.days).toBe(0));
    it('21 → 1 day', () => expect(getRestRequiredAfter(21, div)?.days).toBe(1));
    it('35 → 1 day', () => expect(getRestRequiredAfter(35, div)?.days).toBe(1));
    it('36 → 2 days', () => expect(getRestRequiredAfter(36, div)?.days).toBe(2));
    it('50 → 2 days', () => expect(getRestRequiredAfter(50, div)?.days).toBe(2));
    it('51 → 3 days', () => expect(getRestRequiredAfter(51, div)?.days).toBe(3));
    it('65 → 3 days', () => expect(getRestRequiredAfter(65, div)?.days).toBe(3));
    it('66 → 4 days', () => expect(getRestRequiredAfter(66, div)?.days).toBe(4));
});

describe('pbr.getRestRequiredAfter — 15-16 tier (1-30 / 31-45 / 46-60 / 61-75 / 76+)', () => {
    const div: AgeDivision = '16U';
    it('30 → 0', () => expect(getRestRequiredAfter(30, div)?.days).toBe(0));
    it('31 → 1', () => expect(getRestRequiredAfter(31, div)?.days).toBe(1));
    it('45 → 1', () => expect(getRestRequiredAfter(45, div)?.days).toBe(1));
    it('46 → 2', () => expect(getRestRequiredAfter(46, div)?.days).toBe(2));
    it('60 → 2', () => expect(getRestRequiredAfter(60, div)?.days).toBe(2));
    it('61 → 3', () => expect(getRestRequiredAfter(61, div)?.days).toBe(3));
    it('75 → 3', () => expect(getRestRequiredAfter(75, div)?.days).toBe(3));
    it('76 → 4', () => expect(getRestRequiredAfter(76, div)?.days).toBe(4));
});

describe('pbr.getRestRequiredAfter — 17-18 tier (1-30 / 31-45 / 46-60 / 61-75 / 76+)', () => {
    const div: AgeDivision = '18U';
    it('30 → 0', () => expect(getRestRequiredAfter(30, div)?.days).toBe(0));
    it('60 → 2', () => expect(getRestRequiredAfter(60, div)?.days).toBe(2));
    it('61 → 3', () => expect(getRestRequiredAfter(61, div)?.days).toBe(3));
    it('75 → 3', () => expect(getRestRequiredAfter(75, div)?.days).toBe(3));
    it('76 → 4', () => expect(getRestRequiredAfter(76, div)?.days).toBe(4));

    // The PBR 17-18 row is one tier tighter than PG 17-18 at the top:
    // PBR 76+ → 4 days (PG would require 81 to push into 4 days).
    it('80 → 4 days (PBR is tighter than PG 17-18 at the top)', () => {
        expect(getRestRequiredAfter(80, div)?.days).toBe(4);
    });
});

describe('pbr.evaluate — selection eligibility', () => {
    it('eligible when no history and age set (14U)', () => {
        const r = evaluate(input());
        expect(r.eligibility).toBe('eligible');
        expect(r.daily_max).toBe(95);
    });

    it('returns unknown_division when no age set', () => {
        const r = evaluate(input({ age_division: null }));
        expect(r.eligibility).toBe('unknown_division');
        expect(r.daily_max).toBeNull();
    });

    it('returns unknown_rules for uncovered ages (12U)', () => {
        const r = evaluate(input({ age_division: '12U' }));
        expect(r.eligibility).toBe('unknown_rules');
        expect(r.daily_max).toBeNull();
    });

    it('blocks when required rest from a prior day is still active', () => {
        // 14U threw 95 yesterday → tier ≤∞ = 4 days; 1 day elapsed → 3 remaining.
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

    it('does NOT enforce a 3-days-in-a-row rule (PBR table has no such rule)', () => {
        const r = evaluate(input({ history: { ...emptyHistory(), consecutive_days_pitched: 2 } }));
        expect(r.eligibility).toBe('eligible');
    });

    it('does NOT enforce a multi-game-per-day rule (PBR table has no such rule)', () => {
        const r = evaluate(
            input({
                history: {
                    ...emptyHistory(),
                    games_today: [{ game_id: 'g_other', pitches: 25 }],
                    pitches_today: 25,
                },
            })
        );
        expect(r.eligibility).toBe('eligible');
    });
});
