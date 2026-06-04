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

    /**
     * Update the result of the most recent pitch in its at-bat (UX-LG-01 "Fix Last Pitch").
     *
     * Deliberately narrow: only result-only edits where neither the old nor new result
     * crosses an at-bat-ending boundary (4th ball / 3rd strike / in_play / hit_by_pitch).
     * Boundary cases get a 409 with code AB_BOUNDARY — the client falls back to Undo.
     */
    async updatePitchResult(pitchId: string, newResult: string): Promise<{ pitch: Pitch; atBat: AtBat }> {
        return await transaction(async (client) => {
            // 1. Lock pitch row + read snapshot
            const pitchRes = await client.query(`SELECT * FROM pitches WHERE id = $1 FOR UPDATE`, [pitchId]);
            if (pitchRes.rows.length === 0) {
                const err: Error & { status?: number; code?: string } = new Error('Pitch not found');
                err.status = 404;
                throw err;
            }
            const pitch: Pitch & { prev_state: PitchPrevState | null } = pitchRes.rows[0];

            if (!pitch.prev_state) {
                const err: Error & { status?: number; code?: string } = new Error(
                    'Pitch was logged before edit support — cannot be edited'
                );
                err.status = 400;
                err.code = 'NO_PREV_STATE';
                throw err;
            }

            // 2. Must be the most-recent pitch in this at-bat
            const latestRes = await client.query(`SELECT id FROM pitches WHERE at_bat_id = $1 ORDER BY pitch_number DESC LIMIT 1`, [
                pitch.at_bat_id,
            ]);
            if (latestRes.rows[0]?.id !== pitchId) {
                const err: Error & { status?: number; code?: string } = new Error('Only the most recent pitch can be edited');
                err.status = 409;
                err.code = 'NOT_LATEST';
                throw err;
            }

            // 3. Old result must not be at-bat-ending
            const oldResult = pitch.pitch_result;
            const isAbEnding = (r: string, balls: number, strikes: number): boolean => {
                if (r === 'in_play' || r === 'hit_by_pitch') return true;
                if (r === 'ball' && balls + 1 >= 4) return true;
                if ((r === 'called_strike' || r === 'swinging_strike') && strikes + 1 >= 3) return true;
                // a foul at 2 strikes is NOT a strike (stays at 2), so it doesn't end the AB
                return false;
            };
            const ballsBefore = pitch.balls_before;
            const strikesBefore = pitch.strikes_before;
            if (isAbEnding(oldResult, ballsBefore, strikesBefore)) {
                const err: Error & { status?: number; code?: string } = new Error(
                    'Pitch ended the at-bat; use Undo to revert and re-log'
                );
                err.status = 409;
                err.code = 'AB_BOUNDARY';
                throw err;
            }
            if (isAbEnding(newResult, ballsBefore, strikesBefore)) {
                const err: Error & { status?: number; code?: string } = new Error(
                    'New result would end the at-bat; use Undo + re-log instead'
                );
                err.status = 409;
                err.code = 'AB_BOUNDARY';
                throw err;
            }

            // 4. Compute new at-bat count from snapshot + new result
            let newBalls = ballsBefore;
            let newStrikes = strikesBefore;
            if (newResult === 'ball') {
                newBalls++;
            } else if (newResult === 'called_strike' || newResult === 'swinging_strike') {
                newStrikes++;
            } else if (newResult === 'foul' && newStrikes < 2) {
                newStrikes++;
            }

            // 5. Update the pitch row and the at-bat count
            const updatedPitchRes = await client.query(`UPDATE pitches SET pitch_result = $1 WHERE id = $2 RETURNING *`, [
                newResult,
                pitchId,
            ]);
            const updatedAbRes = await client.query(`UPDATE at_bats SET balls = $1, strikes = $2 WHERE id = $3 RETURNING *`, [
                newBalls,
                newStrikes,
                pitch.at_bat_id,
            ]);

            const result = { pitch: updatedPitchRes.rows[0], atBat: updatedAbRes.rows[0] };

            // 6. Tendencies cache invalidation, same as logPitch / undoPitch
            if (pitch.opponent_batter_id) {
                try {
                    await scoutingService.markTendenciesStale(pitch.opponent_batter_id);
                } catch (error) {
                    console.error('Failed to mark tendencies as stale on edit:', error);
                }
            }

            return result;
        });
    }

    /**
     * Bulk-backfill per-pitch velocities for a completed game (manual entry from
     * the web). Edits any pitch in the game (unlike updatePitchResult, which is
     * latest-pitch-only) and never touches the count — velocity is independent of
     * balls/strikes. Each UPDATE is scoped by game_id so a stray pitch_id from
     * another game can't be written. Invalidates the cached game performance
     * summaries so top/avg velocity recompute on next read.
     */
    async updatePitchVelocities(
        gameId: string,
        updates: { pitch_id: string; velocity: number | null }[]
    ): Promise<{ updated: number }> {
        return await transaction(async (client) => {
            let updated = 0;
            for (const { pitch_id, velocity } of updates) {
                const res = await client.query(`UPDATE pitches SET velocity = $1 WHERE id = $2 AND game_id = $3`, [
                    velocity,
                    pitch_id,
                    gameId,
                ]);
                if (res.rowCount === 0) {
                    const err: Error & { status?: number; code?: string } = new Error(
                        `Pitch ${pitch_id} not found in game ${gameId}`
                    );
                    err.status = 404;
                    err.code = 'PITCH_NOT_IN_GAME';
                    throw err;
                }
                updated += res.rowCount ?? 0;
            }
            // Cache-aside invalidation, mirroring game.service.deleteGame: the cached
            // top/avg velocity for this game must recompute from the new values.
            await client.query(`DELETE FROM performance_summaries WHERE source_type = 'game' AND source_id = $1`, [gameId]);
            return { updated };
        });
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
