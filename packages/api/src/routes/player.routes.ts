import { Router } from 'express';
import playerController from '../controllers/player.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', playerController.createPlayer.bind(playerController));
router.get('/:id', playerController.getPlayerById.bind(playerController));
router.get('/team/:team_id', playerController.getPlayersByTeam.bind(playerController));
router.put('/:id', playerController.updatePlayer.bind(playerController));
router.delete('/:id', playerController.deletePlayer.bind(playerController));
router.get('/:id/stats', playerController.getPlayerStats.bind(playerController));

export default router;