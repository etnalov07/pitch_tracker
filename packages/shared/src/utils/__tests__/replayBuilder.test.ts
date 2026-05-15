import { AtBat, Pitch } from '../../index';
import { buildReplaySequence, filterUserPitcherPitches, groupPitchesByAtBat } from '../replayBuilder';

const makePitch = (overrides: Partial<Pitch> & { id: string; at_bat_id: string; created_at: string }): Pitch => ({
    pitcher_id: 'p1',
    pitch_number: 1,
    pitch_type: 'fastball',
    balls_before: 0,
    strikes_before: 0,
    pitch_result: 'ball',
    team_side: 'our_team',
    game_id: 'g1',
    ...overrides,
});

const makeAtBat = (overrides: Partial<AtBat> & { id: string; created_at: string }): AtBat => ({
    game_id: 'g1',
    inning_id: 'i1',
    balls: 0,
    strikes: 0,
    outs_before: 0,
    outs_after: 0,
    rbi: 0,
    runs_scored: 0,
    ab_start_time: overrides.created_at,
    ...overrides,
});

describe('filterUserPitcherPitches', () => {
    it('keeps only pitches with team_side === our_team', () => {
        const pitches: Pitch[] = [
            makePitch({ id: 'a', at_bat_id: 'ab1', created_at: '1', team_side: 'our_team' }),
            makePitch({ id: 'b', at_bat_id: 'ab1', created_at: '2', team_side: 'opponent' }),
            makePitch({ id: 'c', at_bat_id: 'ab2', created_at: '3', team_side: 'our_team' }),
        ];
        expect(filterUserPitcherPitches(pitches).map((p) => p.id)).toEqual(['a', 'c']);
    });
});

describe('groupPitchesByAtBat', () => {
    it('groups pitches by at_bat_id and sorts by pitch_number then created_at', () => {
        const pitches: Pitch[] = [
            makePitch({ id: 'a', at_bat_id: 'ab1', pitch_number: 2, created_at: '2' }),
            makePitch({ id: 'b', at_bat_id: 'ab1', pitch_number: 1, created_at: '1' }),
            makePitch({ id: 'c', at_bat_id: 'ab2', pitch_number: 1, created_at: '3' }),
            makePitch({ id: 'd', at_bat_id: 'ab1', pitch_number: 1, created_at: '0' }),
        ];
        const grouped = groupPitchesByAtBat(pitches);
        expect(grouped.get('ab1')!.map((p) => p.id)).toEqual(['d', 'b', 'a']);
        expect(grouped.get('ab2')!.map((p) => p.id)).toEqual(['c']);
    });
});

describe('buildReplaySequence', () => {
    it('returns one entry per at-bat that has our-team pitches, in inning chronological order', () => {
        const pitches: Pitch[] = [
            makePitch({ id: 'p3', at_bat_id: 'ab2', pitch_number: 1, created_at: '21' }),
            makePitch({ id: 'p1', at_bat_id: 'ab1', pitch_number: 1, created_at: '11' }),
            makePitch({ id: 'p2', at_bat_id: 'ab1', pitch_number: 2, created_at: '12' }),
        ];
        const atBats: AtBat[] = [makeAtBat({ id: 'ab2', created_at: '20' }), makeAtBat({ id: 'ab1', created_at: '10' })];
        const seq = buildReplaySequence(pitches, atBats);
        expect(seq.map((s) => s.atBat.id)).toEqual(['ab1', 'ab2']);
        expect(seq[0].pitches.map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('skips at-bats with no our-team pitches', () => {
        const pitches: Pitch[] = [
            makePitch({ id: 'p1', at_bat_id: 'ab1', created_at: '1', team_side: 'opponent' }),
            makePitch({ id: 'p2', at_bat_id: 'ab2', created_at: '2', team_side: 'our_team' }),
        ];
        const atBats: AtBat[] = [makeAtBat({ id: 'ab1', created_at: '0' }), makeAtBat({ id: 'ab2', created_at: '1' })];
        const seq = buildReplaySequence(pitches, atBats);
        expect(seq.map((s) => s.atBat.id)).toEqual(['ab2']);
    });

    it('uses joined batter name fields when present', () => {
        const pitch = makePitch({ id: 'p1', at_bat_id: 'ab1', created_at: '1' });
        // Cast through unknown to attach the API-joined fields not on the Pitch type.
        (pitch as unknown as Record<string, string>).batter_first_name = 'Manny';
        (pitch as unknown as Record<string, string>).batter_last_name = 'Ramirez';
        const seq = buildReplaySequence([pitch], [makeAtBat({ id: 'ab1', created_at: '0' })]);
        expect(seq[0].batterDisplayName).toBe('M. Ramirez');
    });

    it('falls back to "Batter" when no name fields are joined', () => {
        const pitch = makePitch({ id: 'p1', at_bat_id: 'ab1', created_at: '1' });
        const seq = buildReplaySequence([pitch], [makeAtBat({ id: 'ab1', created_at: '0' })]);
        expect(seq[0].batterDisplayName).toBe('Batter');
    });
});
