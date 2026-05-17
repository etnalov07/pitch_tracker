import type { Organization, OrganizationMember, OrganizationWithTeams, OrgRole, Team } from '../types';
import api from './api';

// An org as returned by GET /organizations — the membership join decorates
// each row with the caller's role.
export type MyOrganization = Organization & { user_role?: OrgRole };

// A team as returned by GET /organizations/:id/teams — decorated with a count.
export type OrgTeam = Team & { player_count?: number };

export const organizationService = {
    // Orgs the current user belongs to
    listMine: async (): Promise<MyOrganization[]> => {
        const response = await api.get<{ organizations: MyOrganization[] }>('/organizations');
        return response.data.organizations;
    },

    // Create an organization — the creator becomes its owner server-side
    create: async (name: string, description?: string): Promise<Organization> => {
        const response = await api.post<Organization>('/organizations', { name, description });
        return response.data;
    },

    // Org detail with its teams + member count
    getWithTeams: async (orgId: string): Promise<OrganizationWithTeams> => {
        const response = await api.get<OrganizationWithTeams>(`/organizations/${orgId}`);
        return response.data;
    },

    // Teams in an org, each with an active-player count
    getTeams: async (orgId: string): Promise<OrgTeam[]> => {
        const response = await api.get<{ teams: OrgTeam[] }>(`/organizations/${orgId}/teams`);
        return response.data.teams;
    },

    // Org members with their org role
    getMembers: async (orgId: string): Promise<OrganizationMember[]> => {
        const response = await api.get<{ members: OrganizationMember[] }>(`/organizations/${orgId}/members`);
        return response.data.members;
    },

    // Add a member by email (owner/admin only — server enforces)
    addMember: async (orgId: string, email: string, role: OrgRole): Promise<OrganizationMember> => {
        const response = await api.post<OrganizationMember>(`/organizations/${orgId}/members`, { email, role });
        return response.data;
    },

    // Remove a member (owner/admin only — server blocks removing the last owner)
    removeMember: async (orgId: string, memberId: string): Promise<void> => {
        await api.delete(`/organizations/${orgId}/members/${memberId}`);
    },

    // Rename an organization (owner/admin only)
    rename: async (orgId: string, name: string): Promise<Organization> => {
        const response = await api.put<Organization>(`/organizations/${orgId}`, { name });
        return response.data;
    },
};
