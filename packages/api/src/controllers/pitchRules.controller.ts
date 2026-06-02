import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { evaluatePitcherEligibility, evaluatePitchersEligibility } from '../services/pitchRules';

export class PitchRulesController {
    async getOne(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId, pitcherId } = req.params;
            if (!gameId || !pitcherId) {
                res.status(400).json({ error: 'gameId and pitcherId are required' });
                return;
            }
            const result = await evaluatePitcherEligibility(pitcherId as string, gameId as string);
            if (!result) {
                res.status(404).json({ error: 'Game not found' });
                return;
            }
            res.status(200).json({ eligibility: result });
        } catch (error) {
            next(error);
        }
    }

    async getBulk(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const pitcherIdsRaw = req.query.pitcher_ids;
            if (!gameId) {
                res.status(400).json({ error: 'gameId is required' });
                return;
            }
            if (typeof pitcherIdsRaw !== 'string' || pitcherIdsRaw.length === 0) {
                res.status(400).json({ error: 'pitcher_ids query param required (comma-separated)' });
                return;
            }
            const pitcherIds = pitcherIdsRaw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const result = await evaluatePitchersEligibility(pitcherIds, gameId as string);
            res.status(200).json({ eligibility: result });
        } catch (error) {
            next(error);
        }
    }
}

export default new PitchRulesController();
