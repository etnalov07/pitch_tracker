import { Router } from 'express';
import teamController from '../controllers/team.controller';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requireTeamRole } from '../middleware/roles';
import { uploadLogo } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken, loadUserRoles);

router.post('/', teamController.createTeam.bind(teamController));
router.get('/', teamController.getTeams.bind(teamController));
router.get('/all', teamController.getAllTeams.bind(teamController));
router.get('/search', teamController.searchTeams.bind(teamController));
router.get('/:id', teamController.getTeamById.bind(teamController));
router.get('/:id/players', teamController.getTeamWithPlayers.bind(teamController));
router.put('/:id', teamController.updateTeam.bind(teamController));
router.delete('/:id', teamController.deleteTeam.bind(teamController));

// Team branding routes
router.post('/:id/logo', uploadLogo, teamController.uploadLogo.bind(teamController));
router.put('/:id/colors', teamController.updateColors.bind(teamController));
router.delete('/:id/logo', teamController.deleteLogo.bind(teamController));

// Join requests for a team (coach/owner only)
router.get('/:id/join-requests', requireTeamRole('owner', 'coach'), teamController.getJoinRequests.bind(teamController));

export default router;