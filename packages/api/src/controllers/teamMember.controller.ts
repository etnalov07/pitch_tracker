import { Response, NextFunction } from 'express';
import { RoleAwareRequest } from '../types';
import teamMemberService from '../services/teamMember.service';

export class TeamMemberController {
    async getMembers(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const members = await teamMemberService.getMembers(req.params.team_id as string);
            res.json({ members });
        } catch (error) {
            next(error);
        }
    }

    async updateRole(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { role } = req.body;
            if (!role) {
                res.status(400).json({ error: 'Role is required' });
                return;
            }
            const member = await teamMemberService.updateMemberRole(req.params.member_id as string, role);
            res.json(member);
        } catch (error) {
            next(error);
        }
    }

    async removeMember(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await teamMemberService.removeMember(req.params.member_id as string);
            res.json({ message: 'Member removed' });
        } catch (error) {
            next(error);
        }
    }

    async linkPlayer(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { player_id } = req.body;
            if (!player_id) {
                res.status(400).json({ error: 'player_id is required' });
                return;
            }
            const member = await teamMemberService.linkPlayerToMember(req.params.member_id as string, player_id);
            res.json(member);
        } catch (error) {
            next(error);
        }
    }
}

export default new TeamMemberController();
