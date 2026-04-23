import { query, transaction } from '../config/database';
import { BaserunnerEvent, BaseRunners, RunnerBase } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ADVANCEMENT_EVENT_TYPES = new Set(['stolen_base', 'wild_pitch', 'passed_ball', 'balk']);

const removeRunner = (runners: BaseRunners, base: RunnerBase): BaseRunners => ({
    ...runners,
    [base]: false,
});

const moveRunner = (runners: BaseRunners, fromBase: RunnerBase, toBase: RunnerBase | 'home'): BaseRunners => {
    const updated = { ...runners, [fromBase]: false };
    if (toBase !== 'home') updated[toBase] = true;
    return updated;
};

export class BaserunnerEventService {
    async recordEvent(
        data: Partial<BaserunnerEvent> & { new_base_runners?: BaseRunners; runner_to_base?: string }
    ): Promise<BaserunnerEvent> {
        const { game_id, inning_id, at_bat_id, event_type, runner_base, outs_before, notes, new_base_runners, runner_to_base } =
            data;

        if (!game_id || !inning_id || !event_type || !runner_base || outs_before === undefined) {
            throw new Error('Missing required fields: game_id, inning_id, event_type, runner_base, outs_before');
        }

        const isAdvancement = ADVANCEMENT_EVENT_TYPES.has(event_type);

        return await transaction(async (client) => {
            const eventId = uuidv4();
            const outsAfter = isAdvancement ? outs_before : outs_before + 1;
            const outRecorded = !isAdvancement;

            const result = await client.query(
                `INSERT INTO baserunner_events
                 (id, game_id, inning_id, at_bat_id, event_type, runner_base, runner_to_base,
                  out_recorded, outs_before, outs_after, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *`,
                [
                    eventId,
                    game_id,
                    inning_id,
                    at_bat_id || null,
                    event_type,
                    runner_base,
                    runner_to_base || null,
                    outRecorded,
                    outs_before,
                    outsAfter,
                    notes || null,
                ]
            );

            // Update game base_runners
            const gameResult = await client.query(`SELECT base_runners FROM games WHERE id = $1`, [game_id]);
            const currentRunners: BaseRunners = gameResult.rows[0]?.base_runners || {
                first: false,
                second: false,
                third: false,
            };

            let updatedRunners: BaseRunners;
            if (isAdvancement) {
                // Use client-supplied new state if provided (handles multi-runner balk/WP/PB)
                if (new_base_runners) {
                    updatedRunners = new_base_runners;
                } else if (runner_to_base) {
                    updatedRunners = moveRunner(currentRunners, runner_base as RunnerBase, runner_to_base as RunnerBase | 'home');
                } else {
                    updatedRunners = currentRunners;
                }
            } else {
                updatedRunners = removeRunner(currentRunners, runner_base as RunnerBase);
            }

            await client.query(`UPDATE games SET base_runners = $1 WHERE id = $2`, [JSON.stringify(updatedRunners), game_id]);

            return result.rows[0];
        });
    }

    async getEventsByGame(gameId: string): Promise<BaserunnerEvent[]> {
        const result = await query(`SELECT * FROM baserunner_events WHERE game_id = $1 ORDER BY created_at`, [gameId]);
        return result.rows;
    }

    async getEventsByInning(inningId: string): Promise<BaserunnerEvent[]> {
        const result = await query(`SELECT * FROM baserunner_events WHERE inning_id = $1 ORDER BY created_at`, [inningId]);
        return result.rows;
    }

    async deleteEvent(eventId: string): Promise<void> {
        await query(`DELETE FROM baserunner_events WHERE id = $1`, [eventId]);
    }
}

export default new BaserunnerEventService();
