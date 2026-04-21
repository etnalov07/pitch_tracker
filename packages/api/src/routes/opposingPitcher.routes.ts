import { Router } from 'express';
import opposingPitcherController from '../controllers/opposingPitcher.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/game/:gameId', opposingPitcherController.getByGame.bind(opposingPitcherController));
router.post('/', opposingPitcherController.create.bind(opposingPitcherController));
router.delete('/:id', opposingPitcherController.delete.bind(opposingPitcherController));

export default router;
