import { query } from '../config/database';
import { OpponentLineupPlayer } from '../types';
import { v4 as uuidv4 } from 'uuid';
import scoutingService from './scouting.service';

export class OpponentLineupService {
    private async getGameLineupSize(gameId: string): Promise<number> {
        const result = await query(`SELECT lineup_size FROM games WHERE id = $1`, [gameId]);
        return result.rows[0]?.lineup_size ?? 9;
    }

    async createPlayer(gameId: string, playerData: Partial<OpponentLineupPlayer>): Promise<OpponentLineupPlayer> {
        const { player_name, batting_order, position, bats = 'R', is_starter = true, inning_entered, team_side } = playerData;

        if (!player_name || !batting_order) {
            throw new Error('player_name and batting_order are required');
        }

        const lineupSize = await this.getGameLineupSize(gameId);
        if (batting_order < 1 || batting_order > lineupSize) {
            throw new Error(`batting_order must be between 1 and ${lineupSize}`);
        }

        if (is_starter) {
            const existing = await query(
                `SELECT id FROM opponent_lineup
                 WHERE game_id = $1 AND batting_order = $2 AND team_side IS NOT DISTINCT FROM $3
                   AND is_starter = true AND replaced_by_id IS NULL`,
                [gameId, batting_order, team_side ?? null]
            );
            if (existing.rows.length > 0) {
                const updated = await query(
                    `UPDATE opponent_lineup
                     SET player_name = $1, position = $2, bats = $3
                     WHERE id = $4
                     RETURNING *`,
                    [player_name, position ?? null, bats, existing.rows[0].id]
                );
                const player = updated.rows[0];
                this._maybeAutoLinkBatter(player, gameId).catch(() => {});
                return player;
            }
        }

        const id = uuidv4();
        const result = await query(
            `INSERT INTO opponent_lineup (id, game_id, player_name, batting_order, position, bats, is_starter, inning_entered, team_side)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [id, gameId, player_name, batting_order, position, bats, is_starter, inning_entered, team_side ?? null]
        );

        const player = result.rows[0];
        this._maybeAutoLinkBatter(player, gameId).catch(() => {});
        return player;
    }

    private async _maybeAutoLinkBatter(player: OpponentLineupPlayer, gameId: string): Promise<void> {
        const gameRow = await query('SELECT home_team_id, opponent_team_id, opponent_name FROM games WHERE id = $1', [gameId]);
        const game = gameRow.rows[0];
        if (!game?.opponent_team_id) return;
        const profile = await scoutingService.getOrCreateProfile(
            game.home_team_id,
            game.opponent_name ?? '',
            player.player_name,
            player.bats ?? 'R'
        );
        if (!profile.opponent_team_id) {
            await query('UPDATE batter_scouting_profiles SET opponent_team_id = $1 WHERE id = $2', [
                game.opponent_team_id,
                profile.id,
            ]);
        }
        await scoutingService.linkLineupToProfile(player.id, profile.id);
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
        const result = await query(`SELECT * FROM opponent_lineup WHERE id = $1`, [playerId]);
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
            [
                newPlayerId,
                original.game_id,
                newPlayerName,
                original.batting_order,
                position || original.position,
                bats,
                inningEntered,
            ]
        );

        await query(`UPDATE opponent_lineup SET replaced_by_id = $1 WHERE id = $2`, [newPlayerId, originalPlayerId]);

        const newPlayer = result.rows[0];
        // Mirror createPlayer: link the sub to a scouting profile so career stats
        // aggregate across games for the same person.
        this._maybeAutoLinkBatter(newPlayer, original.game_id).catch(() => {});

        return newPlayer;
    }

    async deletePlayer(playerId: string): Promise<void> {
        await query(`DELETE FROM opponent_lineup WHERE id = $1`, [playerId]);
    }

    async deleteLineup(gameId: string): Promise<void> {
        await query(`DELETE FROM opponent_lineup WHERE game_id = $1`, [gameId]);
    }

    /**
     * Returns the starting lineup from the most recent prior game played against
     * the same opponent team. Used to pre-fill game N's lineup with game N-1's
     * roster when starting a new game in a series. Returns [] when there's no
     * prior game vs the same opponent (or when the current game has no
     * opponent_team_id linked).
     *
     * Only returns starters (is_starter=true, replaced_by_id IS NULL) so subs
     * from the prior game don't carry over by default — the charter explicitly
     * picks who's playing today.
     */
    async getMostRecentLineupVsOpponent(gameId: string): Promise<OpponentLineupPlayer[]> {
        const gameRow = await query('SELECT opponent_team_id, game_date, home_team_id FROM games WHERE id = $1', [gameId]);
        const game = gameRow.rows[0];
        if (!game?.opponent_team_id) return [];

        const priorGameRow = await query(
            `SELECT id FROM games
             WHERE opponent_team_id = $1
               AND id <> $2
               AND game_date <= $3
             ORDER BY game_date DESC, created_at DESC
             LIMIT 1`,
            [game.opponent_team_id, gameId, game.game_date]
        );
        const priorGameId = priorGameRow.rows[0]?.id;
        if (!priorGameId) return [];

        const lineupRow = await query(
            `SELECT * FROM opponent_lineup
             WHERE game_id = $1
               AND is_starter = true
               AND replaced_by_id IS NULL
             ORDER BY batting_order`,
            [priorGameId]
        );
        return lineupRow.rows;
    }
}

export default new OpponentLineupService();
