import { Router } from 'express';
import playController from '../controllers/play.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', playController.recordPlay.bind(playController));
router.get('/:id', playController.getPlayById.bind(playController));
router.get('/at-bat/:atBatId', playController.getPlaysByAtBat.bind(playController));
router.get('/game/:gameId', playController.getPlaysByGame.bind(playController));
router.get('/batter/:batterId', playController.getPlaysByBatter.bind(playController));
router.put('/:id', playController.updatePlay.bind(playController));

export default router;