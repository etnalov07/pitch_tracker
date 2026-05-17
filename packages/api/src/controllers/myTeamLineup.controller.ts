import { Response } from 'express';
import { AuthRequest } from '../types';
import myTeamLineupService from '../services/myTeamLineup.service';

class MyTeamLineupController {
    async getByGame(req: AuthRequest, res: Response): Promise<void> {
        try {
            const lineup = await myTeamLineupService.getByGame(req.params['gameId'] as string);
            res.json({ lineup });
        } catch (err) {
            console.error('getMyTeamLineup error:', err);
            res.status(500).json({ error: 'Failed to fetch my team lineup' });
        }
    }

    async bulkCreate(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { players } = req.body as {
                players: { player_id: string; batting_order: number; position?: string; is_starter: boolean }[];
            };
            if (!Array.isArray(players) || players.length === 0) {
                res.status(400).json({ error: 'players array required' });
                return;
            }
            const lineup = await myTeamLineupService.bulkCreate(req.params['gameId'] as string, players);
            res.json({ lineup });
        } catch (err) {
            console.error('bulkCreateMyTeamLineup error:', err);
            res.status(500).json({ error: 'Failed to create my team lineup' });
        }
    }

    async substitutePlayer(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { player_id, inning_entered, position } = req.body as {
                player_id?: string;
                inning_entered?: number;
                position?: string;
            };
            if (!player_id || !inning_entered) {
                res.status(400).json({ error: 'player_id and inning_entered are required' });
                return;
            }
            const player = await myTeamLineupService.substitutePlayer(
                req.params['id'] as string,
                player_id,
                inning_entered,
                position
            );
            res.status(201).json({ player });
        } catch (err) {
            console.error('substituteMyTeamLineup error:', err);
            res.status(500).json({ error: 'Failed to substitute my team lineup player' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const player = await myTeamLineupService.update(req.params['id'] as string, req.body);
            if (!player) {
                res.status(404).json({ error: 'Player not found' });
                return;
            }
            res.json({ player });
        } catch (err) {
            console.error('updateMyTeamLineup error:', err);
            res.status(500).json({ error: 'Failed to update my team lineup player' });
        }
    }
}

export default new MyTeamLineupController();
