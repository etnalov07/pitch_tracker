import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import scoutingController from '../controllers/scouting.controller';
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
router.get('/pitcher/:pitcherId/game-logs', analyticsController.getPitcherGameLogs.bind(analyticsController));
router.get('/pitcher/:pitcherId/profile', analyticsController.getPitcherProfile.bind(analyticsController));
router.get('/pitcher/:pitcherId/heat-zones', analyticsController.getPitcherHeatZones.bind(analyticsController));

// Game state
router.get('/game/:gameId/state', analyticsController.getGameState.bind(analyticsController));

// Matchup analytics
router.get('/matchup/:batterId/:pitcherId', analyticsController.getMatchupStats.bind(analyticsController));

// Opponent batter scouting
router.get('/opponent-batter/:batterId/scouting', scoutingController.getScoutingReport.bind(scoutingController));
router.post('/opponent-batter/:batterId/notes', scoutingController.addNote.bind(scoutingController));
router.put('/opponent-batter/:batterId/notes/:noteId', scoutingController.updateNote.bind(scoutingController));
router.delete('/opponent-batter/:batterId/notes/:noteId', scoutingController.deleteNote.bind(scoutingController));
router.post('/opponent-batter/:batterId/tendencies/recalculate', scoutingController.recalculateTendencies.bind(scoutingController));

export default router;
