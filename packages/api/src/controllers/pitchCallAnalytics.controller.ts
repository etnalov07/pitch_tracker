import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import pitchCallAnalyticsService from '../services/pitchCallAnalytics.service';

export class PitchCallAnalyticsController {
    async getPitcherAccuracy(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { gameId } = req.query;
            const accuracy = await pitchCallAnalyticsService.getPitcherAccuracy(pitcherId as string, gameId as string | undefined);

            if (!accuracy) {
                res.status(404).json({ error: 'No linked pitch calls found for this pitcher' });
                return;
            }

            res.status(200).json({ accuracy });
        } catch (error) {
            next(error);
        }
    }

    async getGameAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const analytics = await pitchCallAnalyticsService.getGameAnalytics(gameId as string);

            if (!analytics) {
                res.status(404).json({ error: 'No pitch calls found for this game' });
                return;
            }

            res.status(200).json({ analytics });
        } catch (error) {
            next(error);
        }
    }

    async getSeasonAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { teamId } = req.params;
            const analytics = await pitchCallAnalyticsService.getSeasonAnalytics(teamId as string);

            if (!analytics) {
                res.status(404).json({ error: 'No pitch calls found for this team' });
                return;
            }

            res.status(200).json({ analytics });
        } catch (error) {
            next(error);
        }
    }
}

export default new PitchCallAnalyticsController();
