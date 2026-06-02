import { query } from '../../config/database';
import type { PitcherHistory } from './types';

// All queries join pitches → games for the game_date. The
// idx_pitches_pitcher_game index added by migration 049 makes the lookup cheap.

function daysBefore(yyyymmdd: string, n: number): string {
    // Treat the input as a calendar date in UTC to avoid TZ drift on the date math.
    // Game dates are stored as DATE in Postgres so they have no time component.
    const d = new Date(yyyymmdd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
}

function formatDate(value: unknown): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'string') return value.slice(0, 10);
    return String(value);
}

export async function loadPitcherHistory(pitcherId: string, gameDate: string): Promise<PitcherHistory> {
    // pitches_today + games_today: SUM and group by game_id for games on the same calendar day.
    const todayResult = await query(
        `SELECT g.id AS game_id, COUNT(*)::int AS pitches
         FROM pitches p
         JOIN games g ON p.game_id = g.id
         WHERE p.pitcher_id = $1 AND g.game_date = $2
         GROUP BY g.id`,
        [pitcherId, gameDate]
    );
    const games_today: { game_id: string; pitches: number }[] = todayResult.rows.map((r: any) => ({
        game_id: r.game_id,
        pitches: r.pitches,
    }));
    const pitches_today = games_today.reduce((sum, g) => sum + g.pitches, 0);

    // last_appearance: most recent calendar day strictly before today with > 0 pitches.
    const lastResult = await query(
        `SELECT g.game_date AS day, COUNT(*)::int AS pitches
         FROM pitches p
         JOIN games g ON p.game_id = g.id
         WHERE p.pitcher_id = $1 AND g.game_date < $2
         GROUP BY g.game_date
         ORDER BY g.game_date DESC
         LIMIT 1`,
        [pitcherId, gameDate]
    );
    const last_appearance =
        lastResult.rows.length === 0 ? null : { date: formatDate(lastResult.rows[0].day), pitches: lastResult.rows[0].pitches };

    // consecutive_days_pitched: distinct days in (today-1, today-2) with any pitches.
    const yesterday = daysBefore(gameDate, 1);
    const dayBefore = daysBefore(gameDate, 2);
    const consecResult = await query(
        `SELECT DISTINCT g.game_date AS day
         FROM pitches p
         JOIN games g ON p.game_id = g.id
         WHERE p.pitcher_id = $1 AND g.game_date IN ($2, $3)`,
        [pitcherId, yesterday, dayBefore]
    );
    const consecutive_days_pitched = consecResult.rows.length;

    return {
        pitches_today,
        games_today,
        last_appearance,
        consecutive_days_pitched,
    };
}

// Calendar-day difference. Both args are YYYY-MM-DD. Returns positive number of
// whole days from `from` to `to` (to - from). Useful for "days since last pitched."
export function daysBetween(from: string, to: string): number {
    const a = new Date(from + 'T00:00:00Z').getTime();
    const b = new Date(to + 'T00:00:00Z').getTime();
    return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}
