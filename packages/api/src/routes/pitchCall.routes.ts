import { Router } from 'express';
import pitchCallController from '../controllers/pitchCall.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Specific routes before parameterized routes
router.get('/game/:gameId/active', pitchCallController.getActiveCall.bind(pitchCallController));
router.get('/game/:gameId/summary', pitchCallController.getGameSummary.bind(pitchCallController));
router.get('/game/:gameId', pitchCallController.getGameCalls.bind(pitchCallController));
router.get('/at-bat/:atBatId', pitchCallController.getAtBatCalls.bind(pitchCallController));

// CRUD
router.post('/', pitchCallController.createCall.bind(pitchCallController));
router.get('/:id', pitchCallController.getCall.bind(pitchCallController));
router.post('/:id/change', pitchCallController.changeCall.bind(pitchCallController));
router.post('/:id/transmitted', pitchCallController.markTransmitted.bind(pitchCallController));
router.put('/:id/result', pitchCallController.logResult.bind(pitchCallController));

export default router;
