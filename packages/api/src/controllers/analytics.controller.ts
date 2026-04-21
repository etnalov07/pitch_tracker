import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import analyticsService from '../services/analytics.service';

export class AnalyticsController {
    async getBatterHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { batterId } = req.params;
            const { pitcherId, gameId } = req.query;

            const history = await analyticsService.getBatterHistory(batterId as string, pitcherId as string, gameId as string);

            res.status(200).json(history);
        } catch (error) {
            next(error);
        }
    }

    async getBatterPitchHeatMap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { batterId } = req.params;
            const { pitcherId } = req.query;

            const heatMap = await analyticsService.getBatterPitchHeatMap(batterId as string, pitcherId as string);

            res.status(200).json({ heatMap });
        } catch (error) {
            next(error);
        }
    }

    async getBatterSprayChart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { batterId } = req.params;
            const { gameId } = req.query;

            const sprayChart = await analyticsService.getBatterSprayChart(batterId as string, gameId as string);

            res.status(200).json({ sprayChart });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherTendencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { gameId } = req.query;

            const tendencies = await analyticsService.getPitcherTendencies(pitcherId as string, gameId as string);

            res.status(200).json({ tendencies });
        } catch (error) {
            next(error);
        }
    }

    async getGameState(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const gameState = await analyticsService.getGameState(gameId as string);
            res.status(200).json(gameState);
        } catch (error) {
            next(error);
        }
    }

    async getMatchupStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { batterId, pitcherId } = req.params;
            const stats = await analyticsService.getMatchupStats(batterId as string, pitcherId as string);
            res.status(200).json({ stats });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherGameLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { limit = '10', offset = '0' } = req.query;

            const gameLogs = await analyticsService.getPitcherGameLogs(
                pitcherId as string,
                parseInt(limit as string),
                parseInt(offset as string)
            );

            res.status(200).json(gameLogs);
        } catch (error) {
            next(error);
        }
    }

    async getPitcherProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const profile = await analyticsService.getPitcherProfile(pitcherId as string);
            res.status(200).json({ profile });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherHeatZones(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { gameId, pitchType } = req.query;
            const heatZones = await analyticsService.getPitcherHeatZones(
                pitcherId as string,
                gameId as string | undefined,
                pitchType as string | undefined
            );
            res.status(200).json({ heatZones });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherLiveTendencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pitcherId } = req.params;
            const { batter_hand } = req.query;
            if (batter_hand !== 'L' && batter_hand !== 'R') {
                res.status(400).json({ error: 'batter_hand must be L or R' });
                return;
            }
            const tendencies = await analyticsService.getPitcherLiveTendencies(pitcherId as string, batter_hand as 'L' | 'R');
            res.status(200).json({ tendencies });
        } catch (error) {
            next(error);
        }
    }

    async getHitterLiveTendencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { batterId } = req.params;
            const { batter_type } = req.query;
            const batterType = batter_type === 'team' ? 'team' : 'opponent';
            const tendencies = await analyticsService.getHitterLiveTendencies(batterId as string, batterType);
            res.status(200).json({ tendencies });
        } catch (error) {
            next(error);
        }
    }

    async getCountBreakdown(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const gameId = req.params.gameId as string;
            const pitcherId = req.query.pitcherId as string | undefined;
            const teamSide = req.query.team_side as string | undefined;
            const breakdown = await analyticsService.getCountBreakdown(gameId, pitcherId, teamSide);
            res.status(200).json({ breakdown });
        } catch (error) {
            next(error);
        }
    }

    async getPitchChart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const gameId = req.params.gameId as string;
            const pitcherId = req.query.pitcherId as string | undefined;
            const teamSide = req.query.team_side as string | undefined;
            const chart = await analyticsService.getPitchChart(gameId, pitcherId, teamSide);
            res.status(200).json({ chart });
        } catch (error) {
            next(error);
        }
    }
}

export default new AnalyticsController();
