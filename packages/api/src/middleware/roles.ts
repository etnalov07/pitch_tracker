import { Response, NextFunction } from 'express';
import { RoleAwareRequest } from '../types';
import { query } from '../config/database';
import { OrgRole, TeamRole } from '../types';

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
 * Middleware factory: require one of the given team roles for a player's owning team.
 * Looks up players.team_id for req.params.id, then delegates to requireTeamRole.
 */
export const requirePlayerTeamRole = (...roles: TeamRole[]) => {
    return async (req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> => {
        const playerId = req.params.id;

        if (!playerId || !req.user) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        try {
            const result = await query('SELECT team_id FROM players WHERE id = $1', [playerId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Player not found' });
                return;
            }

            const teamId = result.rows[0].team_id as string;
            const userRole = req.userRoles?.teamRoles.get(teamId);
            if (userRole && roles.includes(userRole)) {
                next();
                return;
            }

            // Backwards compat: check legacy owner_id
            const teamResult = await query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
            if (teamResult.rows.length > 0 && teamResult.rows[0].owner_id === req.user.id) {
                next();
                return;
            }
        } catch (error) {
            next(error);
            return;
        }

        res.status(403).json({ error: 'Insufficient team permissions' });
    };
};

/**
 * Factory: require one of the given team roles using team_id from the request body.
 * Used by endpoints like POST /invites and POST /players where team_id arrives
 * in the payload instead of the URL. Also honors legacy owner_id on teams and
 * grants access to org owners/admins for org-linked teams (forward-compat for
 * Phase 3 org-admin mode — no-op today since no orgs exist).
 */
export const requireTeamRoleFromBody = (...roles: TeamRole[]) => {
    return async (req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> => {
        const teamId = (req.body?.team_id as string | undefined) || undefined;

        if (!teamId || !req.user) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // team_members role check
        const userRole = req.userRoles?.teamRoles.get(teamId);
        if (userRole && roles.includes(userRole)) {
            next();
            return;
        }

        try {
            const teamResult = await query('SELECT owner_id, organization_id FROM teams WHERE id = $1', [teamId]);
            if (teamResult.rows.length === 0) {
                res.status(404).json({ error: 'Team not found' });
                return;
            }
            const team = teamResult.rows[0] as { owner_id: string; organization_id: string | null };

            // Legacy owner_id
            if (team.owner_id === req.user.id) {
                next();
                return;
            }

            // Org owner/admin on an org-linked team
            if (team.organization_id) {
                const orgRole = req.userRoles?.orgRoles.get(team.organization_id);
                if (orgRole === 'owner' || orgRole === 'admin') {
                    next();
                    return;
                }
            }
        } catch (error) {
            next(error);
            return;
        }

        res.status(403).json({ error: 'Insufficient team permissions' });
    };
};

/**
 * Factory: require one of the given team roles, where the team_id is derived
 * from the join_request row at req.params.id. Used by approval/deny endpoints.
 */
export const requireTeamRoleFromJoinRequest = (...roles: TeamRole[]) => {
    return async (req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> => {
        const joinRequestId = req.params.id;

        if (!joinRequestId || !req.user) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        try {
            const jrResult = await query('SELECT team_id FROM join_requests WHERE id = $1', [joinRequestId]);
            if (jrResult.rows.length === 0) {
                res.status(404).json({ error: 'Join request not found' });
                return;
            }
            const teamId = jrResult.rows[0].team_id as string;

            const userRole = req.userRoles?.teamRoles.get(teamId);
            if (userRole && roles.includes(userRole)) {
                next();
                return;
            }

            const teamResult = await query('SELECT owner_id FROM teams WHERE id = $1', [teamId]);
            if (teamResult.rows.length > 0 && teamResult.rows[0].owner_id === req.user.id) {
                next();
                return;
            }
        } catch (error) {
            next(error);
            return;
        }

        res.status(403).json({ error: 'Insufficient team permissions' });
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

import type { TeamAccessLevel } from '@pitch-tracker/shared';

/**
 * Resolve the user's access level for a team:
 *   'owner'    — team_members.role='owner' OR legacy teams.owner_id=user
 *   'member'   — any team_members role (coach/assistant/player)
 *   'org_view' — not on the team, but a member of the team's organization
 *                (any org role: owner / admin / coach) → read-only access
 *   'none'     — no access
 *
 * Used by both READ middlewares (requireTeamReadAccess) and controllers that
 * need to attach the level to the response payload so clients can gate UI.
 */
export const getTeamAccessLevel = async (userId: string, teamId: string, req?: RoleAwareRequest): Promise<TeamAccessLevel> => {
    // Prefer the preloaded roles on the request (loadUserRoles middleware
    // populates these); fall back to direct lookups when we don't have them.
    const teamRole = req?.userRoles?.teamRoles.get(teamId);
    if (teamRole === 'owner') return 'owner';
    if (teamRole) return 'member';

    try {
        // Legacy owner_id check + look up the team's organization in one query.
        const teamResult = await query('SELECT owner_id, organization_id FROM teams WHERE id = $1', [teamId]);
        if (teamResult.rows.length === 0) return 'none';
        const { owner_id, organization_id } = teamResult.rows[0] as { owner_id: string; organization_id: string | null };
        if (owner_id === userId) return 'owner';

        if (organization_id) {
            const orgRole = req?.userRoles?.orgRoles.get(organization_id);
            if (orgRole) return 'org_view';
            // Defensive fallback in case loadUserRoles hasn't populated the request.
            const orgResult = await query(
                'SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1',
                [organization_id, userId]
            );
            if (orgResult.rows.length > 0) return 'org_view';
        }
    } catch {
        // Fall through to 'none'
    }
    return 'none';
};

/**
 * Middleware: require READ access to a team — team member OR org member.
 * Reads team_id from req.params.id or req.params.team_id. Attaches the
 * resolved access level to req.teamAccessLevel for downstream use.
 *
 * For write operations, continue using requireTeamRole(...specific roles...).
 */
export const requireTeamReadAccess = async (req: RoleAwareRequest, res: Response, next: NextFunction): Promise<void> => {
    const teamId = (req.params.id || req.params.team_id) as string;
    if (!teamId || !req.user) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    const level = await getTeamAccessLevel(req.user.id, teamId, req);
    if (level === 'none') {
        res.status(403).json({ error: 'No access to this team' });
        return;
    }
    req.teamAccessLevel = level;
    next();
};
