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

describe('pbr.evaluate — stub', () => {
    it('returns unknown_rules and never blocks', () => {
        const r = evalPbr({ ...baseInput, sanction: 'PBR' });
        expect(r.eligibility).toBe('unknown_rules');
        expect(r.reasons.join(' ')).toMatch(/PBR rules not yet configured/);
        expect(r.daily_max).toBeNull();
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
