export interface LineupEntry {
    player_name: string;
    batting_order: number;
    position: string;
    bats: 'R' | 'L' | 'S';
}

export interface LineupPayloadPlayer {
    player_name: string;
    batting_order: number;
    position?: string;
    bats: 'R' | 'L' | 'S';
    is_starter: true;
    team_side: 'home' | 'away';
}

export interface PitcherPayload {
    game_id: string;
    pitcher_name: string;
    jersey_number: number | null;
    throws: 'R' | 'L';
    team_name: string;
    team_side: 'home' | 'away';
}

export function buildLineupPayload(entries: LineupEntry[], teamSide: 'home' | 'away'): LineupPayloadPlayer[] {
    return entries
        .filter((e) => e.player_name.trim() !== '')
        .map((e) => ({
            player_name: e.player_name.trim(),
            batting_order: e.batting_order,
            position: e.position || undefined,
            bats: e.bats,
            is_starter: true as const,
            team_side: teamSide,
        }));
}

export function buildPitcherPayload(
    gameId: string,
    name: string,
    jersey: number | null,
    throws: 'R' | 'L',
    teamName: string,
    teamSide: 'home' | 'away'
): PitcherPayload | null {
    if (!name.trim()) return null;
    return {
        game_id: gameId,
        pitcher_name: name.trim(),
        jersey_number: jersey,
        throws,
        team_name: teamName,
        team_side: teamSide,
    };
}
