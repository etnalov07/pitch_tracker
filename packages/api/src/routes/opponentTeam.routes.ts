import { Router } from 'express';
import opponentTeamController from '../controllers/opponentTeam.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

// /bt-api/teams/:teamId/opponents
router.get('/', opponentTeamController.list.bind(opponentTeamController));
router.post('/', opponentTeamController.create.bind(opponentTeamController));
router.get('/:id', opponentTeamController.getById.bind(opponentTeamController));
router.put('/:id', opponentTeamController.update.bind(opponentTeamController));
router.post('/:id/link-game', opponentTeamController.linkGame.bind(opponentTeamController));
router.delete('/:id', opponentTeamController.delete.bind(opponentTeamController));

export default router;
