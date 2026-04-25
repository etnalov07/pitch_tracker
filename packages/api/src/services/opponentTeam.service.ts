import { query, transaction } from '../config/database';
import { CreateOpponentTeamParams, OpponentTeam, OpponentTeamWithRoster } from '../types';
import { v4 as uuidv4 } from 'uuid';

function normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class OpponentTeamService {
    async list(teamId: string): Promise<OpponentTeam[]> {
        const result = await query('SELECT * FROM opponent_teams WHERE team_id = $1 ORDER BY name ASC', [teamId]);
        return result.rows;
    }

    async getById(id: string, teamId: string): Promise<OpponentTeam | null> {
        const result = await query('SELECT * FROM opponent_teams WHERE id = $1 AND team_id = $2', [id, teamId]);
        return result.rows[0] ?? null;
    }

    async getWithRoster(id: string, teamId: string): Promise<OpponentTeamWithRoster | null> {
        const team = await this.getById(id, teamId);
        if (!team) return null;

        const [pitchersResult, battersResult] = await Promise.all([
            query('SELECT * FROM opponent_pitcher_profiles WHERE opponent_team_id = $1 ORDER BY pitcher_name ASC', [id]),
            query('SELECT * FROM batter_scouting_profiles WHERE opponent_team_id = $1 ORDER BY player_name ASC', [id]),
        ]);

        return { ...team, pitchers: pitchersResult.rows, batters: battersResult.rows };
    }

    async findOrCreate(teamId: string, name: string, extraParams?: Partial<CreateOpponentTeamParams>): Promise<OpponentTeam> {
        const normalized = normalize(name);
        const existing = await query('SELECT * FROM opponent_teams WHERE team_id = $1 AND normalized_name = $2', [
            teamId,
            normalized,
        ]);
        if (existing.rows[0]) return existing.rows[0];

        return this.create(teamId, { name, ...extraParams });
    }

    async create(teamId: string, params: CreateOpponentTeamParams): Promise<OpponentTeam> {
        const { name, city, state, level, notes } = params;
        const normalized = normalize(name);
        const result = await transaction(async (client) => {
            return client.query(
                `INSERT INTO opponent_teams (id, team_id, name, normalized_name, city, state, level, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (team_id, normalized_name) DO UPDATE
                   SET name = EXCLUDED.name,
                       city = COALESCE(EXCLUDED.city, opponent_teams.city),
                       state = COALESCE(EXCLUDED.state, opponent_teams.state),
                       level = COALESCE(EXCLUDED.level, opponent_teams.level),
                       updated_at = NOW()
                 RETURNING *`,
                [uuidv4(), teamId, name, normalized, city ?? null, state ?? null, level ?? null, notes ?? null]
            );
        });
        return result.rows[0];
    }

    async update(id: string, teamId: string, params: Partial<CreateOpponentTeamParams>): Promise<OpponentTeam | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (params.name !== undefined) {
            fields.push(`name = $${idx++}`, `normalized_name = $${idx++}`);
            values.push(params.name, normalize(params.name));
        }
        if (params.city !== undefined) {
            fields.push(`city = $${idx++}`);
            values.push(params.city);
        }
        if (params.state !== undefined) {
            fields.push(`state = $${idx++}`);
            values.push(params.state);
        }
        if (params.level !== undefined) {
            fields.push(`level = $${idx++}`);
            values.push(params.level);
        }
        if (params.notes !== undefined) {
            fields.push(`notes = $${idx++}`);
            values.push(params.notes);
        }

        if (fields.length === 0) return this.getById(id, teamId);

        fields.push(`updated_at = NOW()`);
        values.push(id, teamId);

        const result = await transaction(async (client) => {
            return client.query(
                `UPDATE opponent_teams SET ${fields.join(', ')} WHERE id = $${idx++} AND team_id = $${idx++} RETURNING *`,
                values
            );
        });
        return result.rows[0] ?? null;
    }

    async incrementGameCount(id: string, gameDate?: string): Promise<void> {
        await query(
            `UPDATE opponent_teams
             SET games_played = games_played + 1,
                 last_game_date = GREATEST(COALESCE(last_game_date, $2::date), $2::date),
                 updated_at = NOW()
             WHERE id = $1`,
            [id, gameDate ?? new Date().toISOString().slice(0, 10)]
        );
    }

    async linkGame(gameId: string, opponentTeamId: string): Promise<void> {
        await query('UPDATE games SET opponent_team_id = $1 WHERE id = $2', [opponentTeamId, gameId]);
    }

    async delete(id: string, teamId: string): Promise<void> {
        await query('DELETE FROM opponent_teams WHERE id = $1 AND team_id = $2', [id, teamId]);
    }
}

export default new OpponentTeamService();
