import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import analyticsService from '../services/analytics.service';

export class AnalyticsController {
  async getBatterHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batterId } = req.params;
      const { pitcherId, gameId } = req.query;
      
      const history = await analyticsService.getBatterHistory(
        batterId as string,
        pitcherId as string,
        gameId as string
      );
      
      res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  }

  async getBatterPitchHeatMap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batterId } = req.params;
      const { pitcherId } = req.query;
      
      const heatMap = await analyticsService.getBatterPitchHeatMap(
        batterId as string,
        pitcherId as string
      );
      
      res.status(200).json({ heatMap });
    } catch (error) {
      next(error);
    }
  }

  async getBatterSprayChart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batterId } = req.params;
      const { gameId } = req.query;
      
      const sprayChart = await analyticsService.getBatterSprayChart(
        batterId as string,
        gameId as string
      );
      
      res.status(200).json({ sprayChart });
    } catch (error) {
      next(error);
    }
  }

  async getPitcherTendencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pitcherId } = req.params;
      const { gameId } = req.query;
      
      const tendencies = await analyticsService.getPitcherTendencies(
        pitcherId as string,
        gameId as string
      );
      
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
}

export default new AnalyticsController();