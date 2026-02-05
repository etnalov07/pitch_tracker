import { Router } from 'express';
import gameController from '../controllers/game.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', gameController.createGame.bind(gameController));
router.get('/my-games', gameController.getMyGames.bind(gameController));
router.get('/team/:team_id', gameController.getGamesByTeam.bind(gameController));
router.get('/:id', gameController.getGameById.bind(gameController));
router.post('/:id/start', gameController.startGame.bind(gameController));
router.put('/:id/score', gameController.updateScore.bind(gameController));
router.post('/:id/advance-inning', gameController.advanceInning.bind(gameController));
router.post('/:id/end', gameController.endGame.bind(gameController));
router.post('/:id/resume', gameController.resumeGame.bind(gameController));
router.get('/:id/innings', gameController.getGameInnings.bind(gameController));
router.get('/:id/current-inning', gameController.getCurrentInning.bind(gameController));
router.put('/:id/base-runners', gameController.updateBaseRunners.bind(gameController));
router.get('/:id/base-runners', gameController.getBaseRunners.bind(gameController));

export default router;