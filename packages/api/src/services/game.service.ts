import { query, transaction } from '../config/database';
import { Game, Inning, BaseRunners } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class GameService {
    async createGame(userId: string, gameData: Partial<Game>): Promise<Game> {
        const { home_team_id, away_team_id, opponent_name, game_date, game_time, location, is_home_game } = gameData;

        if (!home_team_id) {
            throw new Error('home_team_id is required');
        }

        // Either away_team_id or opponent_name must be provided
        if (!away_team_id && !opponent_name) {
            throw new Error('Either away_team_id or opponent_name is required');
        }

        if (away_team_id && home_team_id === away_team_id) {
            throw new Error('Home and away teams must be different');
        }

        const gameId = uuidv4();
        const result = await query(
            `INSERT INTO games (id, home_team_id, away_team_id, opponent_name, game_date, game_time, location, created_by, is_home_game)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [
                gameId,
                home_team_id,
                away_team_id || null,
                opponent_name || null,
                game_date,
                game_time,
                location,
                userId,
                is_home_game !== false,
            ]
        );

        return result.rows[0];
    }

    async getGameById(gameId: string): Promise<any> {
        const gameResult = await query(
            `SELECT g.*,
              ht.name as home_team_name,
              at.name as away_team_name,
              COALESCE(at.name, g.opponent_name) as opponent_display_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       LEFT JOIN teams at ON g.away_team_id = at.id
       WHERE g.id = $1`,
            [gameId]
        );

        if (gameResult.rows.length === 0) {
            return null;
        }

        return gameResult.rows[0];
    }

    async getGamesByTeam(team_id: string): Promise<Game[]> {
        const result = await query(
            `SELECT g.*,
              ht.name as home_team_name,
              at.name as away_team_name,
              COALESCE(at.name, g.opponent_name) as opponent_display_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       LEFT JOIN teams at ON g.away_team_id = at.id
       WHERE g.home_team_id = $1 OR g.away_team_id = $1
       ORDER BY g.game_date DESC, g.game_time DESC`,
            [team_id]
        );
        return result.rows;
    }

    async getGamesByUser(userId: string): Promise<Game[]> {
        const result = await query(
            `SELECT g.*,
              ht.name as home_team_name,
              at.name as away_team_name,
              COALESCE(at.name, g.opponent_name) as opponent_display_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       LEFT JOIN teams at ON g.away_team_id = at.id
       WHERE g.created_by = $1 OR ht.owner_id = $1
       ORDER BY g.game_date DESC, g.game_time DESC`,
            [userId]
        );
        return result.rows;
    }

    async startGame(gameId: string): Promise<Game> {
        return await transaction(async (client) => {
            // Update game status
            const gameResult = await client.query(
                `UPDATE games
         SET status = 'in_progress', current_inning = 1, inning_half = 'top'
         WHERE id = $1
         RETURNING *`,
                [gameId]
            );

            const game = gameResult.rows[0];

            // Create first inning (top of 1st)
            // is_opponent_batting depends on whether user is home or away
            // Home game: top = opponent bats (user pitches). Away game: top = user bats.
            const inningId = uuidv4();
            const isHomeGame = game.is_home_game !== false;
            const isOpponentBatting = isHomeGame;
            const battingTeamId = isOpponentBatting ? game.away_team_id || game.home_team_id : game.home_team_id;
            const pitchingTeamId = isOpponentBatting ? game.home_team_id : game.away_team_id || game.home_team_id;
            await client.query(
                `INSERT INTO innings (id, game_id, inning_number, half, batting_team_id, pitching_team_id, is_opponent_batting)
         VALUES ($1, $2, 1, 'top', $3, $4, $5)`,
                [inningId, gameId, battingTeamId, pitchingTeamId, isOpponentBatting]
            );

            return game;
        });
    }

    async updateGameScore(gameId: string, homeScore: number, awayScore: number): Promise<Game> {
        const result = await query(
            `UPDATE games 
       SET home_score = $1, away_score = $2
       WHERE id = $3
       RETURNING *`,
            [homeScore, awayScore, gameId]
        );

        return result.rows[0];
    }

    async advanceInning(gameId: string): Promise<Game> {
        const game = await this.getGameById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        return await transaction(async (client) => {
            let newInning = game.current_inning;
            let newHalf: 'top' | 'bottom' = game.inning_half;

            if (game.inning_half === 'top') {
                newHalf = 'bottom';
            } else {
                newInning += 1;
                newHalf = 'top';
            }

            // Update game and clear base runners for new inning
            const gameResult = await client.query(
                `UPDATE games
         SET current_inning = $1, inning_half = $2, base_runners = '{"first": false, "second": false, "third": false}'::jsonb
         WHERE id = $3
         RETURNING *`,
                [newInning, newHalf, gameId]
            );

            // Create new inning record
            // is_opponent_batting depends on half and whether user is home or away
            const inningId = uuidv4();
            const isHomeGame = game.is_home_game !== false;
            const isOpponentBatting = (newHalf === 'top') === isHomeGame;
            const battingTeamId = isOpponentBatting ? game.away_team_id || game.home_team_id : game.home_team_id;
            const pitchingTeamId = isOpponentBatting ? game.home_team_id : game.away_team_id || game.home_team_id;

            await client.query(
                `INSERT INTO innings (id, game_id, inning_number, half, batting_team_id, pitching_team_id, is_opponent_batting)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [inningId, gameId, newInning, newHalf, battingTeamId, pitchingTeamId, isOpponentBatting]
            );

            return gameResult.rows[0];
        });
    }

    async endGame(gameId: string): Promise<Game> {
        const result = await query(
            `UPDATE games
       SET status = 'completed'
       WHERE id = $1
       RETURNING *`,
            [gameId]
        );

        return result.rows[0];
    }

    async resumeGame(gameId: string): Promise<Game> {
        const result = await query(
            `UPDATE games
       SET status = 'in_progress'
       WHERE id = $1
       RETURNING *`,
            [gameId]
        );

        return result.rows[0];
    }

    async addHomeRuns(gameId: string, runs: number): Promise<Game> {
        const result = await query(
            `UPDATE games
       SET home_score = COALESCE(home_score, 0) + $1
       WHERE id = $2
       RETURNING *`,
            [runs, gameId]
        );

        return result.rows[0];
    }

    async addAwayRuns(gameId: string, runs: number): Promise<Game> {
        const result = await query(
            `UPDATE games
       SET away_score = COALESCE(away_score, 0) + $1
       WHERE id = $2
       RETURNING *`,
            [runs, gameId]
        );

        return result.rows[0];
    }

    async getCurrentInning(gameId: string): Promise<Inning | null> {
        const game = await this.getGameById(gameId);
        if (!game) {
            return null;
        }

        const result = await query(
            `SELECT * FROM innings 
       WHERE game_id = $1 AND inning_number = $2 AND half = $3`,
            [gameId, game.current_inning, game.inning_half]
        );

        return result.rows[0] || null;
    }

    async getGameInnings(gameId: string): Promise<Inning[]> {
        const result = await query(
            `SELECT * FROM innings
       WHERE game_id = $1
       ORDER BY inning_number, CASE WHEN half = 'top' THEN 1 ELSE 2 END`,
            [gameId]
        );
        return result.rows;
    }

    async updateBaseRunners(gameId: string, baseRunners: BaseRunners): Promise<Game> {
        const result = await query(
            `UPDATE games
       SET base_runners = $1
       WHERE id = $2
       RETURNING *`,
            [JSON.stringify(baseRunners), gameId]
        );

        if (result.rows.length === 0) {
            throw new Error('Game not found');
        }

        return result.rows[0];
    }

    async getBaseRunners(gameId: string): Promise<BaseRunners> {
        const result = await query(`SELECT base_runners FROM games WHERE id = $1`, [gameId]);

        if (result.rows.length === 0) {
            throw new Error('Game not found');
        }

        return result.rows[0].base_runners || { first: false, second: false, third: false };
    }
    async toggleHomeAway(gameId: string): Promise<Game> {
        const result = await query(
            `UPDATE games SET is_home_game = NOT COALESCE(is_home_game, true)
       WHERE id = $1
       RETURNING *`,
            [gameId]
        );

        if (result.rows.length === 0) {
            throw new Error('Game not found');
        }

        return result.rows[0];
    }
}

export default new GameService();
