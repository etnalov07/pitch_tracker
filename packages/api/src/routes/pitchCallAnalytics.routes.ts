import { Router } from 'express';
import pitchCallAnalyticsController from '../controllers/pitchCallAnalytics.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Specific pitcher accuracy (optional ?gameId= query param)
router.get('/pitcher/:pitcherId', pitchCallAnalyticsController.getPitcherAccuracy.bind(pitchCallAnalyticsController));

// Game-level call analytics
router.get('/game/:gameId', pitchCallAnalyticsController.getGameAnalytics.bind(pitchCallAnalyticsController));

// Season-level team analytics
router.get('/team/:teamId/season', pitchCallAnalyticsController.getSeasonAnalytics.bind(pitchCallAnalyticsController));

export default router;
