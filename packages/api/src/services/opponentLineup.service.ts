import { query } from '../config/database';
import { OpponentLineupPlayer } from '@pitch-tracker/shared';
import { v4 as uuidv4 } from 'uuid';

export class OpponentLineupService {
    async createPlayer(gameId: string, playerData: Partial<OpponentLineupPlayer>): Promise<OpponentLineupPlayer> {
        const { player_name, batting_order, position, bats = 'R', is_starter = true, inning_entered } = playerData;

        if (!player_name || !batting_order) {
            throw new Error('player_name and batting_order are required');
        }

        if (batting_order < 1 || batting_order > 9) {
            throw new Error('batting_order must be between 1 and 9');
        }

        const id = uuidv4();
        const result = await query(
            `INSERT INTO opponent_lineup (id, game_id, player_name, batting_order, position, bats, is_starter, inning_entered)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [id, gameId, player_name, batting_order, position, bats, is_starter, inning_entered]
        );

        return result.rows[0];
    }

    async createLineup(gameId: string, players: Partial<OpponentLineupPlayer>[]): Promise<OpponentLineupPlayer[]> {
        const createdPlayers: OpponentLineupPlayer[] = [];

        for (const playerData of players) {
            const player = await this.createPlayer(gameId, playerData);
            createdPlayers.push(player);
        }

        return createdPlayers;
    }

    async getLineupByGameId(gameId: string): Promise<OpponentLineupPlayer[]> {
        const result = await query(
            `SELECT * FROM opponent_lineup
             WHERE game_id = $1
             ORDER BY batting_order, is_starter DESC, inning_entered`,
            [gameId]
        );
        return result.rows;
    }

    async getActiveLineup(gameId: string): Promise<OpponentLineupPlayer[]> {
        const result = await query(
            `SELECT ol.* FROM opponent_lineup ol
             WHERE ol.game_id = $1
               AND ol.replaced_by_id IS NULL
             ORDER BY ol.batting_order`,
            [gameId]
        );
        return result.rows;
    }

    async getPlayerById(playerId: string): Promise<OpponentLineupPlayer | null> {
        const result = await query(
            `SELECT * FROM opponent_lineup WHERE id = $1`,
            [playerId]
        );
        return result.rows[0] || null;
    }

    async updatePlayer(playerId: string, updates: Partial<OpponentLineupPlayer>): Promise<OpponentLineupPlayer> {
        const { player_name, position, bats } = updates;

        const result = await query(
            `UPDATE opponent_lineup
             SET player_name = COALESCE($1, player_name),
                 position = COALESCE($2, position),
                 bats = COALESCE($3, bats)
             WHERE id = $4
             RETURNING *`,
            [player_name, position, bats, playerId]
        );

        if (result.rows.length === 0) {
            throw new Error('Player not found');
        }

        return result.rows[0];
    }

    async substitutePlayer(
        originalPlayerId: string,
        newPlayerName: string,
        inningEntered: number,
        position?: string,
        bats: string = 'R'
    ): Promise<OpponentLineupPlayer> {
        const original = await this.getPlayerById(originalPlayerId);
        if (!original) {
            throw new Error('Original player not found');
        }

        const newPlayerId = uuidv4();
        const result = await query(
            `INSERT INTO opponent_lineup (id, game_id, player_name, batting_order, position, bats, is_starter, inning_entered)
             VALUES ($1, $2, $3, $4, $5, $6, false, $7)
             RETURNING *`,
            [newPlayerId, original.game_id, newPlayerName, original.batting_order, position || original.position, bats, inningEntered]
        );

        await query(
            `UPDATE opponent_lineup SET replaced_by_id = $1 WHERE id = $2`,
            [newPlayerId, originalPlayerId]
        );

        return result.rows[0];
    }

    async deletePlayer(playerId: string): Promise<void> {
        await query(`DELETE FROM opponent_lineup WHERE id = $1`, [playerId]);
    }

    async deleteLineup(gameId: string): Promise<void> {
        await query(`DELETE FROM opponent_lineup WHERE game_id = $1`, [gameId]);
    }
}

export default new OpponentLineupService();
