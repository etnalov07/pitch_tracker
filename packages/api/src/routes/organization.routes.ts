import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loadUserRoles, requireOrgRole, requireOrgMember } from '../middleware/roles';
import organizationController from '../controllers/organization.controller';

const router = Router();

// All org routes require authentication + role loading
router.use(authenticateToken, loadUserRoles);

// Create organization
router.post('/', organizationController.create.bind(organizationController));

// List user's organizations
router.get('/', organizationController.list.bind(organizationController));

// Get organization by ID (requires membership)
router.get('/:org_id', requireOrgMember, organizationController.getById.bind(organizationController));

// Update organization (requires admin/owner)
router.put('/:org_id', requireOrgRole('owner', 'admin'), organizationController.update.bind(organizationController));

// Delete organization (requires owner)
router.delete('/:org_id', requireOrgRole('owner'), organizationController.delete.bind(organizationController));

// Get teams in organization
router.get('/:org_id/teams', requireOrgMember, organizationController.getTeams.bind(organizationController));

// Add team to organization
router.post('/:org_id/teams', requireOrgRole('owner', 'admin'), organizationController.addTeam.bind(organizationController));

// Get members
router.get('/:org_id/members', requireOrgMember, organizationController.getMembers.bind(organizationController));

// Add member (by email)
router.post('/:org_id/members', requireOrgRole('owner', 'admin'), organizationController.addMember.bind(organizationController));

// Remove member
router.delete(
    '/:org_id/members/:member_id',
    requireOrgRole('owner', 'admin'),
    organizationController.removeMember.bind(organizationController)
);

export default router;
