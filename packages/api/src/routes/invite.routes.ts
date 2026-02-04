import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requireTeamRole } from '../middleware/roles';
import inviteController from '../controllers/invite.controller';

const router = Router();

// Public: get invite details by token (no auth required)
router.get('/token/:token', inviteController.getByToken.bind(inviteController));

// Accept invite (auth required, no role check — any authenticated user can accept)
router.post(
    '/token/:token/accept',
    authenticateToken,
    inviteController.accept.bind(inviteController)
);

// Protected routes below require auth + roles
router.use(authenticateToken, loadUserRoles);

// Create invite (team coach/owner)
router.post('/', inviteController.create.bind(inviteController));

// List invites for a team (team coach/owner)
router.get('/team/:team_id', inviteController.listByTeam.bind(inviteController));

// Revoke invite (team coach/owner)
router.put('/:id/revoke', inviteController.revoke.bind(inviteController));

export default router;
