import { query, transaction } from '../config/database';
import { CreateOpposingPitcherParams, OpposingPitcher } from '../types';
import { v4 as uuidv4 } from 'uuid';
import opponentPitcherProfileService from './opponentPitcherProfile.service';

export class OpposingPitcherService {
    async getByGame(gameId: string, teamSide?: 'home' | 'away'): Promise<OpposingPitcher[]> {
        if (teamSide) {
            const result = await query(
                'SELECT * FROM opposing_pitchers WHERE game_id = $1 AND team_side = $2 ORDER BY created_at ASC',
                [gameId, teamSide]
            );
            return result.rows;
        }
        const result = await query('SELECT * FROM opposing_pitchers WHERE game_id = $1 ORDER BY created_at ASC', [gameId]);
        return result.rows;
    }

    async create(params: CreateOpposingPitcherParams): Promise<OpposingPitcher> {
        const { game_id, team_name, pitcher_name, jersey_number, throws, team_side } = params;
        const result = await transaction(async (client) => {
            return client.query(
                `INSERT INTO opposing_pitchers (id, game_id, team_name, pitcher_name, jersey_number, throws, team_side)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [uuidv4(), game_id, team_name, pitcher_name, jersey_number ?? null, throws, team_side ?? null]
            );
        });
        const pitcher = result.rows[0];
        this._maybeAutoLink(pitcher).catch(() => {});
        return pitcher;
    }

    private async _maybeAutoLink(pitcher: OpposingPitcher): Promise<void> {
        const gameRow = await query('SELECT home_team_id, opponent_team_id FROM games WHERE id = $1', [pitcher.game_id]);
        const game = gameRow.rows[0];
        if (!game?.opponent_team_id) return;

        const profile = await opponentPitcherProfileService.findOrCreate(
            game.opponent_team_id,
            game.home_team_id,
            pitcher.pitcher_name,
            pitcher.throws ?? 'R',
            pitcher.jersey_number
        );
        await opponentPitcherProfileService.linkOpposingPitcher(pitcher.id, profile.id);
        await opponentPitcherProfileService.incrementGameCount(profile.id);
    }

    async delete(id: string): Promise<void> {
        await query('DELETE FROM opposing_pitchers WHERE id = $1', [id]);
    }
}

export default new OpposingPitcherService();
