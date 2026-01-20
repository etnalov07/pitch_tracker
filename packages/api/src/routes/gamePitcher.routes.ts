import { Router } from 'express';
import gamePitcherController from '../controllers/gamePitcher.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Game-level pitcher routes
router.post('/game/:gameId', gamePitcherController.addPitcher);
router.get('/game/:gameId', gamePitcherController.getPitchers);
router.get('/game/:gameId/current', gamePitcherController.getCurrentPitcher);
router.post('/game/:gameId/change', gamePitcherController.changePitcher);
router.delete('/game/:gameId', gamePitcherController.clearPitchers);

// Individual pitcher routes
router.put('/:pitcherId/exit', gamePitcherController.updatePitcherExit);
router.delete('/:pitcherId', gamePitcherController.deletePitcher);

export default router;
