import { Router } from 'express';
import bullpenController from '../controllers/bullpen.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Session routes
router.post('/sessions', bullpenController.createSession.bind(bullpenController));
router.get('/sessions/team/:teamId', bullpenController.getTeamSessions.bind(bullpenController));
router.get('/sessions/pitcher/:pitcherId', bullpenController.getPitcherSessions.bind(bullpenController));
router.get('/sessions/:id', bullpenController.getSession.bind(bullpenController));
router.get('/sessions/:id/summary', bullpenController.getSessionSummary.bind(bullpenController));
router.put('/sessions/:id', bullpenController.updateSession.bind(bullpenController));
router.post('/sessions/:id/end', bullpenController.endSession.bind(bullpenController));

// Pitch routes
router.post('/pitches', bullpenController.logPitch.bind(bullpenController));
router.get('/pitches/session/:sessionId', bullpenController.getSessionPitches.bind(bullpenController));

// Pitcher bullpen logs
router.get('/pitcher/:pitcherId/logs', bullpenController.getPitcherBullpenLogs.bind(bullpenController));

export default router;
