import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import playerService from '../services/player.service';

export class PlayerController {
    async createPlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const player = await playerService.createPlayer(req.body);
            res.status(201).json({ message: 'Player created successfully', player });
        } catch (error) {
            next(error);
        }
    }

    async getPlayerById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const player = await playerService.getPlayerById(id as string);

            if (!player) {
                res.status(404).json({ error: 'Player not found' });
                return;
            }

            res.status(200).json({ player });
        } catch (error) {
            next(error);
        }
    }

    async getPlayersByTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { team_id } = req.params;
            const players = await playerService.getPlayersByTeam(team_id as string);
            res.status(200).json({ players });
        } catch (error) {
            next(error);
        }
    }

    async updatePlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const player = await playerService.updatePlayer(id as string, req.body);
            res.status(200).json({ message: 'Player updated successfully', player });
        } catch (error) {
            next(error);
        }
    }

    async deletePlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            await playerService.deletePlayer(id as string);
            res.status(200).json({ message: 'Player deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getPlayerStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const stats = await playerService.getPlayerStats(id as string);
            res.status(200).json({ stats });
        } catch (error) {
            next(error);
        }
    }

    async getPitchersByTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { team_id } = req.params;
            const pitchers = await playerService.getPitchersByTeam(team_id as string);
            res.status(200).json({ pitchers });
        } catch (error) {
            next(error);
        }
    }

    async getPitchersWithPitchTypes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { team_id } = req.params;
            const pitchers = await playerService.getPitchersWithPitchTypes(team_id as string);
            res.status(200).json({ pitchers });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherPitchTypes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const pitch_types = await playerService.getPitcherPitchTypes(id as string);
            res.status(200).json({ pitch_types });
        } catch (error) {
            next(error);
        }
    }

    async setPitcherPitchTypes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { pitch_types } = req.body;

            if (!Array.isArray(pitch_types)) {
                res.status(400).json({ error: 'pitch_types must be an array' });
                return;
            }

            const result = await playerService.setPitcherPitchTypes(id as string, pitch_types);
            res.status(200).json({ message: 'Pitch types updated', pitch_types: result });
        } catch (error) {
            next(error);
        }
    }

    async getPitcherGameStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, game_id } = req.params;
            const stats = await playerService.getPitcherGameStats(id as string, game_id as string);
            res.status(200).json({ stats });
        } catch (error) {
            next(error);
        }
    }
}

export default new PlayerController();
