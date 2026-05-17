import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requireTeamRoleFromJoinRequest } from '../middleware/roles';
import joinRequestController from '../controllers/joinRequest.controller';

const router = Router();

router.use(authenticateToken, loadUserRoles);

// Player: create join request
router.post('/', joinRequestController.create.bind(joinRequestController));

// Player: get my requests
router.get('/my', joinRequestController.getMyRequests.bind(joinRequestController));

// Coach: approve request — team owner/coach on the join_request's team
router.put(
    '/:id/approve',
    requireTeamRoleFromJoinRequest('owner', 'coach'),
    joinRequestController.approve.bind(joinRequestController)
);

// Coach: deny request — same authz as approve
router.put('/:id/deny', requireTeamRoleFromJoinRequest('owner', 'coach'), joinRequestController.deny.bind(joinRequestController));

export default router;
