import { Router } from 'express';
import performanceSummaryController from '../controllers/performanceSummary.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Specific route before parameterized to avoid conflicts
router.get('/pitcher/:pitcherId', performanceSummaryController.getSummariesByPitcher.bind(performanceSummaryController));

// Get or generate summary for a game or bullpen session
router.get('/:sourceType/:sourceId', performanceSummaryController.getOrGenerateSummary.bind(performanceSummaryController));

// Regenerate AI narrative
router.post('/:id/regenerate-narrative', performanceSummaryController.regenerateNarrative.bind(performanceSummaryController));

export default router;
