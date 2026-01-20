import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import gamePitcherService from '../services/gamePitcher.service';

export class GamePitcherController {
    async addPitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const { player_id, pitching_order, inning_entered } = req.body;

            if (!player_id) {
                res.status(400).json({ error: 'player_id is required' });
                return;
            }

            const pitcher = await gamePitcherService.addPitcher(
                gameId as string,
                player_id,
                pitching_order || 1,
                inning_entered || 1
            );
            res.status(201).json({ pitcher, message: 'Pitcher added to game' });
        } catch (error) {
            next(error);
        }
    }

    async getPitchers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const pitchers = await gamePitcherService.getPitchersByGameId(gameId as string);
            res.json({ pitchers });
        } catch (error) {
            next(error);
        }
    }

    async getCurrentPitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const pitcher = await gamePitcherService.getCurrentPitcher(gameId as string);

            if (!pitcher) {
                res.status(404).json({ error: 'No active pitcher found' });
                return;
            }

            res.json({ pitcher });
        } catch (error) {
            next(error);
        }
    }

    async changePitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const { player_id, inning_entered } = req.body;

            if (!player_id || !inning_entered) {
                res.status(400).json({ error: 'player_id and inning_entered are required' });
                return;
            }

            const pitcher = await gamePitcherService.changePitcher(gameId as string, player_id, inning_entered);
            res.status(201).json({ pitcher, message: 'Pitcher changed' });
        } catch (error) {
            next(error);
        }
    }

    async updatePitcherExit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { inning_exited } = req.body;

            if (!inning_exited) {
                res.status(400).json({ error: 'inning_exited is required' });
                return;
            }

            const pitcher = await gamePitcherService.updatePitcherExit(pitcherId as string, inning_exited);
            res.json({ pitcher, message: 'Pitcher exit inning updated' });
        } catch (error) {
            next(error);
        }
    }

    async deletePitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            await gamePitcherService.deletePitcher(pitcherId as string);
            res.json({ message: 'Pitcher removed from game' });
        } catch (error) {
            next(error);
        }
    }

    async clearPitchers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            await gamePitcherService.clearPitchers(gameId as string);
            res.json({ message: 'All pitchers cleared from game' });
        } catch (error) {
            next(error);
        }
    }
}

export default new GamePitcherController();
