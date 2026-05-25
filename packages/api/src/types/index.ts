import { Request } from 'express';
import type { OrgRole, TeamAccessLevel, TeamRole } from '@pitch-tracker/shared';

// Re-export shared types only (type-only export — no runtime require of @pitch-tracker/shared)
export type * from '@pitch-tracker/shared';

// API-specific types that extend or differ from shared types

// User with password hash (internal use only, not exported from shared)
export interface UserWithPassword {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    created_at: Date;
    updated_at: Date;
}

export interface UserResponse {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: Date;
    registration_type?: 'coach' | 'player' | 'org_admin' | null;
    is_super_admin?: boolean;
}

// Express Request with authenticated user
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

// Request with loaded role information
export interface UserRoles {
    teamRoles: Map<string, TeamRole>;
    orgRoles: Map<string, OrgRole>;
}

export interface RoleAwareRequest extends AuthRequest {
    userRoles?: UserRoles;
    // Set by requireTeamReadAccess so controllers can return access_level on
    // the response payload without re-resolving it.
    teamAccessLevel?: TeamAccessLevel;
}
