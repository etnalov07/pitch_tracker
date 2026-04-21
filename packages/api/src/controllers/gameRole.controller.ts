import { Response } from 'express';
import { AuthRequest } from '../types';
import gameRoleService from '../services/gameRole.service';

class GameRoleController {
    async getRole(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const gameId = req.params.gameId as string;
            const record = await gameRoleService.getRole(userId, gameId);
            res.json({ role: record?.role ?? null });
        } catch (err) {
            console.error('getRole error:', err);
            res.status(500).json({ error: 'Failed to get game role' });
        }
    }

    async assignRole(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const gameId = req.params.gameId as string;
            const { role } = req.body as { role: string };
            if (role !== 'charter' && role !== 'viewer') {
                res.status(400).json({ error: 'role must be charter or viewer' });
                return;
            }
            const record = await gameRoleService.upsertRole(userId, gameId, role);
            res.json({ role: record });
        } catch (err) {
            console.error('assignRole error:', err);
            res.status(500).json({ error: 'Failed to assign game role' });
        }
    }
}

export default new GameRoleController();
