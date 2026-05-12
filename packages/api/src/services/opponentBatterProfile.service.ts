import { query, transaction } from '../config/database';
import { BatterScoutingProfile, HandednessType } from '../types';
import { v4 as uuidv4 } from 'uuid';

function normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class OpponentBatterProfileService {
    async getByOpponentTeam(opponentTeamId: string): Promise<BatterScoutingProfile[]> {
        const result = await query('SELECT * FROM batter_scouting_profiles WHERE opponent_team_id = $1 ORDER BY player_name ASC', [
            opponentTeamId,
        ]);
        return result.rows;
    }

    async getById(id: string): Promise<BatterScoutingProfile | null> {
        const result = await query('SELECT * FROM batter_scouting_profiles WHERE id = $1', [id]);
        return result.rows[0] ?? null;
    }

    /** Standalone create — no scouting report required. */
    async create(
        opponentTeamId: string,
        params: { player_name: string; bats: HandednessType; jersey_number?: number | null }
    ): Promise<BatterScoutingProfile> {
        const opp = await query('SELECT team_id, name FROM opponent_teams WHERE id = $1', [opponentTeamId]);
        if (!opp.rows[0]) {
            throw Object.assign(new Error('Opponent team not found'), { status: 404 });
        }
        const teamId = opp.rows[0].team_id;
        const opponentTeamName = opp.rows[0].name;
        const normalized = normalize(params.player_name);
        const existing = await query(
            'SELECT * FROM batter_scouting_profiles WHERE opponent_team_id = $1 AND normalized_name = $2',
            [opponentTeamId, normalized]
        );
        if (existing.rows[0]) {
            throw Object.assign(new Error('A batter with this name already exists on this opponent team'), {
                status: 409,
                existing: existing.rows[0],
            });
        }
        const result = await query(
            `INSERT INTO batter_scouting_profiles
                (id, team_id, opponent_team_id, opponent_team_name, player_name, normalized_name, bats, jersey_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                uuidv4(),
                teamId,
                opponentTeamId,
                opponentTeamName,
                params.player_name.trim(),
                normalized,
                params.bats,
                params.jersey_number ?? null,
            ]
        );
        return result.rows[0];
    }

    async update(
        id: string,
        params: { player_name?: string; bats?: HandednessType; jersey_number?: number | null }
    ): Promise<BatterScoutingProfile | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        const nextName = params.player_name?.trim() ?? existing.player_name;
        const nextNormalized = normalize(nextName);
        if (nextNormalized !== existing.normalized_name && existing.opponent_team_id) {
            const dup = await query(
                'SELECT id FROM batter_scouting_profiles WHERE opponent_team_id = $1 AND normalized_name = $2 AND id <> $3',
                [existing.opponent_team_id, nextNormalized, id]
            );
            if (dup.rows[0]) {
                throw Object.assign(new Error('Another batter on this opponent team already has that name'), { status: 409 });
            }
        }
        const result = await query(
            `UPDATE batter_scouting_profiles
             SET player_name = $1,
                 normalized_name = $2,
                 bats = $3,
                 jersey_number = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [
                nextName,
                nextNormalized,
                params.bats ?? existing.bats,
                params.jersey_number === undefined ? (existing.jersey_number ?? null) : params.jersey_number,
                id,
            ]
        );
        return result.rows[0] ?? null;
    }

    /** Delete profile. batter_tendencies and opponent_lineup_profiles cascade via FK. */
    async delete(id: string): Promise<boolean> {
        return transaction(async (client) => {
            const result = await client.query('DELETE FROM batter_scouting_profiles WHERE id = $1', [id]);
            return (result.rowCount ?? 0) > 0;
        });
    }
}

export default new OpponentBatterProfileService();
