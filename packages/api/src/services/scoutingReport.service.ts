import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import {
    ScoutingReport,
    ScoutingReportBatter,
    ScoutingReportBatterInput,
    ScoutingReportInput,
    ScoutingReportWithBatters,
} from '../types';

export class ScoutingReportService {
    private normalizeName(name: string): string {
        return name.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    private reportSelect(): string {
        return `
            SELECT sr.*, u.first_name || ' ' || u.last_name AS created_by_name
            FROM scouting_reports sr
            LEFT JOIN users u ON u.id = sr.created_by
        `;
    }

    async listByTeam(teamId: string): Promise<ScoutingReport[]> {
        const result = await query(
            `${this.reportSelect()} WHERE sr.team_id = $1 ORDER BY COALESCE(sr.game_date, sr.created_at::date) DESC, sr.created_at DESC`,
            [teamId]
        );
        return result.rows;
    }

    async getById(reportId: string): Promise<ScoutingReportWithBatters | null> {
        const reportRes = await query(`${this.reportSelect()} WHERE sr.id = $1`, [reportId]);
        if (reportRes.rows.length === 0) return null;
        const report = reportRes.rows[0] as ScoutingReport;

        const battersRes = await query(
            `SELECT * FROM scouting_report_batters
             WHERE report_id = $1
             ORDER BY COALESCE(batting_order, 999), LOWER(player_name)`,
            [reportId]
        );

        return { ...report, batters: battersRes.rows as ScoutingReportBatter[] };
    }

    async getByGameId(gameId: string): Promise<ScoutingReportWithBatters | null> {
        const reportRes = await query(`${this.reportSelect()} WHERE sr.game_id = $1 LIMIT 1`, [gameId]);
        if (reportRes.rows.length === 0) return null;
        return this.getById(reportRes.rows[0].id);
    }

    async create(teamId: string, payload: ScoutingReportInput, createdBy?: string): Promise<ScoutingReport> {
        if (!payload.opponent_name || !payload.opponent_name.trim()) {
            throw new Error('opponent_name is required');
        }
        const id = uuidv4();
        await query(
            `INSERT INTO scouting_reports
             (id, team_id, opponent_name, game_id, game_date, notes,
              steal_frequency, bunt_frequency, hit_and_run_frequency, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                id,
                teamId,
                payload.opponent_name.trim(),
                payload.game_id ?? null,
                payload.game_date ?? null,
                payload.notes ?? null,
                payload.steal_frequency ?? null,
                payload.bunt_frequency ?? null,
                payload.hit_and_run_frequency ?? null,
                createdBy ?? null,
            ]
        );
        const res = await query(`${this.reportSelect()} WHERE sr.id = $1`, [id]);
        return res.rows[0];
    }

    async update(reportId: string, payload: Partial<ScoutingReportInput>): Promise<ScoutingReport | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        const maybeSet = (col: string, val: unknown) => {
            if (val !== undefined) {
                fields.push(`${col} = $${idx++}`);
                values.push(val);
            }
        };
        maybeSet('opponent_name', payload.opponent_name?.trim());
        maybeSet('game_id', payload.game_id ?? null);
        maybeSet('game_date', payload.game_date ?? null);
        maybeSet('notes', payload.notes ?? null);
        maybeSet('steal_frequency', payload.steal_frequency ?? null);
        maybeSet('bunt_frequency', payload.bunt_frequency ?? null);
        maybeSet('hit_and_run_frequency', payload.hit_and_run_frequency ?? null);

        if (fields.length === 0) {
            const existing = await query(`${this.reportSelect()} WHERE sr.id = $1`, [reportId]);
            return existing.rows[0] ?? null;
        }

        values.push(reportId);
        await query(`UPDATE scouting_reports SET ${fields.join(', ')} WHERE id = $${idx}`, values);
        const res = await query(`${this.reportSelect()} WHERE sr.id = $1`, [reportId]);
        return res.rows[0] ?? null;
    }

    async delete(reportId: string): Promise<void> {
        await query(`DELETE FROM scouting_reports WHERE id = $1`, [reportId]);
    }

    async addBatter(reportId: string, payload: ScoutingReportBatterInput): Promise<ScoutingReportBatter> {
        if (!payload.player_name || !payload.player_name.trim()) {
            throw new Error('player_name is required');
        }
        const id = uuidv4();
        const result = await query(
            `INSERT INTO scouting_report_batters
             (id, report_id, player_name, jersey_number, batting_order, bats, notes, zone_weakness, pitch_vulnerabilities)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [
                id,
                reportId,
                payload.player_name.trim(),
                payload.jersey_number ?? null,
                payload.batting_order ?? null,
                payload.bats ?? 'R',
                payload.notes ?? null,
                payload.zone_weakness ? JSON.stringify(payload.zone_weakness) : null,
                payload.pitch_vulnerabilities ? JSON.stringify(payload.pitch_vulnerabilities) : null,
            ]
        );
        return result.rows[0];
    }

    async updateBatter(batterId: string, payload: Partial<ScoutingReportBatterInput>): Promise<ScoutingReportBatter | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        const maybeSet = (col: string, val: unknown) => {
            if (val !== undefined) {
                fields.push(`${col} = $${idx++}`);
                values.push(val);
            }
        };
        maybeSet('player_name', payload.player_name?.trim());
        maybeSet('jersey_number', payload.jersey_number ?? null);
        maybeSet('batting_order', payload.batting_order ?? null);
        if (payload.bats !== undefined) maybeSet('bats', payload.bats);
        maybeSet('notes', payload.notes ?? null);
        if (payload.zone_weakness !== undefined) {
            fields.push(`zone_weakness = $${idx++}`);
            values.push(payload.zone_weakness === null ? null : JSON.stringify(payload.zone_weakness));
        }
        if (payload.pitch_vulnerabilities !== undefined) {
            fields.push(`pitch_vulnerabilities = $${idx++}`);
            values.push(payload.pitch_vulnerabilities === null ? null : JSON.stringify(payload.pitch_vulnerabilities));
        }

        if (fields.length === 0) {
            const existing = await query(`SELECT * FROM scouting_report_batters WHERE id = $1`, [batterId]);
            return existing.rows[0] ?? null;
        }

        values.push(batterId);
        const result = await query(
            `UPDATE scouting_report_batters SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] ?? null;
    }

    async deleteBatter(batterId: string): Promise<void> {
        await query(`DELETE FROM scouting_report_batters WHERE id = $1`, [batterId]);
    }

    // Copy opponent_lineup rows from a prior game into this report.
    async importFromGameLineup(reportId: string, sourceGameId: string): Promise<ScoutingReportBatter[]> {
        return transaction(async (client) => {
            const lineup = await client.query(
                `SELECT player_name, batting_order, bats FROM opponent_lineup
                 WHERE game_id = $1 AND is_starter = true
                 ORDER BY batting_order`,
                [sourceGameId]
            );

            const inserted: ScoutingReportBatter[] = [];
            for (const row of lineup.rows) {
                const id = uuidv4();
                const res = await client.query(
                    `INSERT INTO scouting_report_batters
                     (id, report_id, player_name, batting_order, bats)
                     VALUES ($1,$2,$3,$4,$5)
                     RETURNING *`,
                    [id, reportId, row.player_name, row.batting_order, row.bats || 'R']
                );
                inserted.push(res.rows[0]);
            }
            return inserted;
        });
    }

    // Live-game matching: try jersey number first, then normalized name.
    async getLiveMatch(
        gameId: string,
        options: { name?: string; jersey?: number | null }
    ): Promise<{ report: ScoutingReport; batter: ScoutingReportBatter } | null> {
        const report = await query(`${this.reportSelect()} WHERE sr.game_id = $1 LIMIT 1`, [gameId]);
        if (report.rows.length === 0) return null;
        const reportRow = report.rows[0] as ScoutingReport;

        let batterRow: ScoutingReportBatter | null = null;

        if (options.jersey !== null && options.jersey !== undefined) {
            const byJersey = await query(
                `SELECT * FROM scouting_report_batters WHERE report_id = $1 AND jersey_number = $2 LIMIT 1`,
                [reportRow.id, options.jersey]
            );
            batterRow = byJersey.rows[0] ?? null;
        }

        if (!batterRow && options.name) {
            const normalized = this.normalizeName(options.name);
            const byName = await query(
                `SELECT * FROM scouting_report_batters
                 WHERE report_id = $1 AND LOWER(TRIM(player_name)) = $2
                 LIMIT 1`,
                [reportRow.id, normalized]
            );
            batterRow = byName.rows[0] ?? null;
        }

        if (!batterRow) return null;
        return { report: reportRow, batter: batterRow };
    }
}

export default new ScoutingReportService();
