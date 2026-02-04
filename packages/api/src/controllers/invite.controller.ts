import { Response, NextFunction } from 'express';
import { RoleAwareRequest, AuthRequest } from '../types';
import inviteService from '../services/invite.service';

export class InviteController {
    async create(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const invite = await inviteService.createInvite(req.user!.id, req.body);
            res.status(201).json(invite);
        } catch (error) {
            next(error);
        }
    }

    async listByTeam(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const invites = await inviteService.getInvitesByTeam(req.params.team_id as string);
            res.json({ invites });
        } catch (error) {
            next(error);
        }
    }

    async getByToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const invite = await inviteService.getInviteByToken(req.params.token as string);
            if (!invite) {
                res.status(404).json({ error: 'Invite not found' });
                return;
            }
            // Don't expose the full token in the response
            const { token, ...safeInvite } = invite;
            res.json(safeInvite);
        } catch (error) {
            next(error);
        }
    }

    async accept(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await inviteService.acceptInvite(req.params.token as string, req.user!.id);
            res.json({ message: 'Invite accepted', ...result });
        } catch (error) {
            next(error);
        }
    }

    async revoke(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await inviteService.revokeInvite(req.params.id as string);
            res.json({ message: 'Invite revoked' });
        } catch (error) {
            next(error);
        }
    }
}

export default new InviteController();
