import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requireTeamRole, requireTeamRoleFromBody } from '../middleware/roles';
import inviteController from '../controllers/invite.controller';

const router = Router();

// Public: get invite details by token (no auth required)
router.get('/token/:token', inviteController.getByToken.bind(inviteController));

// Accept invite (auth required, no role check — any authenticated user can accept)
router.post('/token/:token/accept', authenticateToken, inviteController.accept.bind(inviteController));

// Public — register a new user FROM the invite, then accept it. One atomic
// transaction. Used by the "Create account from this invite" CTA on
// pages/InviteAccept (web).
router.post('/token/:token/register', inviteController.registerFromInvite.bind(inviteController));

// Protected routes below require auth + roles
router.use(authenticateToken, loadUserRoles);

// Create invite — team owner/coach only (team_id read from body)
router.post('/', requireTeamRoleFromBody('owner', 'coach'), inviteController.create.bind(inviteController));

// List invites for a team (team coach/owner)
router.get('/team/:team_id', requireTeamRole('owner', 'coach'), inviteController.listByTeam.bind(inviteController));

// Revoke invite (team coach/owner) — :id is invite id, team is checked at controller level today.
// Authz tightening for revoke is deferred until we add a lookup-by-invite middleware.
router.put('/:id/revoke', inviteController.revoke.bind(inviteController));

export default router;
