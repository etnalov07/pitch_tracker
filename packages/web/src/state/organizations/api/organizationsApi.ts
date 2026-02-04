import api from '../../../services/api';
import { Organization, OrganizationWithTeams, OrganizationMember } from '../../../types';

export const organizationsApi = {
    getMyOrganizations: async (): Promise<Organization[]> => {
        const response = await api.get<{ organizations: Organization[] }>('/organizations');
        return response.data.organizations;
    },

    getOrganizationById: async (orgId: string): Promise<OrganizationWithTeams> => {
        const response = await api.get<OrganizationWithTeams>(`/organizations/${orgId}`);
        return response.data;
    },

    createOrganization: async (data: { name: string; description?: string }): Promise<Organization> => {
        const response = await api.post<Organization>('/organizations', data);
        return response.data;
    },

    updateOrganization: async (orgId: string, data: Partial<Organization>): Promise<Organization> => {
        const response = await api.put<Organization>(`/organizations/${orgId}`, data);
        return response.data;
    },

    deleteOrganization: async (orgId: string): Promise<void> => {
        await api.delete(`/organizations/${orgId}`);
    },

    getMembers: async (orgId: string): Promise<OrganizationMember[]> => {
        const response = await api.get<{ members: OrganizationMember[] }>(`/organizations/${orgId}/members`);
        return response.data.members;
    },

    addMember: async (orgId: string, email: string, role: string): Promise<OrganizationMember> => {
        const response = await api.post<OrganizationMember>(`/organizations/${orgId}/members`, { email, role });
        return response.data;
    },

    removeMember: async (orgId: string, memberId: string): Promise<void> => {
        await api.delete(`/organizations/${orgId}/members/${memberId}`);
    },

    addTeamToOrg: async (orgId: string, teamId: string): Promise<void> => {
        await api.post(`/organizations/${orgId}/teams`, { team_id: teamId });
    },
};
