import { Router } from 'express';
import opponentBatterProfileController from '../controllers/opponentBatterProfile.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

// /bt-api/opponent-batter-profiles
router.get(
    '/opponent-team/:opponentTeamId',
    opponentBatterProfileController.getByOpponentTeam.bind(opponentBatterProfileController)
);
router.post('/opponent-team/:opponentTeamId', opponentBatterProfileController.create.bind(opponentBatterProfileController));
router.patch('/:id', opponentBatterProfileController.update.bind(opponentBatterProfileController));
router.delete('/:id', opponentBatterProfileController.delete.bind(opponentBatterProfileController));

export default router;
