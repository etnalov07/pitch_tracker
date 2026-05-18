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
router.get('/auth-events', adminController.listAuthEvents.bind(adminController));

router.post('/users/:id/force-verify-email', adminController.forceVerifyEmail.bind(adminController));
router.post('/users/:id/resend-verification', adminController.resendVerification.bind(adminController));
router.post('/users/:id/set-registration-type', adminController.setRegistrationType.bind(adminController));
router.post('/users/:id/send-password-reset', adminController.sendPasswordReset.bind(adminController));
router.post('/users/:id/unlock', adminController.unlockUser.bind(adminController));

router.delete('/users/:id', adminController.deleteUser.bind(adminController));
router.delete('/teams/:id', adminController.deleteTeam.bind(adminController));
router.delete('/organizations/:id', adminController.deleteOrganization.bind(adminController));

export default router;
