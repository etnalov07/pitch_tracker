import { Router } from 'express';
import playerController from '../controllers/player.controller';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requirePlayerTeamRole } from '../middleware/roles';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(loadUserRoles);

router.post('/', playerController.createPlayer.bind(playerController));
router.get('/team/:team_id', playerController.getPlayersByTeam.bind(playerController));
router.get('/pitchers/team/:team_id', playerController.getPitchersByTeam.bind(playerController));
router.get('/pitchers/team/:team_id/with-pitch-types', playerController.getPitchersWithPitchTypes.bind(playerController));
router.get('/:id', playerController.getPlayerById.bind(playerController));
router.put('/:id', requirePlayerTeamRole('owner', 'coach', 'assistant'), playerController.updatePlayer.bind(playerController));
router.delete('/:id', requirePlayerTeamRole('owner', 'coach'), playerController.deletePlayer.bind(playerController));
router.get('/:id/stats', playerController.getPlayerStats.bind(playerController));
router.get('/:id/pitch-types', playerController.getPitcherPitchTypes.bind(playerController));
router.put(
    '/:id/pitch-types',
    requirePlayerTeamRole('owner', 'coach', 'assistant'),
    playerController.setPitcherPitchTypes.bind(playerController)
);
router.get('/:id/game-stats/:game_id', playerController.getPitcherGameStats.bind(playerController));
router.post('/team/:team_id/import', requirePlayerTeamRole('owner', 'coach'), playerController.importRoster.bind(playerController));

export default router;
