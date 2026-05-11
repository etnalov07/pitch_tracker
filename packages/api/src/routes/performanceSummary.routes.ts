import { Router } from 'express';
import performanceSummaryController from '../controllers/performanceSummary.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public, no-login report endpoint. Must be registered BEFORE the
// authenticateToken middleware below so it stays open. UUID gameId is the
// secret — same model as a Google Doc with "anyone with the link".
router.get('/game/:gameId/public-report', performanceSummaryController.getPublicReport.bind(performanceSummaryController));

router.use(authenticateToken);

// Specific routes before parameterized to avoid conflicts
router.get('/pitcher/:pitcherId', performanceSummaryController.getSummariesByPitcher.bind(performanceSummaryController));
router.get('/game/:gameId/pitchers', performanceSummaryController.getGamePitcherSummaries.bind(performanceSummaryController));
router.get('/game/:gameId/batter-breakdown', performanceSummaryController.getBatterBreakdown.bind(performanceSummaryController));
router.get(
    '/game/:gameId/my-team-batter-breakdown',
    performanceSummaryController.getMyTeamBatterBreakdown.bind(performanceSummaryController)
);
router.get(
    '/game/:gameId/opponent-attack',
    performanceSummaryController.getOpponentAttackSummary.bind(performanceSummaryController)
);
router.post(
    '/team-offense/:gameId/regenerate-narrative',
    performanceSummaryController.regenerateTeamOffenseNarrative.bind(performanceSummaryController)
);
router.post('/game/:gameId/email-report', performanceSummaryController.emailPostGameReport.bind(performanceSummaryController));

// Get or generate summary for a game or bullpen session
router.get('/:sourceType/:sourceId', performanceSummaryController.getOrGenerateSummary.bind(performanceSummaryController));

// Regenerate AI narrative
router.post('/:id/regenerate-narrative', performanceSummaryController.regenerateNarrative.bind(performanceSummaryController));

export default router;
