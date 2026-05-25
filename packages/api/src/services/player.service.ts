import { query, transaction } from '../config/database';
import { MyPlayerStats, PlayerStatGame, Player, RosterImportRow, RosterImportResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PlayerService {
    async createPlayer(playerData: Partial<Player>): Promise<Player> {
        const { team_id, first_name, last_name, jersey_number, primary_position, secondary_position, bats, throws } = playerData;

        if (!team_id || !first_name || !last_name || !primary_position) {
            throw new Error('team_id, first_name, last_name, and primary_position are required');
        }

        const player_id = uuidv4();
        const result = await query(
            `INSERT INTO players (id, team_id, first_name, last_name, jersey_number, primary_position, secondary_position, bats, throws)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [player_id, team_id, first_name, last_name, jersey_number, primary_position, secondary_position ?? null, bats, throws]
        );

        return result.rows[0];
    }

    async getPlayerById(player_id: string): Promise<Player | null> {
        const result = await query('SELECT * FROM players WHERE id = $1', [player_id]);
        return result.rows[0] || null;
    }

    async getPlayersByTeam(team_id: string): Promise<Player[]> {
        // has_pitches flags players with at least one logged pitch so the
        // roster UI can gate the Performance Report button to data-bearing
        // players (a roster pitcher who's never thrown a pitch in the system
        // wouldn't have a useful report).
        const result = await query(
            `SELECT p.*, EXISTS (
                 SELECT 1 FROM pitches pi WHERE pi.pitcher_id = p.id
             ) AS has_pitches
             FROM players p
             WHERE p.team_id = $1 AND p.is_active = true
             ORDER BY p.jersey_number, p.last_name`,
            [team_id]
        );
        return result.rows;
    }

    async updatePlayer(player_id: string, updates: Partial<Player>): Promise<Player> {
        const player = await this.getPlayerById(player_id);
        if (!player) {
            throw new Error('Player not found');
        }

        const { first_name, last_name, jersey_number, primary_position, secondary_position, bats, throws, is_active } = updates;

        const result = await query(
            `UPDATE players
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           jersey_number = COALESCE($3, jersey_number),
           primary_position = COALESCE($4, primary_position),
           secondary_position = $5,
           bats = COALESCE($6, bats),
           throws = COALESCE($7, throws),
           is_active = COALESCE($8, is_active)
       WHERE id = $9
       RETURNING *`,
            [first_name, last_name, jersey_number, primary_position, secondary_position ?? null, bats, throws, is_active, player_id]
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
        const battingAverage = stats.total_at_bats > 0 ? (stats.hits / stats.total_at_bats).toFixed(3) : '0.000';

        return {
            ...stats,
            batting_average: battingAverage,
        };
    }

    // Get players who can pitch (primary or secondary position is P)
    async getPitchersByTeam(team_id: string): Promise<Player[]> {
        const result = await query(
            `SELECT * FROM players
       WHERE team_id = $1 AND is_active = true AND (primary_position = 'P' OR secondary_position = 'P')
       ORDER BY jersey_number, last_name`,
            [team_id]
        );
        return result.rows;
    }

    // Pitcher pitch types management
    async getPitcherPitchTypes(player_id: string): Promise<string[]> {
        const result = await query(`SELECT pitch_type FROM pitcher_pitch_types WHERE player_id = $1 ORDER BY pitch_type`, [
            player_id,
        ]);
        return result.rows.map((row: { pitch_type: string }) => row.pitch_type);
    }

    async setPitcherPitchTypes(player_id: string, pitch_types: string[]): Promise<string[]> {
        // Delete existing pitch types
        await query('DELETE FROM pitcher_pitch_types WHERE player_id = $1', [player_id]);

        // Insert new pitch types
        for (const pitch_type of pitch_types) {
            const id = uuidv4();
            await query('INSERT INTO pitcher_pitch_types (id, player_id, pitch_type) VALUES ($1, $2, $3)', [
                id,
                player_id,
                pitch_type,
            ]);
        }

        return pitch_types;
    }

    async getPlayerWithPitchTypes(player_id: string): Promise<any> {
        const player = await this.getPlayerById(player_id);
        if (!player) return null;

        const pitch_types = await this.getPitcherPitchTypes(player_id);
        return { ...player, pitch_types };
    }

    async importRoster(team_id: string, rows: RosterImportRow[], mode: 'merge' | 'replace'): Promise<RosterImportResult> {
        const result: RosterImportResult = { imported: 0, skipped: 0, errors: [], players: [] };

        await transaction(async (client) => {
            if (mode === 'replace') {
                await client.query('UPDATE players SET is_active = false WHERE team_id = $1', [team_id]);
            }

            for (const row of rows) {
                try {
                    const player_id = uuidv4();
                    const { rows: inserted } = await client.query(
                        `INSERT INTO players (id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         RETURNING *`,
                        [
                            player_id,
                            team_id,
                            row.first_name.trim(),
                            row.last_name.trim(),
                            row.jersey_number ?? null,
                            row.primary_position,
                            row.bats,
                            row.throws,
                        ]
                    );

                    const player: Player = inserted[0];

                    if (row.primary_position === 'P' && row.pitch_types && row.pitch_types.length > 0) {
                        for (const pt of row.pitch_types) {
                            await client.query('INSERT INTO pitcher_pitch_types (id, player_id, pitch_type) VALUES ($1, $2, $3)', [
                                uuidv4(),
                                player_id,
                                pt,
                            ]);
                        }
                    }

                    result.players.push(player);
                    result.imported++;
                } catch (err: unknown) {
                    result.skipped++;
                    result.errors.push(
                        `Row ${row.first_name} ${row.last_name}: ${err instanceof Error ? err.message : 'unknown error'}`
                    );
                }
            }
        });

        return result;
    }

    async getPitchersWithPitchTypes(team_id: string): Promise<any[]> {
        const pitchers = await this.getPitchersByTeam(team_id);
        const results = [];

        for (const pitcher of pitchers) {
            const pitch_types = await this.getPitcherPitchTypes(pitcher.id);
            results.push({ ...pitcher, pitch_types });
        }

        return results;
    }

    // Get pitcher stats for current game (live tally)
    async getPitcherGameStats(pitcher_id: string, game_id: string): Promise<any> {
        // Get pitch counts by type and result
        const countResult = await query(
            `SELECT
         pitch_type,
         pitch_result,
         COUNT(*) as count
       FROM pitches
       WHERE pitcher_id = $1 AND game_id = $2
       GROUP BY pitch_type, pitch_result`,
            [pitcher_id, game_id]
        );

        // Get velocity stats by pitch type
        const velocityResult = await query(
            `SELECT
         pitch_type,
         MAX(velocity) as top_velocity,
         AVG(velocity) as avg_velocity
       FROM pitches
       WHERE pitcher_id = $1 AND game_id = $2 AND velocity IS NOT NULL
       GROUP BY pitch_type`,
            [pitcher_id, game_id]
        );

        const stats = {
            pitcher_id,
            game_id,
            total_pitches: 0,
            strikes: 0,
            balls: 0,
            pitch_type_breakdown: {} as {
                [key: string]: {
                    total: number;
                    strikes: number;
                    balls: number;
                    top_velocity: number | null;
                    avg_velocity: number | null;
                };
            },
        };

        // Process count results
        for (const row of countResult.rows) {
            const { pitch_type, pitch_result, count } = row;
            const pitchCount = parseInt(count);

            // Initialize pitch type if not exists
            if (!stats.pitch_type_breakdown[pitch_type]) {
                stats.pitch_type_breakdown[pitch_type] = { total: 0, strikes: 0, balls: 0, top_velocity: null, avg_velocity: null };
            }

            stats.total_pitches += pitchCount;
            stats.pitch_type_breakdown[pitch_type].total += pitchCount;

            // Count as strike if not a ball (in_play, called_strike, swinging_strike, foul all count as strikes)
            if (pitch_result === 'ball') {
                stats.balls += pitchCount;
                stats.pitch_type_breakdown[pitch_type].balls += pitchCount;
            } else {
                stats.strikes += pitchCount;
                stats.pitch_type_breakdown[pitch_type].strikes += pitchCount;
            }
        }

        // Add velocity stats to pitch type breakdown
        for (const row of velocityResult.rows) {
            const { pitch_type, top_velocity, avg_velocity } = row;
            if (stats.pitch_type_breakdown[pitch_type]) {
                stats.pitch_type_breakdown[pitch_type].top_velocity = top_velocity ? parseFloat(top_velocity) : null;
                stats.pitch_type_breakdown[pitch_type].avg_velocity = avg_velocity
                    ? parseFloat(parseFloat(avg_velocity).toFixed(1))
                    : null;
            }
        }

        return stats;
    }

    /**
     * Return every player record linked to the given user, scoped to teams
     * where the user has `team_members.role='player'`. Used by /players/me to
     * drive the PlayerDashboard team switcher. Each row includes the team
     * name so the UI doesn't need a second call.
     */
    async getPlayersForUser(userId: string): Promise<Array<Player & { team_name?: string }>> {
        const result = await query(
            `SELECT p.*, t.name AS team_name
             FROM team_members tm
             JOIN teams t ON t.id = tm.team_id
             LEFT JOIN players p ON p.id = tm.player_id
             WHERE tm.user_id = $1 AND tm.role = 'player'
             ORDER BY t.name ASC`,
            [userId]
        );
        // tm rows without a linked player return p.* as NULL — filter them
        return result.rows.filter((r) => r.id !== null);
    }

    /**
     * The logged-in player's own batting + pitching aggregates and a
     * per-game scoreboard. Scoped server-side to the `players` row linked to
     * this user — there is no player_id input, so a player can only ever see
     * their own line. `teamId` disambiguates multi-team players; it is
     * validated by the resolution query (a team the user isn't a player on
     * yields no row → null → 403 at the controller).
     */
    async getMyStats(userId: string, teamId?: string): Promise<MyPlayerStats | null> {
        const playerResult = await query(
            `SELECT p.id, p.team_id, t.name AS team_name
             FROM team_members tm
             JOIN teams t ON t.id = tm.team_id
             JOIN players p ON p.id = tm.player_id
             WHERE tm.user_id = $1 AND tm.role = 'player'
               AND ($2::uuid IS NULL OR tm.team_id = $2::uuid)
             ORDER BY t.name ASC
             LIMIT 1`,
            [userId, teamId ?? null]
        );
        if (playerResult.rows.length === 0) return null;

        const { id: playerId, team_id, team_name } = playerResult.rows[0];

        const [battingByGame, pitchingByGame, battersFacedByGame, gamesResult] = await Promise.all([
            query(
                `SELECT game_id,
                        COUNT(*) AS at_bats,
                        COUNT(*) FILTER (WHERE result IN ('single', 'double', 'triple', 'home_run')) AS hits,
                        COUNT(*) FILTER (WHERE result = 'strikeout') AS strikeouts,
                        COUNT(*) FILTER (WHERE result = 'walk') AS walks,
                        COALESCE(SUM(rbi), 0) AS rbi,
                        COALESCE(SUM(runs_scored), 0) AS runs
                 FROM at_bats
                 WHERE batter_id = $1
                 GROUP BY game_id`,
                [playerId]
            ),
            query(
                `SELECT game_id,
                        COUNT(*) AS total_pitches,
                        COUNT(*) FILTER (WHERE pitch_result = 'ball') AS balls
                 FROM pitches
                 WHERE pitcher_id = $1
                 GROUP BY game_id`,
                [playerId]
            ),
            query(`SELECT game_id, COUNT(*) AS batters_faced FROM at_bats WHERE pitcher_id = $1 GROUP BY game_id`, [playerId]),
            query(
                `SELECT g.id, g.game_date, g.opponent_name, g.home_score, g.away_score, g.is_home_game
                 FROM games g
                 WHERE g.id IN (
                     SELECT game_id FROM at_bats WHERE batter_id = $1
                     UNION
                     SELECT game_id FROM pitches WHERE pitcher_id = $1
                 )
                 ORDER BY g.game_date DESC
                 LIMIT 30`,
                [playerId]
            ),
        ]);

        const battingGames = new Map<
            string,
            { at_bats: number; hits: number; strikeouts: number; walks: number; rbi: number; runs: number }
        >();
        for (const r of battingByGame.rows) {
            battingGames.set(r.game_id, {
                at_bats: parseInt(r.at_bats, 10),
                hits: parseInt(r.hits, 10),
                strikeouts: parseInt(r.strikeouts, 10),
                walks: parseInt(r.walks, 10),
                rbi: parseInt(r.rbi, 10),
                runs: parseInt(r.runs, 10),
            });
        }

        const pitchingGames = new Map<string, { total_pitches: number; balls: number; batters_faced: number }>();
        for (const r of pitchingByGame.rows) {
            const total = parseInt(r.total_pitches, 10);
            pitchingGames.set(r.game_id, { total_pitches: total, balls: parseInt(r.balls, 10), batters_faced: 0 });
        }
        for (const r of battersFacedByGame.rows) {
            const entry = pitchingGames.get(r.game_id);
            if (entry) entry.batters_faced = parseInt(r.batters_faced, 10);
        }

        // Batting aggregate across all games
        const batting =
            battingGames.size > 0
                ? {
                      games: battingGames.size,
                      at_bats: 0,
                      hits: 0,
                      rbi: 0,
                      runs: 0,
                      walks: 0,
                      strikeouts: 0,
                      batting_average: '0.000',
                  }
                : null;
        if (batting) {
            for (const g of battingGames.values()) {
                batting.at_bats += g.at_bats;
                batting.hits += g.hits;
                batting.rbi += g.rbi;
                batting.runs += g.runs;
                batting.walks += g.walks;
                batting.strikeouts += g.strikeouts;
            }
            batting.batting_average = batting.at_bats > 0 ? (batting.hits / batting.at_bats).toFixed(3) : '0.000';
        }

        // Pitching aggregate across all games
        const pitching =
            pitchingGames.size > 0
                ? { games: pitchingGames.size, batters_faced: 0, total_pitches: 0, strikes: 0, balls: 0, strike_percentage: 0 }
                : null;
        if (pitching) {
            for (const g of pitchingGames.values()) {
                pitching.total_pitches += g.total_pitches;
                pitching.balls += g.balls;
                pitching.batters_faced += g.batters_faced;
            }
            pitching.strikes = pitching.total_pitches - pitching.balls;
            pitching.strike_percentage =
                pitching.total_pitches > 0 ? Math.round((pitching.strikes / pitching.total_pitches) * 100) : 0;
        }

        const games: PlayerStatGame[] = gamesResult.rows.map((g) => {
            const isAway = g.is_home_game === false;
            const teamScore = isAway ? g.away_score : g.home_score;
            const oppScore = isAway ? g.home_score : g.away_score;
            let result: 'W' | 'L' | 'T' | null = null;
            if (teamScore !== null && teamScore !== undefined && oppScore !== null && oppScore !== undefined) {
                result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';
            }

            const bat = battingGames.get(g.id);
            let battingLine: string | null = null;
            if (bat) {
                battingLine = `${bat.hits}-for-${bat.at_bats}`;
                if (bat.rbi > 0) battingLine += `, ${bat.rbi} RBI`;
            }

            const pit = pitchingGames.get(g.id);
            let pitchingLine: string | null = null;
            if (pit) {
                const pct = pit.total_pitches > 0 ? Math.round(((pit.total_pitches - pit.balls) / pit.total_pitches) * 100) : 0;
                pitchingLine = `${pit.total_pitches} P · ${pct}% strikes · ${pit.batters_faced} BF`;
            }

            return {
                game_id: g.id,
                game_date: g.game_date,
                opponent_name: g.opponent_name ?? null,
                team_score: teamScore ?? null,
                opponent_score: oppScore ?? null,
                result,
                batting_line: battingLine,
                pitching_line: pitchingLine,
            };
        });

        return { player_id: playerId, team_id, team_name: team_name ?? null, batting, pitching, games };
    }
}

export default new PlayerService();
