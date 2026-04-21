import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import gameRoleController from '../controllers/gameRole.controller';

const router = Router();

router.get('/game/:gameId/role', authenticateToken, gameRoleController.getRole.bind(gameRoleController));
router.post('/game/:gameId/role', authenticateToken, gameRoleController.assignRole.bind(gameRoleController));

export default router;
