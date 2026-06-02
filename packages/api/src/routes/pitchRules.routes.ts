import { Router } from 'express';
import pitchRulesController from '../controllers/pitchRules.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Bulk (PitcherSelector renders all roster chips together) — declared first so
// it doesn't collide with the single-pitcher path.
router.get('/eligibility/:gameId/bulk', pitchRulesController.getBulk.bind(pitchRulesController));
router.get('/eligibility/:gameId/:pitcherId', pitchRulesController.getOne.bind(pitchRulesController));

export default router;
