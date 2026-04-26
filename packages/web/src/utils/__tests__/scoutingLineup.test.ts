import { buildLineupPayload, buildPitcherPayload } from '../scoutingLineup';

interface LineupEntry {
    player_name: string;
    batting_order: number;
    position: string;
    bats: 'R' | 'L' | 'S';
}

describe('buildLineupPayload', () => {
    const entries: LineupEntry[] = [
        { player_name: 'Smith', batting_order: 1, position: 'SS', bats: 'R' },
        { player_name: 'Jones', batting_order: 2, position: 'CF', bats: 'L' },
        { player_name: '', batting_order: 3, position: '', bats: 'R' },
    ];

    it('stamps every player with the given team_side', () => {
        const result = buildLineupPayload(entries, 'away');
        result.forEach((p) => expect(p.team_side).toBe('away'));
    });

    it('stamps home side correctly', () => {
        const result = buildLineupPayload(entries, 'home');
        result.forEach((p) => expect(p.team_side).toBe('home'));
    });

    it('filters out empty player names', () => {
        const result = buildLineupPayload(entries, 'away');
        expect(result).toHaveLength(2);
        expect(result.every((p) => p.player_name.trim() !== '')).toBe(true);
    });

    it('sets is_starter true for all entries', () => {
        const result = buildLineupPayload(entries, 'home');
        result.forEach((p) => expect(p.is_starter).toBe(true));
    });

    it('preserves batting_order and position', () => {
        const result = buildLineupPayload(entries, 'away');
        expect(result[0]).toMatchObject({ batting_order: 1, position: 'SS' });
        expect(result[1]).toMatchObject({ batting_order: 2, position: 'CF' });
    });

    it('returns empty array when all names are blank', () => {
        const blank: LineupEntry[] = [{ player_name: '', batting_order: 1, position: '', bats: 'R' }];
        expect(buildLineupPayload(blank, 'away')).toHaveLength(0);
    });
});

describe('buildPitcherPayload', () => {
    it('includes team_side in the payload', () => {
        const result = buildPitcherPayload('game-1', 'Smith', 42, 'R', 'Opponents', 'home');
        expect(result?.team_side).toBe('home');
    });

    it('returns null when pitcher name is empty', () => {
        expect(buildPitcherPayload('game-1', '', null, 'R', 'Opponents', 'away')).toBeNull();
        expect(buildPitcherPayload('game-1', '   ', null, 'R', 'Opponents', 'away')).toBeNull();
    });

    it('includes all required fields', () => {
        const result = buildPitcherPayload('game-1', 'Jones', 22, 'L', 'Home Team', 'away');
        expect(result).toMatchObject({
            game_id: 'game-1',
            pitcher_name: 'Jones',
            jersey_number: 22,
            throws: 'L',
            team_name: 'Home Team',
            team_side: 'away',
        });
    });
});
