import { Response, NextFunction } from 'express';
import { RoleAwareRequest } from '../types';
import organizationService from '../services/organization.service';

export class OrganizationController {
    async create(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const org = await organizationService.createOrganization(req.user!.id, req.body);
            res.status(201).json(org);
        } catch (error) {
            next(error);
        }
    }

    async list(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const orgs = await organizationService.getOrganizationsByUser(req.user!.id);
            res.json({ organizations: orgs });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const org = await organizationService.getOrganizationWithTeams(req.params.org_id as string);
            if (!org) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }
            res.json(org);
        } catch (error) {
            next(error);
        }
    }

    async update(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const org = await organizationService.updateOrganization(req.params.org_id as string, req.body);
            res.json(org);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await organizationService.deleteOrganization(req.params.org_id as string);
            res.json({ message: 'Organization deleted' });
        } catch (error) {
            next(error);
        }
    }

    async getTeams(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const teams = await organizationService.getTeamsByOrganization(req.params.org_id as string);
            res.json({ teams });
        } catch (error) {
            next(error);
        }
    }

    async getMembers(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const members = await organizationService.getMembers(req.params.org_id as string);
            res.json({ members });
        } catch (error) {
            next(error);
        }
    }

    async addMember(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, role } = req.body;
            if (!email) {
                res.status(400).json({ error: 'Email is required' });
                return;
            }
            const member = await organizationService.addMemberByEmail(req.params.org_id as string, email, role);
            res.status(201).json(member);
        } catch (error) {
            next(error);
        }
    }

    async removeMember(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            await organizationService.removeMember(req.params.member_id as string);
            res.json({ message: 'Member removed' });
        } catch (error) {
            next(error);
        }
    }

    async addTeam(req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { team_id } = req.body;
            if (!team_id) {
                res.status(400).json({ error: 'team_id is required' });
                return;
            }
            await organizationService.addTeamToOrganization(req.params.org_id as string, team_id);
            res.json({ message: 'Team added to organization' });
        } catch (error) {
            next(error);
        }
    }
}

export default new OrganizationController();
