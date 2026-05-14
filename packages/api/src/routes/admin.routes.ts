import { Router } from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import adminController from '../controllers/admin.controller';

const router = Router();

// Every admin route requires authenticated user on the super-admin email allowlist.
router.use(authenticateToken, requireSuperAdmin);

router.get('/users', adminController.listUsers.bind(adminController));
router.get('/users/:id', adminController.getUser.bind(adminController));
router.get('/orgs', adminController.listOrgs.bind(adminController));
router.get('/teams', adminController.listTeams.bind(adminController));
router.get('/games', adminController.listGames.bind(adminController));
router.get('/audit', adminController.listAudit.bind(adminController));

router.post('/users/:id/force-verify-email', adminController.forceVerifyEmail.bind(adminController));
router.post('/users/:id/resend-verification', adminController.resendVerification.bind(adminController));

export default router;
