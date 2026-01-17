import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import teamService from '../services/team.service';

export class TeamController {
  async createTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const team = await teamService.createTeam(req.user.id, req.body);
      res.status(201).json({ message: 'Team created successfully', team });
    } catch (error) {
      next(error);
    }
  }

  async getTeams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const teams = await teamService.getTeamsByOwner(req.user.id);
      res.status(200).json({ teams });
    } catch (error) {
      next(error);
    }
  }

  async getAllTeams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teams = await teamService.getAllTeams();
      res.status(200).json({ teams });
    } catch (error) {
      next(error);
    }
  }

  async getTeamById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const team = await teamService.getTeamById(id as string);

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      res.status(200).json({ team });
    } catch (error) {
      next(error);
    }
  }

  async getTeamWithPlayers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const team = await teamService.getTeamWithPlayers(id as string);
      res.status(200).json({ team });
    } catch (error) {
      next(error);
    }
  }

  async updateTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const team = await teamService.updateTeam(id as string, req.user.id, req.body);
      res.status(200).json({ message: 'Team updated successfully', team });
    } catch (error) {
      next(error);
    }
  }

  async deleteTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await teamService.deleteTeam(id as string, req.user.id);
      res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new TeamController();