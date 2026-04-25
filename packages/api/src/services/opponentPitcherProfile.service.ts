import { query, transaction } from '../config/database';
import { OpponentPitcherProfile, OpponentPitcherTendencies, ThrowingHand } from '../types';
import { v4 as uuidv4 } from 'uuid';

function normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class OpponentPitcherProfileService {
    async getByOpponentTeam(opponentTeamId: string): Promise<OpponentPitcherProfile[]> {
        const result = await query(
            'SELECT * FROM opponent_pitcher_profiles WHERE opponent_team_id = $1 ORDER BY pitcher_name ASC',
            [opponentTeamId]
        );
        return result.rows;
    }

    async getById(id: string): Promise<OpponentPitcherProfile | null> {
        const result = await query('SELECT * FROM opponent_pitcher_profiles WHERE id = $1', [id]);
        return result.rows[0] ?? null;
    }

    async findOrCreate(
        opponentTeamId: string,
        teamId: string,
        pitcherName: string,
        throws: ThrowingHand = 'R',
        jerseyNumber?: number | null
    ): Promise<OpponentPitcherProfile> {
        const normalized = normalize(pitcherName);
        const existing = await query(
            'SELECT * FROM opponent_pitcher_profiles WHERE opponent_team_id = $1 AND normalized_name = $2',
            [opponentTeamId, normalized]
        );
        if (existing.rows[0]) return existing.rows[0];

        const result = await transaction(async (client) => {
            return client.query(
                `INSERT INTO opponent_pitcher_profiles
                    (id, opponent_team_id, team_id, pitcher_name, normalized_name, throws, jersey_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (opponent_team_id, normalized_name) DO UPDATE
                   SET throws = EXCLUDED.throws,
                       jersey_number = COALESCE(EXCLUDED.jersey_number, opponent_pitcher_profiles.jersey_number),
                       updated_at = NOW()
                 RETURNING *`,
                [uuidv4(), opponentTeamId, teamId, pitcherName, normalized, throws, jerseyNumber ?? null]
            );
        });
        return result.rows[0];
    }

    async linkOpposingPitcher(opposingPitcherId: string, profileId: string): Promise<void> {
        await query('UPDATE opposing_pitchers SET profile_id = $1 WHERE id = $2', [profileId, opposingPitcherId]);
    }

    async incrementGameCount(id: string, gameDate?: string): Promise<void> {
        await query(
            `UPDATE opponent_pitcher_profiles
             SET games_pitched = games_pitched + 1,
                 last_seen_date = GREATEST(COALESCE(last_seen_date, $2::date), $2::date),
                 updated_at = NOW()
             WHERE id = $1`,
            [id, gameDate ?? new Date().toISOString().slice(0, 10)]
        );
    }

    async getTendencies(profileId: string): Promise<OpponentPitcherTendencies | null> {
        const result = await query('SELECT * FROM opponent_pitcher_tendencies WHERE profile_id = $1', [profileId]);
        return result.rows[0] ?? null;
    }

    async recalculateTendencies(profileId: string): Promise<OpponentPitcherTendencies> {
        // Gather all pitches thrown by this pitcher across all linked opposing_pitchers records
        const pitchRows = await query(
            `SELECT p.pitch_type, p.pitch_result, p.balls_before, p.strikes_before
             FROM pitches p
             JOIN at_bats ab ON p.at_bat_id = ab.id
             JOIN opposing_pitchers op ON ab.opposing_pitcher_id = op.id
             WHERE op.profile_id = $1`,
            [profileId]
        );

        const atBatRows = await query(
            `SELECT ab.id
             FROM at_bats ab
             JOIN opposing_pitchers op ON ab.opposing_pitcher_id = op.id
             WHERE op.profile_id = $1`,
            [profileId]
        );

        const pitches = pitchRows.rows;
        const total = pitches.length;
        const totalAbs = atBatRows.rows.length;

        if (total === 0) {
            return this._upsertTendencies(profileId, {
                total_pitches: 0,
                total_at_bats: totalAbs,
                strike_percentage: null,
                first_pitch_strike_pct: null,
                fastball_pct: null,
                offspeed_pct: null,
                breaking_pct: null,
                early_count_fastball_pct: null,
                two_strike_offspeed_pct: null,
                pitch_mix: {},
                zone_tendencies: {},
            });
        }

        const isStrike = (r: string) => r === 'called_strike' || r === 'swinging_strike' || r === 'foul' || r === 'in_play';
        const isFastball = (t: string) => ['fastball', '4-seam', '2-seam', 'sinker', 'cutter'].includes(t);
        const isOffspeed = (t: string) => ['changeup', 'splitter', 'screwball'].includes(t);
        const isBreaking = (t: string) => ['slider', 'curveball', 'knuckleball'].includes(t);

        let strikes = 0;
        let firstPitchStrikes = 0;
        let fastballs = 0;
        let offspeed = 0;
        let breaking = 0;
        let earlyFastballs = 0;
        let earlyTotal = 0;
        let twoStrikeOffspeed = 0;
        let twoStrikeTotal = 0;

        const pitchMixMap: Record<string, { count: number; strikes: number }> = {};

        for (const p of pitches) {
            if (isStrike(p.pitch_result)) strikes++;
            if (p.balls_before === 0 && p.strikes_before === 0) {
                if (isStrike(p.pitch_result)) firstPitchStrikes++;
            }
            if (isFastball(p.pitch_type)) fastballs++;
            else if (isOffspeed(p.pitch_type)) offspeed++;
            else if (isBreaking(p.pitch_type)) breaking++;

            // Early count = 0 strikes (0-0, 1-0, 2-0, 3-0)
            if (p.strikes_before === 0) {
                earlyTotal++;
                if (isFastball(p.pitch_type)) earlyFastballs++;
            }

            // Two strikes
            if (p.strikes_before === 2) {
                twoStrikeTotal++;
                if (isOffspeed(p.pitch_type)) twoStrikeOffspeed++;
            }

            if (!pitchMixMap[p.pitch_type]) pitchMixMap[p.pitch_type] = { count: 0, strikes: 0 };
            pitchMixMap[p.pitch_type].count++;
            if (isStrike(p.pitch_result)) pitchMixMap[p.pitch_type].strikes++;
        }

        const pitchMix: Record<string, { count: number; pct: number; strike_pct: number }> = {};
        for (const [type, data] of Object.entries(pitchMixMap)) {
            pitchMix[type] = {
                count: data.count,
                pct: Math.round((data.count / total) * 100),
                strike_pct: data.count > 0 ? Math.round((data.strikes / data.count) * 100) : 0,
            };
        }

        const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

        return this._upsertTendencies(profileId, {
            total_pitches: total,
            total_at_bats: totalAbs,
            strike_percentage: round((strikes / total) * 100, 1),
            first_pitch_strike_pct: totalAbs > 0 ? round((firstPitchStrikes / totalAbs) * 100, 1) : null,
            fastball_pct: round((fastballs / total) * 100, 1),
            offspeed_pct: round((offspeed / total) * 100, 1),
            breaking_pct: round((breaking / total) * 100, 1),
            early_count_fastball_pct: earlyTotal > 0 ? round((earlyFastballs / earlyTotal) * 100, 1) : null,
            two_strike_offspeed_pct: twoStrikeTotal > 0 ? round((twoStrikeOffspeed / twoStrikeTotal) * 100, 1) : null,
            pitch_mix: pitchMix,
            zone_tendencies: {},
        });
    }

    private async _upsertTendencies(
        profileId: string,
        data: Omit<OpponentPitcherTendencies, 'id' | 'profile_id' | 'last_calculated_at' | 'is_stale' | 'created_at' | 'updated_at'>
    ): Promise<OpponentPitcherTendencies> {
        const result = await transaction(async (client) => {
            return client.query(
                `INSERT INTO opponent_pitcher_tendencies
                    (id, profile_id, total_pitches, total_at_bats, strike_percentage,
                     first_pitch_strike_pct, fastball_pct, offspeed_pct, breaking_pct,
                     early_count_fastball_pct, two_strike_offspeed_pct, pitch_mix, zone_tendencies,
                     last_calculated_at, is_stale)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),false)
                 ON CONFLICT (profile_id) DO UPDATE SET
                     total_pitches = EXCLUDED.total_pitches,
                     total_at_bats = EXCLUDED.total_at_bats,
                     strike_percentage = EXCLUDED.strike_percentage,
                     first_pitch_strike_pct = EXCLUDED.first_pitch_strike_pct,
                     fastball_pct = EXCLUDED.fastball_pct,
                     offspeed_pct = EXCLUDED.offspeed_pct,
                     breaking_pct = EXCLUDED.breaking_pct,
                     early_count_fastball_pct = EXCLUDED.early_count_fastball_pct,
                     two_strike_offspeed_pct = EXCLUDED.two_strike_offspeed_pct,
                     pitch_mix = EXCLUDED.pitch_mix,
                     zone_tendencies = EXCLUDED.zone_tendencies,
                     last_calculated_at = NOW(),
                     is_stale = false,
                     updated_at = NOW()
                 RETURNING *`,
                [
                    uuidv4(),
                    profileId,
                    data.total_pitches,
                    data.total_at_bats,
                    data.strike_percentage,
                    data.first_pitch_strike_pct,
                    data.fastball_pct,
                    data.offspeed_pct,
                    data.breaking_pct,
                    data.early_count_fastball_pct,
                    data.two_strike_offspeed_pct,
                    JSON.stringify(data.pitch_mix),
                    JSON.stringify(data.zone_tendencies),
                ]
            );
        });
        return result.rows[0];
    }
}

export default new OpponentPitcherProfileService();
