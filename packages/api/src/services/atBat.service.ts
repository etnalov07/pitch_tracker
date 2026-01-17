import { query } from '../config/database';
import { AtBat } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AtBatService {
  async createAtBat(atBatData: Partial<AtBat>): Promise<AtBat> {
    const { game_id, inning_id, batter_id, pitcher_id, batting_order, outs_before } = atBatData;

    if (!game_id || !inning_id || !batter_id || !pitcher_id || outs_before === undefined) {
      throw new Error('game_id, inning_id, batter_id, pitcher_id, and outs_before are required');
    }

    const atBatId = uuidv4();
    const result = await query(
      `INSERT INTO at_bats (
        id, game_id, inning_id, batter_id, pitcher_id, batting_order, outs_before, outs_after
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [atBatId, game_id, inning_id, batter_id, pitcher_id, batting_order, outs_before, outs_before]
    );

    return result.rows[0];
  }

  async getAtBatById(atBatId: string): Promise<any> {
    const result = await query(
      `SELECT ab.*,
              b.first_name as batter_first_name,
              b.last_name as batter_last_name,
              b.jersey_number as batter_jersey,
              p.first_name as pitcher_first_name,
              p.last_name as pitcher_last_name,
              p.jersey_number as pitcher_jersey
       FROM at_bats ab
       JOIN players b ON ab.batter_id = b.id
       JOIN players p ON ab.pitcher_id = p.id
       WHERE ab.id = $1`,
      [atBatId]
    );

    return result.rows[0] || null;
  }

  async getAtBatsByGame(gameId: string): Promise<AtBat[]> {
    const result = await query(
      `SELECT ab.*,
              b.first_name as batter_first_name,
              b.last_name as batter_last_name,
              p.first_name as pitcher_first_name,
              p.last_name as pitcher_last_name
       FROM at_bats ab
       JOIN players b ON ab.batter_id = b.id
       JOIN players p ON ab.pitcher_id = p.id
       WHERE ab.game_id = $1
       ORDER BY ab.created_at ASC`,
      [gameId]
    );
    return result.rows;
  }

  async getAtBatsByInning(inningId: string): Promise<AtBat[]> {
    const result = await query(
      `SELECT ab.*,
              b.first_name as batter_first_name,
              b.last_name as batter_last_name,
              p.first_name as pitcher_first_name,
              p.last_name as pitcher_last_name
       FROM at_bats ab
       JOIN players b ON ab.batter_id = b.id
       JOIN players p ON ab.pitcher_id = p.id
       WHERE ab.inning_id = $1
       ORDER BY ab.created_at ASC`,
      [inningId]
    );
    return result.rows;
  }

  async updateAtBat(atBatId: string, updates: Partial<AtBat>): Promise<AtBat> {
    const { balls, strikes, outs_after, result, rbi, runs_scored, ab_end_time } = updates;

    const queryResult = await query(
      `UPDATE at_bats
       SET balls = COALESCE($1, balls),
           strikes = COALESCE($2, strikes),
           outs_after = COALESCE($3, outs_after),
           result = COALESCE($4, result),
           rbi = COALESCE($5, rbi),
           runs_scored = COALESCE($6, runs_scored),
           ab_end_time = COALESCE($7, ab_end_time)
       WHERE id = $8
       RETURNING *`,
      [balls, strikes, outs_after, result, rbi, runs_scored, ab_end_time, atBatId]
    );

    return queryResult.rows[0];
  }

  async endAtBat(atBatId: string, result: string, outsAfter: number, rbi: number = 0, runsScored: number = 0): Promise<AtBat> {
    const queryResult = await query(
      `UPDATE at_bats
       SET result = $1,
           outs_after = $2,
           rbi = $3,
           runs_scored = $4,
           ab_end_time = NOW()
       WHERE id = $5
       RETURNING *`,
      [result, outsAfter, rbi, runsScored, atBatId]
    );

    return queryResult.rows[0];
  }

  async getAtBatWithPitches(atBatId: string): Promise<any> {
    const atBat = await this.getAtBatById(atBatId);
    if (!atBat) {
      return null;
    }

    const pitchesResult = await query(
      `SELECT * FROM pitches 
       WHERE at_bat_id = $1 
       ORDER BY pitch_number ASC`,
      [atBatId]
    );

    return {
      ...atBat,
      pitches: pitchesResult.rows,
    };
  }
}

export default new AtBatService();