import { AtBat, Pitch } from '../index';

export interface ReplayAtBat {
    atBat: AtBat;
    pitches: Pitch[];
    batterDisplayName: string;
}

export function filterUserPitcherPitches(pitches: Pitch[]): Pitch[] {
    return pitches.filter((p) => p.team_side === 'our_team');
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

// Looks up batter first/last from any field the API joins onto Pitch payloads
// (e.g., batter_first_name / batter_last_name). The Pitch type doesn't declare
// these — we read them defensively and fall back to "Batter".
function pickBatterName(pitch: Pitch | undefined): string {
    if (!pitch) return 'Batter';
    const p = pitch as unknown as Record<string, unknown>;
    const first = typeof p.batter_first_name === 'string' ? p.batter_first_name : '';
    const last = typeof p.batter_last_name === 'string' ? p.batter_last_name : '';
    if (first || last) return `${first ? first[0] + '. ' : ''}${last}`.trim();
    if (typeof p.batter_name === 'string' && p.batter_name) return p.batter_name;
    return 'Batter';
}

export function buildReplaySequence(pitches: Pitch[], atBats: AtBat[]): ReplayAtBat[] {
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
                batterDisplayName: pickBatterName(abPitches[0]),
            };
        });
}
