import { Request } from 'express';
import { TeamRole, OrgRole } from '@pitch-tracker/shared';

// Re-export shared types
export * from '@pitch-tracker/shared';

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
}
