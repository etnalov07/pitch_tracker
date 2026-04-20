import { Router } from 'express';
import scoutingReportController from '../controllers/scoutingReport.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// List reports for a team
router.get('/team/:teamId', scoutingReportController.listByTeam);
// Report linked to a specific game (for live-game surfacing)
router.get('/game/:gameId', scoutingReportController.getByGameId);
// Live matching by jersey/name for tendencies panel
router.get('/game/:gameId/live-match', scoutingReportController.liveMatch);

// Report CRUD
router.post('/team/:teamId', scoutingReportController.create);
router.get('/:id', scoutingReportController.getById);
router.patch('/:id', scoutingReportController.update);
router.delete('/:id', scoutingReportController.delete);

// Batter CRUD within a report
router.post('/:id/batters', scoutingReportController.addBatter);
router.patch('/batters/:batterId', scoutingReportController.updateBatter);
router.delete('/batters/:batterId', scoutingReportController.deleteBatter);

// Import batters from a prior game's opponent lineup
router.post('/:id/import-lineup/:sourceGameId', scoutingReportController.importLineup);

export default router;
