import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import opposingPitcherService from '../services/opposingPitcher.service';

export class OpposingPitcherController {
    async getByGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const gameId = req.params.gameId as string;
            const pitchers = await opposingPitcherService.getByGame(gameId);
            res.status(200).json({ pitchers });
        } catch (error) {
            next(error);
        }
    }

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { game_id, team_name, pitcher_name, jersey_number, throws } = req.body;
            if (!game_id || !team_name || !pitcher_name || !throws) {
                res.status(400).json({ error: 'game_id, team_name, pitcher_name, and throws are required' });
                return;
            }
            const pitcher = await opposingPitcherService.create({ game_id, team_name, pitcher_name, jersey_number, throws });
            res.status(201).json({ pitcher });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;
            await opposingPitcherService.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new OpposingPitcherController();
