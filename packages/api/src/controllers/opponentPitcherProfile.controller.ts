import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import opponentPitcherProfileService from '../services/opponentPitcherProfile.service';

export class OpponentPitcherProfileController {
    async getByOpponentTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const opponentTeamId = req.params.opponentTeamId as string;
            const pitchers = await opponentPitcherProfileService.getByOpponentTeam(opponentTeamId);
            res.status(200).json({ pitchers });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const pitcher = await opponentPitcherProfileService.getById(id);
            if (!pitcher) {
                res.status(404).json({ error: 'Pitcher profile not found' });
                return;
            }
            const tendencies = await opponentPitcherProfileService.getTendencies(id);
            res.status(200).json({ pitcher, tendencies });
        } catch (error) {
            next(error);
        }
    }

    async recalculate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const tendencies = await opponentPitcherProfileService.recalculateTendencies(id);
            res.status(200).json({ tendencies });
        } catch (error) {
            next(error);
        }
    }

    async linkOpposingPitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const { opposing_pitcher_id } = req.body;
            if (!opposing_pitcher_id) {
                res.status(400).json({ error: 'opposing_pitcher_id is required' });
                return;
            }
            await opponentPitcherProfileService.linkOpposingPitcher(opposing_pitcher_id, id);
            res.status(200).json({ message: 'Linked' });
        } catch (error) {
            next(error);
        }
    }

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const opponentTeamId = req.params.opponentTeamId as string;
            const { pitcher_name, throws, jersey_number } = req.body;
            if (!pitcher_name || typeof pitcher_name !== 'string' || !pitcher_name.trim()) {
                res.status(400).json({ error: 'pitcher_name is required' });
                return;
            }
            if (throws !== 'L' && throws !== 'R') {
                res.status(400).json({ error: "throws must be 'L' or 'R'" });
                return;
            }
            const pitcher = await opponentPitcherProfileService.create(opponentTeamId, {
                pitcher_name,
                throws,
                jersey_number,
            });
            res.status(201).json({ pitcher });
        } catch (error: unknown) {
            const e = error as { status?: number; message?: string; existing?: unknown };
            if (e.status === 409) {
                res.status(409).json({ error: e.message, existing: e.existing });
                return;
            }
            if (e.status === 404) {
                res.status(404).json({ error: e.message });
                return;
            }
            next(error);
        }
    }

    async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const { pitcher_name, throws, jersey_number } = req.body;
            if (throws !== undefined && throws !== 'L' && throws !== 'R') {
                res.status(400).json({ error: "throws must be 'L' or 'R'" });
                return;
            }
            const pitcher = await opponentPitcherProfileService.update(id, { pitcher_name, throws, jersey_number });
            if (!pitcher) {
                res.status(404).json({ error: 'Pitcher profile not found' });
                return;
            }
            res.status(200).json({ pitcher });
        } catch (error: unknown) {
            const e = error as { status?: number; message?: string };
            if (e.status === 409) {
                res.status(409).json({ error: e.message });
                return;
            }
            next(error);
        }
    }

    async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            const deleted = await opponentPitcherProfileService.delete(id);
            if (!deleted) {
                res.status(404).json({ error: 'Pitcher profile not found' });
                return;
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new OpponentPitcherProfileController();
