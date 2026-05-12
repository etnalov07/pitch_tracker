import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import opponentBatterProfileService from '../services/opponentBatterProfile.service';

export class OpponentBatterProfileController {
    async getByOpponentTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const opponentTeamId = req.params.opponentTeamId as string;
            const batters = await opponentBatterProfileService.getByOpponentTeam(opponentTeamId);
            res.status(200).json({ batters });
        } catch (error) {
            next(error);
        }
    }

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const opponentTeamId = req.params.opponentTeamId as string;
            const { player_name, bats, jersey_number } = req.body;
            if (!player_name || typeof player_name !== 'string' || !player_name.trim()) {
                res.status(400).json({ error: 'player_name is required' });
                return;
            }
            if (bats !== 'L' && bats !== 'R' && bats !== 'S') {
                res.status(400).json({ error: "bats must be 'L', 'R', or 'S'" });
                return;
            }
            const batter = await opponentBatterProfileService.create(opponentTeamId, { player_name, bats, jersey_number });
            res.status(201).json({ batter });
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
            const { player_name, bats, jersey_number } = req.body;
            if (bats !== undefined && bats !== 'L' && bats !== 'R' && bats !== 'S') {
                res.status(400).json({ error: "bats must be 'L', 'R', or 'S'" });
                return;
            }
            const batter = await opponentBatterProfileService.update(id, { player_name, bats, jersey_number });
            if (!batter) {
                res.status(404).json({ error: 'Batter profile not found' });
                return;
            }
            res.status(200).json({ batter });
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
            const deleted = await opponentBatterProfileService.delete(id);
            if (!deleted) {
                res.status(404).json({ error: 'Batter profile not found' });
                return;
            }
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new OpponentBatterProfileController();
