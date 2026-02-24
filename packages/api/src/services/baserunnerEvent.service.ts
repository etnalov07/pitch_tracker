import { query, transaction } from '../config/database';
import { BaserunnerEvent, BaseRunners, RunnerBase } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Inline helper to avoid runtime dependency on @pitch-tracker/shared in production
const removeRunner = (runners: BaseRunners, base: RunnerBase): BaseRunners => ({
    ...runners,
    [base]: false,
});

export class BaserunnerEventService {
    async recordEvent(data: Partial<BaserunnerEvent>): Promise<BaserunnerEvent> {
        const { game_id, inning_id, at_bat_id, event_type, runner_base, outs_before, notes } = data;

        if (!game_id || !inning_id || !event_type || !runner_base || outs_before === undefined) {
            throw new Error('Missing required fields: game_id, inning_id, event_type, runner_base, outs_before');
        }

        return await transaction(async (client) => {
            const eventId = uuidv4();
            const outsAfter = outs_before + 1;

            // Insert the event
            const result = await client.query(
                `INSERT INTO baserunner_events
                 (id, game_id, inning_id, at_bat_id, event_type, runner_base, outs_before, outs_after, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [eventId, game_id, inning_id, at_bat_id || null, event_type, runner_base, outs_before, outsAfter, notes || null]
            );

            // Update game base_runners to remove the caught runner
            const gameResult = await client.query(`SELECT base_runners FROM games WHERE id = $1`, [game_id]);
            const currentRunners: BaseRunners = gameResult.rows[0]?.base_runners || {
                first: false,
                second: false,
                third: false,
            };
            const updatedRunners = removeRunner(currentRunners, runner_base as RunnerBase);

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
