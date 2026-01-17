import { query, transaction } from '../config/database';
import { Game, Inning } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class GameService {
  async createGame(userId: string, gameData: Partial<Game>): Promise<Game> {
    const { home_team_id, away_team_id, game_date, game_time, location } = gameData;

    if (!home_team_id || !away_team_id) {
      throw new Error('home_team_id and away_team_id are required');
    }

    if (home_team_id === away_team_id) {
      throw new Error('Home and away teams must be different');
    }

    const gameId = uuidv4();
    const result = await query(
      `INSERT INTO games (id, home_team_id, away_team_id, game_date, game_time, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [gameId, home_team_id, away_team_id, game_date, game_time, location, userId]
    );

    return result.rows[0];
  }

  async getGameById(gameId: string): Promise<any> {
    const gameResult = await query(
      `SELECT g.*, 
              ht.name as home_team_name, 
              at.name as away_team_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
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
              at.name as away_team_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.home_team_id = $1 OR g.away_team_id = $1
       ORDER BY g.game_date DESC, g.game_time DESC`,
      [team_id]
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
      const inningId = uuidv4();
      await client.query(
        `INSERT INTO innings (id, game_id, inning_number, half, batting_team_id, pitching_team_id)
         VALUES ($1, $2, 1, 'top', $3, $4)`,
        [inningId, gameId, game.away_team_id, game.home_team_id]
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

      // Update game
      const gameResult = await client.query(
        `UPDATE games 
         SET current_inning = $1, inning_half = $2
         WHERE id = $3
         RETURNING *`,
        [newInning, newHalf, gameId]
      );

      // Create new inning record
      const inningId = uuidv4();
      const battingteam_id = newHalf === 'top' ? game.away_team_id : game.home_team_id;
      const pitchingteam_id = newHalf === 'top' ? game.home_team_id : game.away_team_id;

      await client.query(
        `INSERT INTO innings (id, game_id, inning_number, half, batting_team_id, pitching_team_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [inningId, gameId, newInning, newHalf, battingteam_id, pitchingteam_id]
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
}

export default new GameService();