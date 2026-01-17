import { query } from '../config/database';
import { Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PlayerService {
  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    const { team_id, first_name, last_name, jersey_number, primary_position, bats, throws } = playerData;

    if (!team_id || !first_name || !last_name || !primary_position) {
      throw new Error('team_id, first_name, last_name, and primary_position are required');
    }

    const player_id = uuidv4();
    const result = await query(
      `INSERT INTO players (id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [player_id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws]
    );

    return result.rows[0];
  }

  async getPlayerById(player_id: string): Promise<Player | null> {
    const result = await query('SELECT * FROM players WHERE id = $1', [player_id]);
    return result.rows[0] || null;
  }

  async getPlayersByTeam(team_id: string): Promise<Player[]> {
    const result = await query(
      `SELECT * FROM players 
       WHERE team_id = $1 AND is_active = true 
       ORDER BY jersey_number, last_name`,
      [team_id]
    );
    return result.rows;
  }

  async updatePlayer(player_id: string, updates: Partial<Player>): Promise<Player> {
    const player = await this.getPlayerById(player_id);
    if (!player) {
      throw new Error('Player not found');
    }

    const { first_name, last_name, jersey_number, primary_position, bats, throws, is_active } = updates;

    const result = await query(
      `UPDATE players 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           jersey_number = COALESCE($3, jersey_number),
           primary_position = COALESCE($4, primary_position),
           bats = COALESCE($5, bats),
           throws = COALESCE($6, throws),
           is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
      [first_name, last_name, jersey_number, primary_position, bats, throws, is_active, player_id]
    );

    return result.rows[0];
  }

  async deletePlayer(player_id: string): Promise<void> {
    // Soft delete by setting is_active to false
    await query('UPDATE players SET is_active = false WHERE id = $1', [player_id]);
  }

  async getPlayerStats(player_id: string): Promise<any> {
    const statsResult = await query(
      `SELECT 
         COUNT(ab.id) as total_at_bats,
         COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits,
         COUNT(CASE WHEN ab.result = 'strikeout' THEN 1 END) as strikeouts,
         COUNT(CASE WHEN ab.result = 'walk' THEN 1 END) as walks,
         SUM(ab.rbi) as total_rbi,
         SUM(ab.runs_scored) as total_runs
       FROM at_bats ab
       WHERE ab.batter_id = $1`,
      [player_id]
    );

    const stats = statsResult.rows[0];
    const battingAverage = stats.total_at_bats > 0 
      ? (stats.hits / stats.total_at_bats).toFixed(3) 
      : '0.000';

    return {
      ...stats,
      batting_average: battingAverage,
    };
  }
}

export default new PlayerService();