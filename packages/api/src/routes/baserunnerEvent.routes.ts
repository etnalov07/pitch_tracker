import { Router } from 'express';
import baserunnerEventController from '../controllers/baserunnerEvent.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', baserunnerEventController.recordEvent.bind(baserunnerEventController));
router.get('/game/:gameId', baserunnerEventController.getEventsByGame.bind(baserunnerEventController));
router.get('/inning/:inningId', baserunnerEventController.getEventsByInning.bind(baserunnerEventController));
router.delete('/:id', baserunnerEventController.deleteEvent.bind(baserunnerEventController));

export default router;
