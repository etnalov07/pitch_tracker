import { evaluate as evalHs, HS_DAILY_MAX } from '../pitchRules/hs';
import { evaluate as evalPbr } from '../pitchRules/pbr';
import { evaluate as evalNone } from '../pitchRules/none';
import type { PitcherHistory } from '../pitchRules/types';

const baseHistory: PitcherHistory = {
    pitches_today: 0,
    games_today: [],
    last_appearance: null,
    consecutive_days_pitched: 0,
};

const baseInput = {
    pitcher_id: 'p1',
    game_id: 'g1',
    game_date: '2026-06-15',
    age_division: null,
    history: baseHistory,
};

describe('hs.evaluate', () => {
    it('always eligible at selection time (cap is enforced at pitch entry)', () => {
        const r = evalHs({ ...baseInput, sanction: 'HS' });
        expect(r.eligibility).toBe('eligible');
        expect(r.daily_max).toBe(HS_DAILY_MAX);
        expect(r.daily_max).toBe(110);
    });

    it('stays eligible even when pitcher already at 110 today', () => {
        const r = evalHs({
            ...baseInput,
            sanction: 'HS',
            history: { ...baseHistory, pitches_today: 110, games_today: [{ game_id: 'g0', pitches: 110 }] },
        });
        expect(r.eligibility).toBe('eligible');
    });
});

describe('pbr.evaluate — high-level behaviors', () => {
    // Detailed table-driven coverage lives in pitchRules.pbr.test.ts; these
    // smoke tests just pin the three dispatcher states the UI cares about.

    it('returns unknown_division when no age set (caveat chip, no block)', () => {
        const r = evalPbr({ ...baseInput, sanction: 'PBR' });
        expect(r.eligibility).toBe('unknown_division');
        expect(r.daily_max).toBeNull();
    });

    it('returns unknown_rules for 12U (outside PBR coverage)', () => {
        const r = evalPbr({ ...baseInput, sanction: 'PBR', age_division: '12U' });
        expect(r.eligibility).toBe('unknown_rules');
        expect(r.reasons.join(' ')).toMatch(/only cover 14U\/16U\/18U/);
    });

    it('eligible at 14U with empty history', () => {
        const r = evalPbr({ ...baseInput, sanction: 'PBR', age_division: '14U' });
        expect(r.eligibility).toBe('eligible');
        expect(r.daily_max).toBe(95);
    });
});

describe('none.evaluate', () => {
    it('always eligible', () => {
        const r = evalNone({ ...baseInput, sanction: 'NONE' });
        expect(r.eligibility).toBe('eligible');
        expect(r.reasons).toEqual([]);
        expect(r.daily_max).toBeNull();
    });

    it('eligible regardless of history', () => {
        const r = evalNone({
            ...baseInput,
            sanction: 'NONE',
            history: { ...baseHistory, pitches_today: 999, consecutive_days_pitched: 5 },
        });
        expect(r.eligibility).toBe('eligible');
    });
});
