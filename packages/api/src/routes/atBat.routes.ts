import { Router } from 'express';
import atBatController from '../controllers/atBat.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', atBatController.createAtBat.bind(atBatController));
router.get('/:id', atBatController.getAtBatById.bind(atBatController));
router.get('/game/:gameId', atBatController.getAtBatsByGame.bind(atBatController));
router.get('/inning/:inningId', atBatController.getAtBatsByInning.bind(atBatController));
router.put('/:id', atBatController.updateAtBat.bind(atBatController));
router.post('/:id/end', atBatController.endAtBat.bind(atBatController));
router.get('/:id/pitches', atBatController.getAtBatWithPitches.bind(atBatController));

export default router;