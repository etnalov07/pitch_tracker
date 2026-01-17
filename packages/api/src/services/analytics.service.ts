import { query } from '../config/database';

export class AnalyticsService {
  // CRITICAL: Batter history for live game strategy
  async getBatterHistory(batterId: string, pitcherId?: string, gameId?: string): Promise<any> {
    let queryText = `
      SELECT 
        ab.*,
        g.game_date,
        g.home_team_id,
        g.away_team_id,
        p.first_name as pitcher_first_name,
        p.last_name as pitcher_last_name
      FROM at_bats ab
      JOIN games g ON ab.game_id = g.id
      JOIN players p ON ab.pitcher_id = p.id
      WHERE ab.batter_id = $1
    `;
    
    const params: any[] = [batterId];
    
    if (pitcherId) {
      queryText += ' AND ab.pitcher_id = $2';
      params.push(pitcherId);
    }
    
    if (gameId) {
      const paramIndex = params.length + 1;
      queryText += ` AND ab.game_id = $${paramIndex}`;
      params.push(gameId);
    }
    
    queryText += ' ORDER BY ab.created_at DESC LIMIT 10';
    
    const atBatsResult = await query(queryText, params);
    const atBats = atBatsResult.rows;
    
    // Get pitches for each at-bat
    for (const atBat of atBats) {
      const pitchesResult = await query(
        'SELECT * FROM pitches WHERE at_bat_id = $1 ORDER BY pitch_number',
        [atBat.id]
      );
      atBat.pitches = pitchesResult.rows;
      
      // Get plays for each at-bat
      const playsResult = await query(
        'SELECT * FROM plays WHERE at_bat_id = $1',
        [atBat.id]
      );
      atBat.plays = playsResult.rows;
    }
    
    // Calculate stats
    const statsResult = await query(
      `SELECT 
        COUNT(ab.id) as total_at_bats,
        COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits,
        COUNT(CASE WHEN ab.result = 'strikeout' THEN 1 END) as strikeouts,
        COUNT(CASE WHEN ab.result = 'walk' THEN 1 END) as walks,
        SUM(ab.rbi) as total_rbi
      FROM at_bats ab
      WHERE ab.batter_id = $1
      ${pitcherId ? 'AND ab.pitcher_id = $2' : ''}`,
      pitcherId ? [batterId, pitcherId] : [batterId]
    );
    
    const stats = statsResult.rows[0];
    const battingAverage = stats.total_at_bats > 0 
      ? (parseFloat(stats.hits) / parseFloat(stats.total_at_bats)).toFixed(3)
      : '0.000';
    
    return {
      at_bats: atBats,
      stats: {
        ...stats,
        batting_average: battingAverage,
      },
    };
  }

  // Pitch location heat map for a batter
  async getBatterPitchHeatMap(batterId: string, pitcherId?: string): Promise<any[]> {
    let queryText = `
      SELECT 
        location_x,
        location_y,
        zone,
        pitch_type,
        pitch_result,
        velocity,
        COUNT(*) as count
      FROM pitches
      WHERE batter_id = $1
      AND location_x IS NOT NULL
      AND location_y IS NOT NULL
    `;
    
    const params: any[] = [batterId];
    
    if (pitcherId) {
      queryText += ' AND pitcher_id = $2';
      params.push(pitcherId);
    }
    
    queryText += ' GROUP BY location_x, location_y, zone, pitch_type, pitch_result, velocity';
    
    const result = await query(queryText, params);
    return result.rows;
  }

  // Spray chart for a batter
  async getBatterSprayChart(batterId: string, gameId?: string): Promise<any[]> {
    let queryText = `
      SELECT 
        p.field_location,
        p.contact_quality,
        p.hit_direction,
        p.hit_depth,
        p.hit_result,
        p.contact_type,
        COUNT(*) as count
      FROM plays p
      JOIN at_bats ab ON p.at_bat_id = ab.id
      WHERE ab.batter_id = $1
    `;
    
    const params: any[] = [batterId];
    
    if (gameId) {
      queryText += ' AND ab.game_id = $2';
      params.push(gameId);
    }
    
    queryText += ' GROUP BY p.field_location, p.contact_quality, p.hit_direction, p.hit_depth, p.hit_result, p.contact_type';
    
    const result = await query(queryText, params);
    return result.rows;
  }

  // Pitch type tendencies for a pitcher
  async getPitcherTendencies(pitcherId: string, gameId?: string): Promise<any> {
    let queryText = `
      SELECT 
        pitch_type,
        pitch_result,
        AVG(velocity) as avg_velocity,
        COUNT(*) as count
      FROM pitches
      WHERE pitcher_id = $1
    `;
    
    const params: any[] = [pitcherId];
    
    if (gameId) {
      queryText += ' AND game_id = $2';
      params.push(gameId);
    }
    
    queryText += ' GROUP BY pitch_type, pitch_result ORDER BY pitch_type, count DESC';
    
    const result = await query(queryText, params);
    return result.rows;
  }

  // Current game state with all context
  async getGameState(gameId: string): Promise<any> {
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
      throw new Error('Game not found');
    }
    
    const game = gameResult.rows[0];
    
    // Get current inning
    const inningResult = await query(
      `SELECT * FROM innings 
       WHERE game_id = $1 AND inning_number = $2 AND half = $3`,
      [gameId, game.current_inning, game.inning_half]
    );
    
    // Get all innings
    const allInningsResult = await query(
      `SELECT * FROM innings 
       WHERE game_id = $1 
       ORDER BY inning_number, CASE WHEN half = 'top' THEN 1 ELSE 2 END`,
      [gameId]
    );
    
    // Get current at-bat if in progress
    const currentAtBatResult = await query(
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
       WHERE ab.game_id = $1 AND ab.ab_end_time IS NULL
       ORDER BY ab.created_at DESC
       LIMIT 1`,
      [gameId]
    );
    
    return {
      game,
      current_inning: inningResult.rows[0] || null,
      all_innings: allInningsResult.rows,
      current_at_bat: currentAtBatResult.rows[0] || null,
    };
  }

  // Batter vs pitcher matchup stats
  async getMatchupStats(batterId: string, pitcherId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(ab.id) as total_at_bats,
        COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits,
        COUNT(CASE WHEN ab.result = 'strikeout' THEN 1 END) as strikeouts,
        COUNT(CASE WHEN ab.result = 'walk' THEN 1 END) as walks,
        SUM(ab.rbi) as total_rbi,
        AVG(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1.0 ELSE 0.0 END) as batting_avg
      FROM at_bats ab
      WHERE ab.batter_id = $1 AND ab.pitcher_id = $2`,
      [batterId, pitcherId]
    );
    
    return result.rows[0];
  }
}

export default new AnalyticsService();