import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import pitchService from '../services/pitch.service';

export class PitchController {
  async logPitch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pitch = await pitchService.logPitch(req.body);
      res.status(201).json({ message: 'Pitch logged successfully', pitch });
    } catch (error) {
      next(error);
    }
  }

  async getPitchById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pitch = await pitchService.getPitchById(id as string);

      if (!pitch) {
        res.status(404).json({ error: 'Pitch not found' });
        return;
      }

      res.status(200).json({ pitch });
    } catch (error) {
      next(error);
    }
  }

  async getPitchesByAtBat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { atBatId } = req.params;
      const pitches = await pitchService.getPitchesByAtBat(atBatId as string);
      res.status(200).json({ pitches });
    } catch (error) {
      next(error);
    }
  }

  async getPitchesByGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gameId } = req.params;
      const pitches = await pitchService.getPitchesByGame(gameId as string);
      res.status(200).json({ pitches });
    } catch (error) {
      next(error);
    }
  }

  async getPitchesByPitcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pitcherId } = req.params;
      const { gameId } = req.query;
      const pitches = await pitchService.getPitchesByPitcher(pitcherId as string, gameId as string);
      res.status(200).json({ pitches });
    } catch (error) {
      next(error);
    }
  }

  async getPitchesByBatter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batterId } = req.params;
      const { gameId } = req.query;
      const pitches = await pitchService.getPitchesByBatter(batterId as string, gameId as string);
      res.status(200).json({ pitches });
    } catch (error) {
      next(error);
    }
  }
}

export default new PitchController();