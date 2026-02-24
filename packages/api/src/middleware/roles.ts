import { Response, NextFunction } from 'express';
import { RoleAwareRequest } from '../types';
import { query } from '../config/database';
import { TeamRole, OrgRole } from '@pitch-tracker/shared';

/**
 * Middleware: load user's team and org roles from DB, attach to request.
 * Must run after authenticateToken.
 */
export const loadUserRoles = async (req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
        next();
        return;
    }

    try {
        const [teamResult, orgResult] = await Promise.all([
            query('SELECT team_id, role FROM team_members WHERE user_id = $1', [req.user.id]),
            query('SELECT organization_id, role FROM organization_members WHERE user_id = $1', [req.user.id]),
        ]);

        const teamRoles = new Map<string, TeamRole>();
        teamResult.rows.forEach((r: { team_id: string; role: TeamRole }) => teamRoles.set(r.team_id, r.role));

        const orgRoles = new Map<string, OrgRole>();
        orgResult.rows.forEach((r: { organization_id: string; role: OrgRole }) => orgRoles.set(r.organization_id, r.role));

        req.userRoles = { teamRoles, orgRoles };
        next();
    } catch (error) {
        console.error('Error loading user roles:', error);
        next(error);
    }
};

/**
 * Factory: require one of the given roles for a team.
 * Reads team_id from req.params.id or req.params.team_id.
 * Also grants access if user is the legacy owner_id on the team.
 */
export const requireTeamRole = (...roles: TeamRole[]) => {
    return async (req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> => {
        const teamId = (req.params.id || req.params.team_id) as string;

        if (!teamId || !req.user) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Check team_members role
        const userRole = req.userRoles?.teamRoles.get(teamId);
        if (userRole && roles.includes(userRole)) {
            next();
            return;
        }

        // Backwards compat: check legacy owner_id
        try {
            const result = await query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
            if (result.rows.length > 0 && result.rows[0].owner_id === req.user.id) {
                next();
                return;
            }
        } catch {
            // Fall through to forbidden
        }

        res.status(403).json({ error: 'Insufficient team permissions' });
    };
};

/**
 * Factory: require one of the given roles for an organization.
 * Reads org_id from req.params.org_id.
 */
export const requireOrgRole = (...roles: OrgRole[]) => {
    return (req: RoleAwareRequest, res: Response, next: NextFunction): void => {
        const orgId = req.params.org_id as string;

        if (!orgId || !req.user) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const userRole = req.userRoles?.orgRoles.get(orgId);
        if (userRole && roles.includes(userRole)) {
            next();
            return;
        }

        res.status(403).json({ error: 'Insufficient organization permissions' });
    };
};

/**
 * Middleware: require the user to be a member of the specified org (any role).
 */
export const requireOrgMember = (req: RoleAwareRequest, res: Response, next: NextFunction): void => {
    const orgId = req.params.org_id as string;

    if (!orgId || !req.user) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    if (req.userRoles?.orgRoles.has(orgId)) {
        next();
        return;
    }

    res.status(403).json({ error: 'Not a member of this organization' });
};
