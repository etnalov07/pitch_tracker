import { query } from '../../config/database';
import type { AgeDivision, Sanction } from '../../types';
import { loadPitcherHistory } from './db';
import { evaluate as evalHs } from './hs';
import { evaluate as evalNone } from './none';
import { evaluate as evalPbr } from './pbr';
import { evaluate as evalPg } from './pg';
import type { EligibilityResult, PitcherHistory } from './types';

export type { EligibilityResult, EligibilityState, PitcherHistory } from './types';
export { HS_DAILY_MAX } from './hs';
export { getDailyMax as getPgDailyMax, getRestRequiredAfter as getPgRestRequiredAfter } from './pg';

interface GameContext {
    id: string;
    game_date: string;
    sanction: Sanction | null;
    age_division: AgeDivision | null;
}

async function loadGameContext(gameId: string): Promise<GameContext | null> {
    const result = await query(
        `SELECT id, game_date, sanction, age_division
         FROM games
         WHERE id = $1`,
        [gameId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const gameDate = row.game_date instanceof Date ? row.game_date.toISOString().slice(0, 10) : String(row.game_date).slice(0, 10);
    return {
        id: row.id,
        game_date: gameDate,
        sanction: row.sanction ?? null,
        age_division: row.age_division ?? null,
    };
}

function dispatch(
    sanction: Sanction | null,
    history: PitcherHistory,
    gameId: string,
    gameDate: string,
    ageDivision: AgeDivision | null,
    pitcherId: string
): EligibilityResult {
    const effective: Sanction = sanction ?? 'NONE';
    const input = {
        pitcher_id: pitcherId,
        game_id: gameId,
        game_date: gameDate,
        sanction,
        age_division: ageDivision,
        history,
    };
    switch (effective) {
        case 'PG':
            return evalPg(input);
        case 'HS':
            return evalHs(input);
        case 'PBR':
            return evalPbr(input);
        case 'NONE':
        default:
            return evalNone(input);
    }
}

/**
 * Eligibility for a single pitcher in a game.
 * Returns a structure the UI can render directly: state, human reasons, counters.
 */
export async function evaluatePitcherEligibility(pitcherId: string, gameId: string): Promise<EligibilityResult | null> {
    const game = await loadGameContext(gameId);
    if (!game) return null;
    const history = await loadPitcherHistory(pitcherId, game.game_date);
    return dispatch(game.sanction, history, gameId, game.game_date, game.age_division, pitcherId);
}

/**
 * Bulk eligibility for the PitcherSelector. Returns a map keyed by pitcher_id.
 * One game context lookup + one history query per pitcher.
 */
export async function evaluatePitchersEligibility(
    pitcherIds: string[],
    gameId: string
): Promise<Record<string, EligibilityResult>> {
    const out: Record<string, EligibilityResult> = {};
    if (pitcherIds.length === 0) return out;
    const game = await loadGameContext(gameId);
    if (!game) return out;
    await Promise.all(
        pitcherIds.map(async (pitcherId) => {
            const history = await loadPitcherHistory(pitcherId, game.game_date);
            out[pitcherId] = dispatch(game.sanction, history, gameId, game.game_date, game.age_division, pitcherId);
        })
    );
    return out;
}
