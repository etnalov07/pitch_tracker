import { Router } from 'express';
import opponentPitcherProfileController from '../controllers/opponentPitcherProfile.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

// /bt-api/opponent-pitcher-profiles
router.get(
    '/opponent-team/:opponentTeamId',
    opponentPitcherProfileController.getByOpponentTeam.bind(opponentPitcherProfileController)
);
router.get('/:id', opponentPitcherProfileController.getById.bind(opponentPitcherProfileController));
router.post('/:id/recalculate', opponentPitcherProfileController.recalculate.bind(opponentPitcherProfileController));
router.post(
    '/:id/link-opposing-pitcher',
    opponentPitcherProfileController.linkOpposingPitcher.bind(opponentPitcherProfileController)
);

export default router;
