import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import {
    BatterScoutingProfile,
    BatterScoutingNote,
    BatterTendencies,
    AutoDetectedTendency,
    BatterScoutingReport,
    TendencyConfidence,
} from '@pitch-tracker/shared';
import { HEAT_ZONES, getZoneForPitch } from '../utils/heatZones';

export class ScoutingService {
    // Normalize player name for matching across games
    private normalizePlayerName(name: string): string {
        return name.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    // Get or create a scouting profile for an opponent batter
    async getOrCreateProfile(
        teamId: string,
        opponentTeamName: string,
        playerName: string,
        bats: string = 'R'
    ): Promise<BatterScoutingProfile> {
        const normalizedName = this.normalizePlayerName(playerName);
        const normalizedTeam = opponentTeamName.toLowerCase().trim();

        // Check if profile exists
        const existing = await query(
            `SELECT * FROM batter_scouting_profiles
             WHERE team_id = $1 AND LOWER(opponent_team_name) = $2 AND normalized_name = $3`,
            [teamId, normalizedTeam, normalizedName]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Create new profile
        const id = uuidv4();
        const result = await query(
            `INSERT INTO batter_scouting_profiles
             (id, team_id, opponent_team_name, player_name, normalized_name, bats)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, teamId, opponentTeamName, playerName, normalizedName, bats]
        );

        return result.rows[0];
    }

    // Link opponent_lineup entry to profile
    async linkLineupToProfile(opponentLineupId: string, profileId: string): Promise<void> {
        await query(
            `INSERT INTO opponent_lineup_profiles (opponent_lineup_id, profile_id)
             VALUES ($1, $2)
             ON CONFLICT (opponent_lineup_id) DO UPDATE SET profile_id = $2`,
            [opponentLineupId, profileId]
        );
    }

    // Get profile for an opponent_lineup entry
    async getProfileForLineup(opponentLineupId: string): Promise<BatterScoutingProfile | null> {
        const result = await query(
            `SELECT bsp.* FROM batter_scouting_profiles bsp
             JOIN opponent_lineup_profiles olp ON bsp.id = olp.profile_id
             WHERE olp.opponent_lineup_id = $1`,
            [opponentLineupId]
        );
        return result.rows[0] || null;
    }

    // Get empty tendencies object
    private getEmptyTendencies(profileId: string): BatterTendencies {
        return {
            id: '',
            profile_id: profileId,
            total_pitches_seen: 0,
            total_at_bats: 0,
            pitches_outside_zone: 0,
            swings_outside_zone: 0,
            chase_rate: null,
            pitches_inside_zone: 0,
            takes_inside_zone: 0,
            watch_rate: null,
            early_count_pitches: 0,
            early_count_swings: 0,
            early_count_rate: null,
            first_pitches: 0,
            first_pitch_takes: 0,
            first_pitch_take_rate: null,
            breaking_outside: 0,
            breaking_outside_swings: 0,
            breaking_chase_rate: null,
            zone_tendencies: {},
            last_calculated_at: null,
            is_stale: true,
        };
    }

    // Calculate tendencies from pitch data
    async calculateTendencies(profileId: string): Promise<BatterTendencies> {
        // Get all opponent_lineup IDs linked to this profile
        const lineupIds = await query(
            `SELECT opponent_lineup_id FROM opponent_lineup_profiles WHERE profile_id = $1`,
            [profileId]
        );

        const batterIds = lineupIds.rows.map((r: { opponent_lineup_id: string }) => r.opponent_lineup_id);

        if (batterIds.length === 0) {
            return this.getEmptyTendencies(profileId);
        }

        // Get all pitches for these batters
        const pitchesResult = await query(
            `SELECT p.*, ab.id as at_bat_id
             FROM pitches p
             JOIN at_bats ab ON p.at_bat_id = ab.id
             WHERE p.opponent_batter_id = ANY($1)`,
            [batterIds]
        );

        const pitches = pitchesResult.rows;

        if (pitches.length === 0) {
            return this.getEmptyTendencies(profileId);
        }

        // Initialize counters
        let totalPitches = 0;
        let pitchesOutside = 0;
        let swingsOutside = 0;
        let pitchesInside = 0;
        let takesInside = 0;
        let earlyCountPitches = 0;
        let earlyCountSwings = 0;
        let firstPitches = 0;
        let firstPitchTakes = 0;
        let breakingOutside = 0;
        let breakingOutsideSwings = 0;

        const zoneTendencies: Record<string, { swings: number; total: number }> = {};
        const breakingBallTypes = ['slider', 'curveball', 'changeup', 'splitter'];

        for (const pitch of pitches) {
            totalPitches++;

            const x = parseFloat(pitch.location_x) || 0;
            const y = parseFloat(pitch.location_y) || 0;
            const zoneId = getZoneForPitch(x, y);
            const zone = HEAT_ZONES.find((z) => z.id === zoneId);
            const isInside = zone?.isInside ?? false;
            const isSwing = ['swinging_strike', 'foul', 'in_play'].includes(pitch.pitch_result);
            const isTake = ['ball', 'called_strike'].includes(pitch.pitch_result);

            // Zone tendencies
            if (zoneId) {
                if (!zoneTendencies[zoneId]) {
                    zoneTendencies[zoneId] = { swings: 0, total: 0 };
                }
                zoneTendencies[zoneId].total++;
                if (isSwing) zoneTendencies[zoneId].swings++;
            }

            // Chase rate (outside zone)
            if (!isInside) {
                pitchesOutside++;
                if (isSwing) swingsOutside++;

                // Breaking ball chase
                if (breakingBallTypes.includes(pitch.pitch_type)) {
                    breakingOutside++;
                    if (isSwing) breakingOutsideSwings++;
                }
            }

            // Watch rate (inside zone)
            if (isInside) {
                pitchesInside++;
                if (isTake) takesInside++;
            }

            // Early count (0-0, 1-0, 0-1)
            const b = pitch.balls_before;
            const s = pitch.strikes_before;
            if ((b === 0 && s === 0) || (b === 1 && s === 0) || (b === 0 && s === 1)) {
                earlyCountPitches++;
                if (isSwing) earlyCountSwings++;
            }

            // First pitch
            if (pitch.pitch_number === 1) {
                firstPitches++;
                if (isTake) firstPitchTakes++;
            }
        }

        // Count unique at-bats
        const uniqueAtBats = new Set(pitches.map((p: { at_bat_id: string }) => p.at_bat_id)).size;

        // Calculate rates
        const chaseRate = pitchesOutside > 0 ? swingsOutside / pitchesOutside : null;
        const watchRate = pitchesInside > 0 ? takesInside / pitchesInside : null;
        const earlyRate = earlyCountPitches > 0 ? earlyCountSwings / earlyCountPitches : null;
        const firstPitchRate = firstPitches > 0 ? firstPitchTakes / firstPitches : null;
        const breakingChase = breakingOutside > 0 ? breakingOutsideSwings / breakingOutside : null;

        // Transform zone tendencies
        const zoneTendenciesFormatted: Record<string, { swing_rate: number; count: number }> = {};
        for (const [zId, data] of Object.entries(zoneTendencies)) {
            zoneTendenciesFormatted[zId] = {
                swing_rate: data.total > 0 ? data.swings / data.total : 0,
                count: data.total,
            };
        }

        // Upsert tendencies
        const tendencyId = uuidv4();
        const result = await query(
            `INSERT INTO batter_tendencies (
                id, profile_id,
                total_pitches_seen, total_at_bats,
                pitches_outside_zone, swings_outside_zone, chase_rate,
                pitches_inside_zone, takes_inside_zone, watch_rate,
                early_count_pitches, early_count_swings, early_count_rate,
                first_pitches, first_pitch_takes, first_pitch_take_rate,
                breaking_outside, breaking_outside_swings, breaking_chase_rate,
                zone_tendencies, last_calculated_at, is_stale
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP, FALSE)
            ON CONFLICT (profile_id) DO UPDATE SET
                total_pitches_seen = EXCLUDED.total_pitches_seen,
                total_at_bats = EXCLUDED.total_at_bats,
                pitches_outside_zone = EXCLUDED.pitches_outside_zone,
                swings_outside_zone = EXCLUDED.swings_outside_zone,
                chase_rate = EXCLUDED.chase_rate,
                pitches_inside_zone = EXCLUDED.pitches_inside_zone,
                takes_inside_zone = EXCLUDED.takes_inside_zone,
                watch_rate = EXCLUDED.watch_rate,
                early_count_pitches = EXCLUDED.early_count_pitches,
                early_count_swings = EXCLUDED.early_count_swings,
                early_count_rate = EXCLUDED.early_count_rate,
                first_pitches = EXCLUDED.first_pitches,
                first_pitch_takes = EXCLUDED.first_pitch_takes,
                first_pitch_take_rate = EXCLUDED.first_pitch_take_rate,
                breaking_outside = EXCLUDED.breaking_outside,
                breaking_outside_swings = EXCLUDED.breaking_outside_swings,
                breaking_chase_rate = EXCLUDED.breaking_chase_rate,
                zone_tendencies = EXCLUDED.zone_tendencies,
                last_calculated_at = CURRENT_TIMESTAMP,
                is_stale = FALSE,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [
                tendencyId,
                profileId,
                totalPitches,
                uniqueAtBats,
                pitchesOutside,
                swingsOutside,
                chaseRate,
                pitchesInside,
                takesInside,
                watchRate,
                earlyCountPitches,
                earlyCountSwings,
                earlyRate,
                firstPitches,
                firstPitchTakes,
                firstPitchRate,
                breakingOutside,
                breakingOutsideSwings,
                breakingChase,
                JSON.stringify(zoneTendenciesFormatted),
            ]
        );

        return result.rows[0];
    }

    // Generate auto-detected tendency descriptions
    generateAutoDetectedTendencies(tendencies: BatterTendencies): AutoDetectedTendency[] {
        const results: AutoDetectedTendency[] = [];
        const MIN_SAMPLE = 10;

        // Helper to determine confidence
        const getConfidence = (sampleSize: number): TendencyConfidence => {
            if (sampleSize >= 50) return 'high';
            if (sampleSize >= 20) return 'medium';
            return 'low';
        };

        // Chase rate
        if (tendencies.pitches_outside_zone >= MIN_SAMPLE && tendencies.chase_rate !== null) {
            if (tendencies.chase_rate > 0.35) {
                results.push({
                    type: 'chase',
                    description: 'Chases pitches outside the zone',
                    confidence: getConfidence(tendencies.pitches_outside_zone),
                    value: tendencies.chase_rate,
                    sample_size: tendencies.pitches_outside_zone,
                });
            }
        }

        // Breaking ball chase
        if (tendencies.breaking_outside >= MIN_SAMPLE && tendencies.breaking_chase_rate !== null) {
            if (tendencies.breaking_chase_rate > 0.4) {
                results.push({
                    type: 'chase',
                    description: 'Chases breaking balls outside the zone',
                    confidence: getConfidence(tendencies.breaking_outside),
                    value: tendencies.breaking_chase_rate,
                    sample_size: tendencies.breaking_outside,
                });
            }
        }

        // Watch rate (takes pitches in zone)
        if (tendencies.pitches_inside_zone >= MIN_SAMPLE && tendencies.watch_rate !== null) {
            if (tendencies.watch_rate > 0.35) {
                results.push({
                    type: 'takes',
                    description: 'Takes pitches inside the zone',
                    confidence: getConfidence(tendencies.pitches_inside_zone),
                    value: tendencies.watch_rate,
                    sample_size: tendencies.pitches_inside_zone,
                });
            }
        }

        // Early count aggression
        if (tendencies.early_count_pitches >= MIN_SAMPLE && tendencies.early_count_rate !== null) {
            if (tendencies.early_count_rate > 0.5) {
                results.push({
                    type: 'aggressive',
                    description: 'Aggressive early in count',
                    confidence: getConfidence(tendencies.early_count_pitches),
                    value: tendencies.early_count_rate,
                    sample_size: tendencies.early_count_pitches,
                });
            } else if (tendencies.early_count_rate < 0.25) {
                results.push({
                    type: 'passive',
                    description: 'Patient early in count',
                    confidence: getConfidence(tendencies.early_count_pitches),
                    value: tendencies.early_count_rate,
                    sample_size: tendencies.early_count_pitches,
                });
            }
        }

        // First pitch tendency
        if (tendencies.first_pitches >= MIN_SAMPLE && tendencies.first_pitch_take_rate !== null) {
            if (tendencies.first_pitch_take_rate > 0.7) {
                results.push({
                    type: 'first_pitch',
                    description: 'Takes first pitch',
                    confidence: getConfidence(tendencies.first_pitches),
                    value: tendencies.first_pitch_take_rate,
                    sample_size: tendencies.first_pitches,
                });
            } else if (tendencies.first_pitch_take_rate < 0.3) {
                results.push({
                    type: 'first_pitch',
                    description: 'Swings at first pitch',
                    confidence: getConfidence(tendencies.first_pitches),
                    value: 1 - tendencies.first_pitch_take_rate,
                    sample_size: tendencies.first_pitches,
                });
            }
        }

        return results;
    }

    // Get full scouting report
    async getScoutingReport(opponentLineupId: string): Promise<BatterScoutingReport | null> {
        // Get lineup entry with game info
        const lineupResult = await query(
            `SELECT ol.*, g.opponent_name, g.home_team_id
             FROM opponent_lineup ol
             JOIN games g ON ol.game_id = g.id
             WHERE ol.id = $1`,
            [opponentLineupId]
        );

        if (lineupResult.rows.length === 0) {
            return null;
        }

        const lineup = lineupResult.rows[0];

        // Get or create profile
        const profile = await this.getOrCreateProfile(
            lineup.home_team_id,
            lineup.opponent_name || 'Unknown',
            lineup.player_name,
            lineup.bats
        );

        // Link this lineup entry to the profile if not already linked
        await this.linkLineupToProfile(opponentLineupId, profile.id);

        // Get tendencies (recalculate if stale)
        let tendencies = await this.getTendencies(profile.id);
        if (!tendencies || tendencies.is_stale) {
            tendencies = await this.calculateTendencies(profile.id);
        }

        // Get notes
        const notesResult = await query(
            `SELECT bsn.*, u.first_name, u.last_name
             FROM batter_scouting_notes bsn
             LEFT JOIN users u ON bsn.created_by = u.id
             WHERE bsn.profile_id = $1
             ORDER BY bsn.created_at DESC`,
            [profile.id]
        );

        const notes: BatterScoutingNote[] = notesResult.rows.map((n: any) => ({
            ...n,
            created_by_name: n.first_name ? `${n.first_name} ${n.last_name}` : undefined,
        }));

        // Count games faced
        const gamesResult = await query(
            `SELECT COUNT(DISTINCT g.id) as games
             FROM games g
             JOIN opponent_lineup ol ON ol.game_id = g.id
             JOIN opponent_lineup_profiles olp ON olp.opponent_lineup_id = ol.id
             WHERE olp.profile_id = $1`,
            [profile.id]
        );

        const gamesFaced = parseInt(gamesResult.rows[0]?.games || '0');

        // Generate auto-detected tendencies
        const autoDetected = tendencies ? this.generateAutoDetectedTendencies(tendencies) : [];

        return {
            profile,
            tendencies,
            notes,
            auto_detected: autoDetected,
            games_faced: gamesFaced,
        };
    }

    // Get tendencies from cache
    async getTendencies(profileId: string): Promise<BatterTendencies | null> {
        const result = await query(`SELECT * FROM batter_tendencies WHERE profile_id = $1`, [profileId]);
        if (result.rows.length === 0) {
            return null;
        }
        // Parse zone_tendencies from JSON if needed
        const row = result.rows[0];
        if (typeof row.zone_tendencies === 'string') {
            row.zone_tendencies = JSON.parse(row.zone_tendencies);
        }
        return row;
    }

    // Add manual note
    async addNote(profileId: string, noteText: string, createdBy?: string): Promise<BatterScoutingNote> {
        const id = uuidv4();
        const result = await query(
            `INSERT INTO batter_scouting_notes (id, profile_id, note_text, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, profileId, noteText, createdBy]
        );
        return result.rows[0];
    }

    // Update note
    async updateNote(noteId: string, noteText: string): Promise<BatterScoutingNote> {
        const result = await query(
            `UPDATE batter_scouting_notes
             SET note_text = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [noteText, noteId]
        );
        if (result.rows.length === 0) {
            throw new Error('Note not found');
        }
        return result.rows[0];
    }

    // Delete note
    async deleteNote(noteId: string): Promise<void> {
        await query(`DELETE FROM batter_scouting_notes WHERE id = $1`, [noteId]);
    }

    // Mark tendencies as stale (call this when new pitches are logged)
    async markTendenciesStale(opponentLineupId: string): Promise<void> {
        await query(
            `UPDATE batter_tendencies bt
             SET is_stale = TRUE, updated_at = CURRENT_TIMESTAMP
             FROM opponent_lineup_profiles olp
             WHERE bt.profile_id = olp.profile_id
               AND olp.opponent_lineup_id = $1`,
            [opponentLineupId]
        );
    }
}

export default new ScoutingService();
