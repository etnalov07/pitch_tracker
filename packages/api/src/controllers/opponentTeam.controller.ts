import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import opponentTeamService from '../services/opponentTeam.service';

export class OpponentTeamController {
    async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const opponents = await opponentTeamService.list(teamId);
            res.status(200).json({ opponents });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const id = req.params.id as string;
            const opponent = await opponentTeamService.getWithRoster(id, teamId);
            if (!opponent) {
                res.status(404).json({ error: 'Opponent team not found' });
                return;
            }
            res.status(200).json({ opponent });
        } catch (error) {
            next(error);
        }
    }

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const { name, city, state, level, notes } = req.body;
            if (!name) {
                res.status(400).json({ error: 'name is required' });
                return;
            }
            const opponent = await opponentTeamService.create(teamId, { name, city, state, level, notes });
            res.status(201).json({ opponent });
        } catch (error) {
            next(error);
        }
    }

    async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const id = req.params.id as string;
            const { name, city, state, level, notes } = req.body;
            const opponent = await opponentTeamService.update(id, teamId, { name, city, state, level, notes });
            if (!opponent) {
                res.status(404).json({ error: 'Opponent team not found' });
                return;
            }
            res.status(200).json({ opponent });
        } catch (error) {
            next(error);
        }
    }

    async linkGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const id = req.params.id as string;
            const { game_id } = req.body;
            if (!game_id) {
                res.status(400).json({ error: 'game_id is required' });
                return;
            }
            const opponent = await opponentTeamService.getById(id, teamId);
            if (!opponent) {
                res.status(404).json({ error: 'Opponent team not found' });
                return;
            }
            await opponentTeamService.linkGame(game_id, id);
            res.status(200).json({ message: 'Game linked' });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teamId = req.params.teamId as string;
            const id = req.params.id as string;
            await opponentTeamService.delete(id, teamId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new OpponentTeamController();
