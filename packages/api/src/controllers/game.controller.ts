import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import gameService from '../services/game.service';

export class GameController {
  async createGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const game = await gameService.createGame(req.user.id, req.body);
      res.status(201).json({ message: 'Game created successfully', game });
    } catch (error) {
      next(error);
    }
  }

  async getGameById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const game = await gameService.getGameById(id as string);

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      res.status(200).json({ game });
    } catch (error) {
      next(error);
    }
  }

  async getGamesByTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { team_id } = req.params;
      const games = await gameService.getGamesByTeam(team_id as string);
      res.status(200).json({ games });
    } catch (error) {
      next(error);
    }
  }

  async startGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const game = await gameService.startGame(id as string);
      res.status(200).json({ message: 'Game started', game });
    } catch (error) {
      next(error);
    }
  }

  async updateScore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { home_score, away_score } = req.body;
      const game = await gameService.updateGameScore(id as string, home_score, away_score);
      res.status(200).json({ message: 'Score updated', game });
    } catch (error) {
      next(error);
    }
  }

  async advanceInning(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const game = await gameService.advanceInning(id as string);
      res.status(200).json({ message: 'Inning advanced', game });
    } catch (error) {
      next(error);
    }
  }

  async endGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const game = await gameService.endGame(id as string);
      res.status(200).json({ message: 'Game ended', game });
    } catch (error) {
      next(error);
    }
  }

  async getGameInnings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const innings = await gameService.getGameInnings(id as string);
      res.status(200).json({ innings });
    } catch (error) {
      next(error);
    }
  }
}

export default new GameController();