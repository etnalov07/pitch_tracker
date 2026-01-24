import { Router } from 'express';
import teamController from '../controllers/team.controller';
import { authenticateToken } from '../middleware/auth';
import { uploadLogo } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', teamController.createTeam.bind(teamController));
router.get('/', teamController.getTeams.bind(teamController));
router.get('/all', teamController.getAllTeams.bind(teamController));
router.get('/:id', teamController.getTeamById.bind(teamController));
router.get('/:id/players', teamController.getTeamWithPlayers.bind(teamController));
router.put('/:id', teamController.updateTeam.bind(teamController));
router.delete('/:id', teamController.deleteTeam.bind(teamController));

// Team branding routes
router.post('/:id/logo', uploadLogo, teamController.uploadLogo.bind(teamController));
router.put('/:id/colors', teamController.updateColors.bind(teamController));
router.delete('/:id/logo', teamController.deleteLogo.bind(teamController));

export default router;