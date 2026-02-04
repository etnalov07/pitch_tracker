import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requireTeamRole } from '../middleware/roles';
import teamMemberController from '../controllers/teamMember.controller';

const router = Router();

router.use(authenticateToken, loadUserRoles);

// Get team members
router.get(
    '/:team_id/members',
    teamMemberController.getMembers.bind(teamMemberController)
);

// Update member role (coach/owner only)
router.put(
    '/:team_id/members/:member_id',
    requireTeamRole('owner', 'coach'),
    teamMemberController.updateRole.bind(teamMemberController)
);

// Remove member (coach/owner only)
router.delete(
    '/:team_id/members/:member_id',
    requireTeamRole('owner', 'coach'),
    teamMemberController.removeMember.bind(teamMemberController)
);

// Link member to player record (coach/owner only)
router.post(
    '/:team_id/members/:member_id/link-player',
    requireTeamRole('owner', 'coach'),
    teamMemberController.linkPlayer.bind(teamMemberController)
);

export default router;
