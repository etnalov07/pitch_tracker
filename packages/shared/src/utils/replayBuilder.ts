import { AtBat, Pitch } from '../index';

export interface ReplayAtBat {
    atBat: AtBat;
    pitches: Pitch[];
    batterDisplayName: string;
    pitcherDisplayName: string;
}

export function filterUserPitcherPitches(pitches: Pitch[]): Pitch[] {
    // Accept a pitch as "our pitcher" if either:
    //   - team_side === 'our_team' (modern path), or
    //   - team_side is null/undefined but pitcher_id is set (legacy — pitches
    //     predating team_side don't have it; the API's getGamePitches inner-
    //     joins on players, so any returned pitch with a valid pitcher_id was
    //     logged by a player on our roster).
    return pitches.filter((p) => p.team_side === 'our_team' || (!p.team_side && !!p.pitcher_id));
}

export function groupPitchesByAtBat(pitches: Pitch[]): Map<string, Pitch[]> {
    const grouped = new Map<string, Pitch[]>();
    for (const p of pitches) {
        const list = grouped.get(p.at_bat_id);
        if (list) list.push(p);
        else grouped.set(p.at_bat_id, [p]);
    }
    for (const list of grouped.values()) {
        list.sort((a, b) => {
            if (a.pitch_number !== b.pitch_number) return a.pitch_number - b.pitch_number;
            return a.created_at.localeCompare(b.created_at);
        });
    }
    return grouped;
}

// Looks up first/last from API-joined fields on Pitch (the Pitch type doesn't
// declare them). Defensive read with a fallback.
function pickJoinedName(
    pitch: Pitch | undefined,
    firstKey: string,
    lastKey: string,
    fallbackKey: string | null,
    fallback: string
): string {
    if (!pitch) return fallback;
    const p = pitch as unknown as Record<string, unknown>;
    const first = typeof p[firstKey] === 'string' ? (p[firstKey] as string) : '';
    const last = typeof p[lastKey] === 'string' ? (p[lastKey] as string) : '';
    if (first || last) return `${first ? first[0] + '. ' : ''}${last}`.trim();
    if (fallbackKey && typeof p[fallbackKey] === 'string' && p[fallbackKey]) return p[fallbackKey] as string;
    return fallback;
}

export interface ReplayLookups {
    /** Map opponent_batter_id → display name (sourced from opponent lineup). */
    batterNameByOpponentId?: Map<string, string>;
    /** Map pitcher_id → display name (sourced from game pitchers). */
    pitcherNameByPlayerId?: Map<string, string>;
}

function pickBatterName(pitch: Pitch | undefined, lookups?: ReplayLookups): string {
    // For opp batters the API's INNER JOIN on players(batter_id) misses (the
    // batter lives in opponent_lineup); prefer the caller-supplied lookup.
    if (pitch?.opponent_batter_id && lookups?.batterNameByOpponentId) {
        const fromMap = lookups.batterNameByOpponentId.get(pitch.opponent_batter_id);
        if (fromMap) return fromMap;
    }
    return pickJoinedName(pitch, 'batter_first_name', 'batter_last_name', 'batter_name', 'Batter');
}

function pickPitcherName(pitch: Pitch | undefined, lookups?: ReplayLookups): string {
    if (pitch?.pitcher_id && lookups?.pitcherNameByPlayerId) {
        const fromMap = lookups.pitcherNameByPlayerId.get(pitch.pitcher_id);
        if (fromMap) return fromMap;
    }
    return pickJoinedName(pitch, 'pitcher_first_name', 'pitcher_last_name', 'pitcher_name', 'Pitcher');
}

export function buildReplaySequence(pitches: Pitch[], atBats: AtBat[], lookups?: ReplayLookups): ReplayAtBat[] {
    const ourPitches = filterUserPitcherPitches(pitches);
    const grouped = groupPitchesByAtBat(ourPitches);

    return atBats
        .filter((ab) => grouped.has(ab.id))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((ab) => {
            const abPitches = grouped.get(ab.id) ?? [];
            return {
                atBat: ab,
                pitches: abPitches,
                batterDisplayName: pickBatterName(abPitches[0], lookups),
                pitcherDisplayName: pickPitcherName(abPitches[0], lookups),
            };
        });
}
