import { query, transaction } from '../config/database';
import { Pitch } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PitchService {
  async logPitch(pitchData: Partial<Pitch>): Promise<Pitch> {
    const {
      at_bat_id,
      game_id,
      pitcher_id,
      batter_id,
      pitch_type,
      velocity,
      location_x,
      location_y,
      zone,
      balls_before,
      strikes_before,
      pitch_result,
    } = pitchData;

    if (!at_bat_id || !game_id || !pitcher_id || !batter_id || !pitch_type || !pitch_result) {
      throw new Error('Required fields missing');
    }

    return await transaction(async (client) => {
      // Get current pitch count for this at-bat
      const countResult = await client.query(
        'SELECT COALESCE(MAX(pitch_number), 0) as max_pitch FROM pitches WHERE at_bat_id = $1',
        [at_bat_id]
      );
      const pitchNumber = countResult.rows[0].max_pitch + 1;

      // Insert pitch
      const pitchId = uuidv4();
      const pitchResult = await client.query(
        `INSERT INTO pitches (
          id, at_bat_id, game_id, pitcher_id, batter_id, pitch_number,
          pitch_type, velocity, location_x, location_y, zone,
          balls_before, strikes_before, pitch_result
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          pitchId, at_bat_id, game_id, pitcher_id, batter_id, pitchNumber,
          pitch_type, velocity, location_x, location_y, zone,
          balls_before, strikes_before, pitch_result,
        ]
      );

      // Update at-bat count based on pitch result
      let newBalls = balls_before || 0;
      let newStrikes = strikes_before || 0;

      if (pitch_result === 'ball') {
        newBalls++;
      } else if (pitch_result === 'called_strike' || pitch_result === 'swinging_strike') {
        newStrikes++;
      } else if (pitch_result === 'foul') {
        if (newStrikes < 2) {
          newStrikes++;
        }
      }

      await client.query(
        'UPDATE at_bats SET balls = $1, strikes = $2 WHERE id = $3',
        [newBalls, newStrikes, at_bat_id]
      );

      return pitchResult.rows[0];
    });
  }

  async getPitchById(pitchId: string): Promise<Pitch | null> {
    const result = await query('SELECT * FROM pitches WHERE id = $1', [pitchId]);
    return result.rows[0] || null;
  }

  async getPitchesByAtBat(atBatId: string): Promise<Pitch[]> {
    const result = await query(
      'SELECT * FROM pitches WHERE at_bat_id = $1 ORDER BY pitch_number ASC',
      [atBatId]
    );
    return result.rows;
  }

  async getPitchesByGame(gameId: string): Promise<Pitch[]> {
    const result = await query(
      `SELECT p.*,
              b.first_name as batter_first_name,
              b.last_name as batter_last_name,
              pit.first_name as pitcher_first_name,
              pit.last_name as pitcher_last_name
       FROM pitches p
       JOIN players b ON p.batter_id = b.id
       JOIN players pit ON p.pitcher_id = pit.id
       WHERE p.game_id = $1
       ORDER BY p.created_at ASC`,
      [gameId]
    );
    return result.rows;
  }

  async getPitchesByPitcher(pitcherId: string, gameId?: string): Promise<Pitch[]> {
    let queryText = 'SELECT * FROM pitches WHERE pitcher_id = $1';
    const params: any[] = [pitcherId];

    if (gameId) {
      queryText += ' AND game_id = $2';
      params.push(gameId);
    }

    queryText += ' ORDER BY created_at ASC';

    const result = await query(queryText, params);
    return result.rows;
  }

  async getPitchesByBatter(batterId: string, gameId?: string): Promise<Pitch[]> {
    let queryText = 'SELECT * FROM pitches WHERE batter_id = $1';
    const params: any[] = [batterId];

    if (gameId) {
      queryText += ' AND game_id = $2';
      params.push(gameId);
    }

    queryText += ' ORDER BY created_at ASC';

    const result = await query(queryText, params);
    return result.rows;
  }
}

export default new PitchService();