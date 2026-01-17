import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Batter analytics
router.get('/batter/:batterId/history', analyticsController.getBatterHistory.bind(analyticsController));
router.get('/batter/:batterId/heat-map', analyticsController.getBatterPitchHeatMap.bind(analyticsController));
router.get('/batter/:batterId/spray-chart', analyticsController.getBatterSprayChart.bind(analyticsController));

// Pitcher analytics
router.get('/pitcher/:pitcherId/tendencies', analyticsController.getPitcherTendencies.bind(analyticsController));

// Game state
router.get('/game/:gameId/state', analyticsController.getGameState.bind(analyticsController));

// Matchup analytics
router.get('/matchup/:batterId/:pitcherId', analyticsController.getMatchupStats.bind(analyticsController));

export default router;