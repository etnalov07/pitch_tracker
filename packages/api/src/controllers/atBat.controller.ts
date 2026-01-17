import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import atBatService from '../services/atBat.service';

export class AtBatController {
  async createAtBat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const atBat = await atBatService.createAtBat(req.body);
      res.status(201).json({ message: 'At-bat created successfully', atBat });
    } catch (error) {
      next(error);
    }
  }

  async getAtBatById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const atBat = await atBatService.getAtBatById(id as string);

      if (!atBat) {
        res.status(404).json({ error: 'At-bat not found' });
        return;
      }

      res.status(200).json({ atBat });
    } catch (error) {
      next(error);
    }
  }

  async getAtBatsByGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gameId } = req.params;
      const atBats = await atBatService.getAtBatsByGame(gameId as string);
      res.status(200).json({ atBats });
    } catch (error) {
      next(error);
    }
  }

  async getAtBatsByInning(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inningId } = req.params;
      const atBats = await atBatService.getAtBatsByInning(inningId as string);
      res.status(200).json({ atBats });
    } catch (error) {
      next(error);
    }
  }

  async updateAtBat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const atBat = await atBatService.updateAtBat(id as string, req.body);
      res.status(200).json({ message: 'At-bat updated successfully', atBat });
    } catch (error) {
      next(error);
    }
  }

  async endAtBat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { result, outs_after, rbi, runs_scored } = req.body;
      
      const atBat = await atBatService.endAtBat(id as string, result, outs_after, rbi, runs_scored);
      res.status(200).json({ message: 'At-bat ended successfully', atBat });
    } catch (error) {
      next(error);
    }
  }

  async getAtBatWithPitches(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const atBat = await atBatService.getAtBatWithPitches(id as string);

      if (!atBat) {
        res.status(404).json({ error: 'At-bat not found' });
        return;
      }

      res.status(200).json({ atBat });
    } catch (error) {
      next(error);
    }
  }
}

export default new AtBatController();