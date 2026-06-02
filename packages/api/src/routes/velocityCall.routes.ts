import { Router } from 'express';
import velocityCallController from '../controllers/velocityCall.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public — the sender page POSTs here with { code, velocity }. No auth: the
// 6-char code IS the credential, in exchange for zero-install friction.
router.post('/send', velocityCallController.sendVelocity.bind(velocityCallController));
router.get('/codes/:code', velocityCallController.describeCode.bind(velocityCallController));

// Authenticated — a charter on the game mints a code their helper will type.
router.post('/games/:gameId/codes', authenticateToken, velocityCallController.mintCode.bind(velocityCallController));

export default router;
