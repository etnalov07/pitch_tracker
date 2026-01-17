import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import playService from '../services/play.service';

export class PlayController {
  async recordPlay(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const play = await playService.recordPlay(req.body);
      res.status(201).json({ message: 'Play recorded successfully', play });
    } catch (error) {
      next(error);
    }
  }

  async getPlayById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const play = await playService.getPlayById(id as string);

      if (!play) {
        res.status(404).json({ error: 'Play not found' });
        return;
      }

      res.status(200).json({ play });
    } catch (error) {
      next(error);
    }
  }

  async getPlaysByAtBat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { atBatId } = req.params;
      const plays = await playService.getPlaysByAtBat(atBatId as string);
      res.status(200).json({ plays });
    } catch (error) {
      next(error);
    }
  }

  async getPlaysByGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gameId } = req.params;
      const plays = await playService.getPlaysByGame(gameId as string);
      res.status(200).json({ plays });
    } catch (error) {
      next(error);
    }
  }

  async getPlaysByBatter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batterId } = req.params;
      const plays = await playService.getPlaysByBatter(batterId as string);
      res.status(200).json({ plays });
    } catch (error) {
      next(error);
    }
  }

  async updatePlay(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const play = await playService.updatePlay(id as string, req.body);
      res.status(200).json({ message: 'Play updated successfully', play });
    } catch (error) {
      next(error);
    }
  }
}

export default new PlayController();