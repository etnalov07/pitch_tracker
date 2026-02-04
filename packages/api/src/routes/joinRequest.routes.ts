import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles } from '../middleware/roles';
import joinRequestController from '../controllers/joinRequest.controller';

const router = Router();

router.use(authenticateToken, loadUserRoles);

// Player: create join request
router.post('/', joinRequestController.create.bind(joinRequestController));

// Player: get my requests
router.get('/my', joinRequestController.getMyRequests.bind(joinRequestController));

// Coach: approve request
router.put('/:id/approve', joinRequestController.approve.bind(joinRequestController));

// Coach: deny request
router.put('/:id/deny', joinRequestController.deny.bind(joinRequestController));

export default router;
