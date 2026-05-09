import { query, transaction } from '../config/database';
import { AtBat, Game, Pitch, PitchPrevState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import scoutingService from './scouting.service';

export class PitchService {
    async logPitch(pitchData: Partial<Pitch> & { opponent_batter_id?: string }): Promise<Pitch> {
        const {
            at_bat_id,
            game_id,
            pitcher_id,
            batter_id,
            opponent_batter_id,
            pitch_type,
            velocity,
            location_x,
            location_y,
            target_location_x,
            target_location_y,
            target_zone,
            zone,
            balls_before,
            strikes_before,
            pitch_result,
            team_side,
        } = pitchData;

        if (!at_bat_id || !game_id || !pitch_type || !pitch_result) {
            throw new Error('Required fields missing');
        }

        if (!batter_id && !opponent_batter_id) {
            throw new Error('Either batter_id or opponent_batter_id is required');
        }

        const pitch = await transaction(async (client) => {
            // Get current pitch count for this at-bat
            const countResult = await client.query(
                'SELECT COALESCE(MAX(pitch_number), 0) as max_pitch FROM pitches WHERE at_bat_id = $1',
                [at_bat_id]
            );
            const pitchNumber = countResult.rows[0].max_pitch + 1;

            // Snapshot pre-pitch at-bat + game state for undo. Captured here so a
            // later undoPitch can fully reverse count, runners, score, and AB lifecycle.
            const snapshotResult = await client.query(
                `SELECT a.balls, a.strikes, a.result, a.outs_after, a.rbi, a.runs_scored, a.ab_end_time,
                        g.base_runners, g.home_score, g.away_score
                 FROM at_bats a
                 JOIN games g ON g.id = a.game_id
                 WHERE a.id = $1`,
                [at_bat_id]
            );
            if (snapshotResult.rows.length === 0) {
                throw new Error('At-bat not found');
            }
            const snap = snapshotResult.rows[0];
            const prevState: PitchPrevState = {
                at_bat: {
                    balls: snap.balls,
                    strikes: snap.strikes,
                    result: snap.result,
                    outs_after: snap.outs_after,
                    rbi: snap.rbi,
                    runs_scored: snap.runs_scored,
                    ab_end_time: snap.ab_end_time,
                },
                game: {
                    base_runners: snap.base_runners ?? { first: false, second: false, third: false },
                    home_score: snap.home_score ?? 0,
                    away_score: snap.away_score ?? 0,
                },
            };

            // Insert pitch
            const pitchId = uuidv4();
            const pitchResult = await client.query(
                `INSERT INTO pitches (
          id, at_bat_id, game_id, pitcher_id, batter_id, opponent_batter_id, pitch_number,
          pitch_type, velocity, location_x, location_y, target_location_x, target_location_y, target_zone, zone,
          balls_before, strikes_before, pitch_result, team_side, prev_state
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
                [
                    pitchId,
                    at_bat_id,
                    game_id,
                    pitcher_id,
                    batter_id || null,
                    opponent_batter_id || null,
                    pitchNumber,
                    pitch_type,
                    velocity,
                    location_x,
                    location_y,
                    target_location_x,
                    target_location_y,
                    target_zone || null,
                    zone,
                    balls_before ?? 0,
                    strikes_before ?? 0,
                    pitch_result,
                    team_side ?? null,
                    JSON.stringify(prevState),
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

            await client.query('UPDATE at_bats SET balls = $1, strikes = $2 WHERE id = $3', [newBalls, newStrikes, at_bat_id]);

            // Auto-add pitch type to pitcher's profile if not already present (skip for opp_pitcher mode)
            if (pitcher_id) {
                const existing = await client.query('SELECT 1 FROM pitcher_pitch_types WHERE player_id = $1 AND pitch_type = $2', [
                    pitcher_id,
                    pitch_type,
                ]);
                if (existing.rows.length === 0) {
                    await client.query('INSERT INTO pitcher_pitch_types (id, player_id, pitch_type) VALUES ($1, $2, $3)', [
                        uuidv4(),
                        pitcher_id,
                        pitch_type,
                    ]);
                }
            }

            return pitchResult.rows[0];
        });

        // Mark scouting tendencies as stale if this pitch was against an opponent batter
        if (opponent_batter_id) {
            try {
                await scoutingService.markTendenciesStale(opponent_batter_id);
            } catch (error) {
                // Don't fail the pitch log if scouting cache update fails
                console.error('Failed to mark tendencies as stale:', error);
            }
        }

        return pitch;
    }

    async undoPitch(pitchId: string): Promise<{ pitch: Pitch; atBat: AtBat; game: Game }> {
        const result = await transaction(async (client) => {
            // 1. Read pitch (lock row)
            const pitchRes = await client.query(`SELECT * FROM pitches WHERE id = $1 FOR UPDATE`, [pitchId]);
            if (pitchRes.rows.length === 0) {
                const err: Error & { status?: number } = new Error('Pitch not found');
                err.status = 404;
                throw err;
            }
            const pitch: Pitch & { prev_state: PitchPrevState | null } = pitchRes.rows[0];

            if (!pitch.prev_state) {
                const err: Error & { status?: number } = new Error('Pitch was logged before undo support — cannot be undone');
                err.status = 400;
                throw err;
            }

            // 2. Reject if pitch is not the latest in its at-bat (race / non-LIFO)
            const latestRes = await client.query(`SELECT id FROM pitches WHERE at_bat_id = $1 ORDER BY pitch_number DESC LIMIT 1`, [
                pitch.at_bat_id,
            ]);
            if (latestRes.rows[0]?.id !== pitchId) {
                const err: Error & { status?: number } = new Error('Only the most recent pitch in an at-bat can be undone');
                err.status = 409;
                throw err;
            }

            // 3. Delete baserunner_events tied to this at-bat that fired AFTER the pitch
            //    (covers the thrown_out_advancing + advancement cascade from a hit/walk).
            //    Mid-AB events recorded before the pitch are preserved.
            await client.query(`DELETE FROM baserunner_events WHERE at_bat_id = $1 AND created_at > $2`, [
                pitch.at_bat_id,
                pitch.created_at,
            ]);

            // 4. Restore at_bats from snapshot
            const prev = pitch.prev_state;
            const atBatRes = await client.query(
                `UPDATE at_bats
                 SET balls = $1,
                     strikes = $2,
                     result = $3,
                     outs_after = $4,
                     rbi = $5,
                     runs_scored = $6,
                     ab_end_time = $7
                 WHERE id = $8
                 RETURNING *`,
                [
                    prev.at_bat.balls,
                    prev.at_bat.strikes,
                    prev.at_bat.result,
                    prev.at_bat.outs_after,
                    prev.at_bat.rbi,
                    prev.at_bat.runs_scored,
                    prev.at_bat.ab_end_time,
                    pitch.at_bat_id,
                ]
            );

            // 5. Restore games (base_runners, scores)
            const gameRes = await client.query(
                `UPDATE games
                 SET base_runners = $1,
                     home_score = $2,
                     away_score = $3
                 WHERE id = $4
                 RETURNING *`,
                [JSON.stringify(prev.game.base_runners), prev.game.home_score, prev.game.away_score, pitch.game_id]
            );

            // 6. Delete the pitch (cascades to plays via FK; pitch_calls.pitch_id set NULL)
            await client.query(`DELETE FROM pitches WHERE id = $1`, [pitchId]);

            return {
                pitch,
                atBat: atBatRes.rows[0],
                game: gameRes.rows[0],
            };
        });

        if (result.pitch.opponent_batter_id) {
            try {
                await scoutingService.markTendenciesStale(result.pitch.opponent_batter_id);
            } catch (error) {
                console.error('Failed to mark tendencies as stale on undo:', error);
            }
        }

        return result;
    }

    async getPitchById(pitchId: string): Promise<Pitch | null> {
        const result = await query('SELECT * FROM pitches WHERE id = $1', [pitchId]);
        return result.rows[0] || null;
    }

    async getPitchesByAtBat(atBatId: string): Promise<Pitch[]> {
        const result = await query('SELECT * FROM pitches WHERE at_bat_id = $1 ORDER BY pitch_number ASC', [atBatId]);
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
       LEFT JOIN players b ON p.batter_id = b.id
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
