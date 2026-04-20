import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import scoutingReportService from '../services/scoutingReport.service';

export class ScoutingReportController {
    async listByTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const reports = await scoutingReportService.listByTeam(teamId);
            res.status(200).json({ reports });
        } catch (err) {
            next(err);
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const report = await scoutingReportService.getById(id);
            if (!report) {
                res.status(404).json({ error: 'Scouting report not found' });
                return;
            }
            res.status(200).json({ report });
        } catch (err) {
            next(err);
        }
    }

    async getByGameId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const gameId = req.params.gameId as string;
            const report = await scoutingReportService.getByGameId(gameId);
            res.status(200).json({ report });
        } catch (err) {
            next(err);
        }
    }

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const report = await scoutingReportService.create(teamId, req.body, req.user?.id);
            res.status(201).json({ report });
        } catch (err: unknown) {
            if (err instanceof Error && /required/.test(err.message)) {
                res.status(400).json({ error: err.message });
                return;
            }
            next(err);
        }
    }

    async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const report = await scoutingReportService.update(id, req.body);
            if (!report) {
                res.status(404).json({ error: 'Scouting report not found' });
                return;
            }
            res.status(200).json({ report });
        } catch (err) {
            next(err);
        }
    }

    async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            await scoutingReportService.delete(id);
            res.status(200).json({ message: 'Scouting report deleted' });
        } catch (err) {
            next(err);
        }
    }

    async addBatter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const batter = await scoutingReportService.addBatter(id, req.body);
            res.status(201).json({ batter });
        } catch (err: unknown) {
            if (err instanceof Error && /required/.test(err.message)) {
                res.status(400).json({ error: err.message });
                return;
            }
            next(err);
        }
    }

    async updateBatter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const batterId = req.params.batterId as string;
            const batter = await scoutingReportService.updateBatter(batterId, req.body);
            if (!batter) {
                res.status(404).json({ error: 'Scouting batter not found' });
                return;
            }
            res.status(200).json({ batter });
        } catch (err) {
            next(err);
        }
    }

    async deleteBatter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const batterId = req.params.batterId as string;
            await scoutingReportService.deleteBatter(batterId);
            res.status(200).json({ message: 'Scouting batter deleted' });
        } catch (err) {
            next(err);
        }
    }

    async importLineup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const sourceGameId = req.params.sourceGameId as string;
            const batters = await scoutingReportService.importFromGameLineup(id, sourceGameId);
            res.status(200).json({ batters });
        } catch (err) {
            next(err);
        }
    }

    async liveMatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const gameId = req.params.gameId as string;
            const name = typeof req.query.name === 'string' ? req.query.name : undefined;
            const jerseyRaw = typeof req.query.jersey === 'string' ? req.query.jersey : undefined;
            const jersey = jerseyRaw !== undefined && jerseyRaw !== '' ? Number(jerseyRaw) : null;
            const match = await scoutingReportService.getLiveMatch(gameId, {
                name,
                jersey: Number.isNaN(jersey as number) ? null : jersey,
            });
            res.status(200).json({ match });
        } catch (err) {
            next(err);
        }
    }
}

export default new ScoutingReportController();
