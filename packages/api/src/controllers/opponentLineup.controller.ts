import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import opponentLineupService from '../services/opponentLineup.service';

export class OpponentLineupController {
    async createPlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const player = await opponentLineupService.createPlayer(gameId as string, req.body);
            res.status(201).json({ player, message: 'Player added to opponent lineup' });
        } catch (error) {
            next(error);
        }
    }

    async createLineup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const { players } = req.body;

            if (!Array.isArray(players)) {
                res.status(400).json({ error: 'players must be an array' });
                return;
            }

            const lineup = await opponentLineupService.createLineup(gameId as string, players);
            res.status(201).json({ lineup, message: 'Opponent lineup created' });
        } catch (error) {
            next(error);
        }
    }

    async getLineup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const lineup = await opponentLineupService.getLineupByGameId(gameId as string);
            res.json({ lineup });
        } catch (error) {
            next(error);
        }
    }

    async getActiveLineup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            const lineup = await opponentLineupService.getActiveLineup(gameId as string);
            res.json({ lineup });
        } catch (error) {
            next(error);
        }
    }

    async getPlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { playerId } = req.params;
            const player = await opponentLineupService.getPlayerById(playerId as string);

            if (!player) {
                res.status(404).json({ error: 'Player not found' });
                return;
            }

            res.json({ player });
        } catch (error) {
            next(error);
        }
    }

    async updatePlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { playerId } = req.params;
            const player = await opponentLineupService.updatePlayer(playerId as string, req.body);
            res.json({ player, message: 'Player updated' });
        } catch (error) {
            next(error);
        }
    }

    async substitutePlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { playerId } = req.params;
            const { player_name, inning_entered, position, bats } = req.body;

            if (!player_name || !inning_entered) {
                res.status(400).json({ error: 'player_name and inning_entered are required' });
                return;
            }

            const newPlayer = await opponentLineupService.substitutePlayer(
                playerId as string,
                player_name,
                inning_entered,
                position,
                bats
            );
            res.status(201).json({ player: newPlayer, message: 'Player substituted' });
        } catch (error) {
            next(error);
        }
    }

    async deletePlayer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { playerId } = req.params;
            await opponentLineupService.deletePlayer(playerId as string);
            res.json({ message: 'Player removed from lineup' });
        } catch (error) {
            next(error);
        }
    }

    async deleteLineup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            await opponentLineupService.deleteLineup(gameId as string);
            res.json({ message: 'Lineup deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export default new OpponentLineupController();
