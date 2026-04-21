import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import myTeamLineupController from '../controllers/myTeamLineup.controller';

const router = Router();

router.get('/game/:gameId', authenticateToken, myTeamLineupController.getByGame.bind(myTeamLineupController));
router.post('/game/:gameId/bulk', authenticateToken, myTeamLineupController.bulkCreate.bind(myTeamLineupController));
router.put('/:id', authenticateToken, myTeamLineupController.update.bind(myTeamLineupController));

export default router;
