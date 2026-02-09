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

// Pitcher plan assignments
router.get('/pitcher/:pitcherId/assignments', bullpenController.getPitcherAssignments.bind(bullpenController));

// Plan routes
router.post('/plans', bullpenController.createPlan.bind(bullpenController));
router.get('/plans/team/:teamId', bullpenController.getTeamPlans.bind(bullpenController));
router.get('/plans/:planId', bullpenController.getPlan.bind(bullpenController));
router.put('/plans/:planId', bullpenController.updatePlan.bind(bullpenController));
router.delete('/plans/:planId', bullpenController.deletePlan.bind(bullpenController));
router.post('/plans/:planId/assign', bullpenController.assignPlan.bind(bullpenController));
router.delete('/plans/:planId/assign/:pitcherId', bullpenController.unassignPlan.bind(bullpenController));

export default router;
