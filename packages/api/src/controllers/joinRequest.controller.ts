import { Response, NextFunction } from 'express';
import { RoleAwareRequest } from '../types';
import joinRequestService from '../services/joinRequest.service';

export class JoinRequestController {
    async create(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const request = await joinRequestService.createRequest(req.user!.id, req.body);
            res.status(201).json(request);
        } catch (error) {
            next(error);
        }
    }

    async getMyRequests(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requests = await joinRequestService.getRequestsByUser(req.user!.id);
            res.json({ requests });
        } catch (error) {
            next(error);
        }
    }

    async getByTeam(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requests = await joinRequestService.getRequestsByTeam(req.params.team_id as string);
            res.json({ requests });
        } catch (error) {
            next(error);
        }
    }

    async approve(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { linked_player_id } = req.body;
            await joinRequestService.approveRequest(req.params.id as string, req.user!.id, linked_player_id);
            res.json({ message: 'Request approved' });
        } catch (error) {
            next(error);
        }
    }

    async deny(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await joinRequestService.denyRequest(req.params.id as string, req.user!.id);
            res.json({ message: 'Request denied' });
        } catch (error) {
            next(error);
        }
    }
}

export default new JoinRequestController();
