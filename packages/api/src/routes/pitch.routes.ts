import { Router } from 'express';
import pitchController from '../controllers/pitch.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', pitchController.logPitch.bind(pitchController));
router.get('/:id', pitchController.getPitchById.bind(pitchController));
router.get('/at-bat/:atBatId', pitchController.getPitchesByAtBat.bind(pitchController));
router.get('/game/:gameId', pitchController.getPitchesByGame.bind(pitchController));
router.get('/pitcher/:pitcherId', pitchController.getPitchesByPitcher.bind(pitchController));
router.get('/batter/:batterId', pitchController.getPitchesByBatter.bind(pitchController));

export default router;