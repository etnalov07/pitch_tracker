import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import adminService from '../services/admin.service';
import auditService from '../services/audit.service';

const parsePagination = (req: AuthRequest): { page: number; page_size: number } => ({
    page: parseInt((req.query.page as string) || '1', 10) || 1,
    page_size: parseInt((req.query.page_size as string) || '50', 10) || 50,
});

export class AdminController {
    async listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, page_size } = parsePagination(req);
            const search = (req.query.search as string | undefined) || undefined;
            const result = await adminService.listUsers({ page, page_size, search });
            if (req.user && result.items.length >= 50) {
                await auditService.write({
                    actor_user_id: req.user.id,
                    actor_role: 'super',
                    action: 'admin.users.list',
                    payload: { page, page_size, search, returned: result.items.length },
                });
            }
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const detail = await adminService.getUserDetail(req.params.id as string);
            if (!detail) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.status(200).json({ user: detail });
        } catch (err) {
            next(err);
        }
    }

    async listOrgs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, page_size } = parsePagination(req);
            const result = await adminService.listOrgs({ page, page_size });
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async listTeams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, page_size } = parsePagination(req);
            const organization_id = (req.query.organization_id as string | undefined) || undefined;
            const result = await adminService.listTeams({ page, page_size, organization_id });
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async listGames(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, page_size } = parsePagination(req);
            const team_id = (req.query.team_id as string | undefined) || undefined;
            const date_from = (req.query.date_from as string | undefined) || undefined;
            const date_to = (req.query.date_to as string | undefined) || undefined;
            const result = await adminService.listGames({ page, page_size, team_id, date_from, date_to });
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async listAudit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page, page_size } = parsePagination(req);
            const result = await adminService.listAudit({ page, page_size });
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async forceVerifyEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.params.id as string;
            const ok = await adminService.forceVerifyEmail(userId);
            if (!ok) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            if (req.user) {
                await auditService.write({
                    actor_user_id: req.user.id,
                    actor_role: 'super',
                    action: 'admin.users.force_verify_email',
                    target_table: 'users',
                    target_id: userId,
                });
            }
            res.status(200).json({ message: 'Email marked as verified' });
        } catch (err) {
            next(err);
        }
    }

    async resendVerification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.params.id as string;
            const result = await adminService.resendVerification(userId);
            if (!result.sent) {
                res.status(result.reason === 'User not found' ? 404 : 400).json({ error: result.reason });
                return;
            }
            if (req.user) {
                await auditService.write({
                    actor_user_id: req.user.id,
                    actor_role: 'super',
                    action: 'admin.users.resend_verification',
                    target_table: 'users',
                    target_id: userId,
                });
            }
            res.status(200).json({ message: 'Verification email sent' });
        } catch (err) {
            next(err);
        }
    }
}

export default new AdminController();
