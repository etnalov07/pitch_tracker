import { query } from '../config/database';
import { Play } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PlayService {
  async recordPlay(playData: Partial<Play>): Promise<Play> {
    const {
      pitch_id,
      at_bat_id,
      contact_type,
      contact_quality,
      hit_direction,
      field_location,
      hit_depth,
      hit_result,
      out_type,
      fielded_by_position,
      is_error,
      is_out,
      runs_scored,
      notes,
    } = playData;

    if (!pitch_id || !at_bat_id || !contact_type || is_out === undefined) {
      throw new Error('pitch_id, at_bat_id, contact_type, and is_out are required');
    }

    const playId = uuidv4();
    const result = await query(
      `INSERT INTO plays (
        id, pitch_id, at_bat_id, contact_type, contact_quality, hit_direction,
        field_location, hit_depth, hit_result, out_type, fielded_by_position,
        is_error, is_out, runs_scored, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        playId, pitch_id, at_bat_id, contact_type, contact_quality, hit_direction,
        field_location, hit_depth, hit_result, out_type, fielded_by_position,
        is_error, is_out, runs_scored || 0, notes,
      ]
    );

    return result.rows[0];
  }

  async getPlayById(playId: string): Promise<Play | null> {
    const result = await query('SELECT * FROM plays WHERE id = $1', [playId]);
    return result.rows[0] || null;
  }

  async getPlaysByAtBat(atBatId: string): Promise<Play[]> {
    const result = await query(
      'SELECT * FROM plays WHERE at_bat_id = $1 ORDER BY created_at ASC',
      [atBatId]
    );
    return result.rows;
  }

  async getPlaysByGame(gameId: string): Promise<any[]> {
    const result = await query(
      `SELECT p.*, 
              pit.pitch_type, pit.velocity,
              ab.batter_id, ab.pitcher_id,
              b.first_name as batter_first_name,
              b.last_name as batter_last_name
       FROM plays p
       JOIN pitches pit ON p.pitch_id = pit.id
       JOIN at_bats ab ON p.at_bat_id = ab.id
       JOIN players b ON ab.batter_id = b.id
       WHERE pit.game_id = $1
       ORDER BY p.created_at ASC`,
      [gameId]
    );
    return result.rows;
  }

  async getPlaysByBatter(batterId: string): Promise<any[]> {
    const result = await query(
      `SELECT p.*, 
              pit.pitch_type, pit.velocity,
              ab.game_id
       FROM plays p
       JOIN pitches pit ON p.pitch_id = pit.id
       JOIN at_bats ab ON p.at_bat_id = ab.id
       WHERE ab.batter_id = $1
       ORDER BY p.created_at DESC`,
      [batterId]
    );
    return result.rows;
  }

  async updatePlay(playId: string, updates: Partial<Play>): Promise<Play> {
    const play = await this.getPlayById(playId);
    if (!play) {
      throw new Error('Play not found');
    }

    const {
      contact_quality,
      hit_direction,
      field_location,
      hit_depth,
      hit_result,
      out_type,
      fielded_by_position,
      is_error,
      runs_scored,
      notes,
    } = updates;

    const result = await query(
      `UPDATE plays
       SET contact_quality = COALESCE($1, contact_quality),
           hit_direction = COALESCE($2, hit_direction),
           field_location = COALESCE($3, field_location),
           hit_depth = COALESCE($4, hit_depth),
           hit_result = COALESCE($5, hit_result),
           out_type = COALESCE($6, out_type),
           fielded_by_position = COALESCE($7, fielded_by_position),
           is_error = COALESCE($8, is_error),
           runs_scored = COALESCE($9, runs_scored),
           notes = COALESCE($10, notes)
       WHERE id = $11
       RETURNING *`,
      [
        contact_quality, hit_direction, field_location, hit_depth, hit_result,
        out_type, fielded_by_position, is_error, runs_scored, notes, playId,
      ]
    );

    return result.rows[0];
  }
}

export default new PlayService();