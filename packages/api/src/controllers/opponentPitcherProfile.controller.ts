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
}

export default new OpponentPitcherProfileController();
