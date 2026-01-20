import { Router } from 'express';
import opponentLineupController from '../controllers/opponentLineup.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Game-level lineup routes
router.post('/game/:gameId', opponentLineupController.createPlayer);
router.post('/game/:gameId/bulk', opponentLineupController.createLineup);
router.get('/game/:gameId', opponentLineupController.getLineup);
router.get('/game/:gameId/active', opponentLineupController.getActiveLineup);
router.delete('/game/:gameId', opponentLineupController.deleteLineup);

// Individual player routes
router.get('/player/:playerId', opponentLineupController.getPlayer);
router.put('/player/:playerId', opponentLineupController.updatePlayer);
router.post('/player/:playerId/substitute', opponentLineupController.substitutePlayer);
router.delete('/player/:playerId', opponentLineupController.deletePlayer);

export default router;
