import { Router } from 'express';
import gameController from '../controllers/game.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', gameController.createGame.bind(gameController));
router.get('/:id', gameController.getGameById.bind(gameController));
router.get('/team/:team_id', gameController.getGamesByTeam.bind(gameController));
router.post('/:id/start', gameController.startGame.bind(gameController));
router.put('/:id/score', gameController.updateScore.bind(gameController));
router.post('/:id/advance-inning', gameController.advanceInning.bind(gameController));
router.post('/:id/end', gameController.endGame.bind(gameController));
router.get('/:id/innings', gameController.getGameInnings.bind(gameController));

export default router;