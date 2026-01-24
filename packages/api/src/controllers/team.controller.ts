import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import teamService from '../services/team.service';
import { processLogoUpload } from '../utils/imageProcessor';

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

  async uploadLogo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Process and resize the image
      const logoPath = await processLogoUpload(file.path, id as string);

      const team = await teamService.updateTeamBranding(id as string, req.user.id, {
        logo_path: logoPath,
      });

      res.status(200).json({
        message: 'Logo uploaded successfully',
        team,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateColors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { primary_color, secondary_color, accent_color } = req.body;

      // Validate hex color format
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (primary_color && !hexRegex.test(primary_color)) {
        res.status(400).json({ error: 'Invalid primary color format. Use hex format like #FF0000' });
        return;
      }
      if (secondary_color && !hexRegex.test(secondary_color)) {
        res.status(400).json({ error: 'Invalid secondary color format. Use hex format like #FF0000' });
        return;
      }
      if (accent_color && !hexRegex.test(accent_color)) {
        res.status(400).json({ error: 'Invalid accent color format. Use hex format like #FF0000' });
        return;
      }

      const team = await teamService.updateTeamColors(id as string, req.user.id, {
        primary_color,
        secondary_color,
        accent_color,
      });

      res.status(200).json({ message: 'Colors updated successfully', team });
    } catch (error) {
      next(error);
    }
  }

  async deleteLogo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const team = await teamService.deleteLogo(id as string, req.user.id);
      res.status(200).json({ message: 'Logo deleted successfully', team });
    } catch (error) {
      next(error);
    }
  }
}

export default new TeamController();