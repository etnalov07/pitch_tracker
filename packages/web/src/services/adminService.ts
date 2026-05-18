import type {
    AdminListResponse,
    AdminUserListItem,
    AdminUserDetail,
    AdminOrgListItem,
    AdminTeamListItem,
    AdminGameListItem,
    AdminAuditEntry,
} from '../types';
import api from './api';

interface PageParams {
    page?: number;
    page_size?: number;
}

const buildQuery = (params: object): string => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (entries.length === 0) return '';
    const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    return `?${qs}`;
};

export const adminService = {
    listUsers: async (params: PageParams & { search?: string } = {}): Promise<AdminListResponse<AdminUserListItem>> => {
        const response = await api.get<AdminListResponse<AdminUserListItem>>(`/admin/users${buildQuery(params)}`);
        return response.data;
    },
    getUser: async (id: string): Promise<AdminUserDetail> => {
        const response = await api.get<{ user: AdminUserDetail }>(`/admin/users/${id}`);
        return response.data.user;
    },
    listOrgs: async (params: PageParams = {}): Promise<AdminListResponse<AdminOrgListItem>> => {
        const response = await api.get<AdminListResponse<AdminOrgListItem>>(`/admin/orgs${buildQuery(params)}`);
        return response.data;
    },
    listTeams: async (params: PageParams & { organization_id?: string } = {}): Promise<AdminListResponse<AdminTeamListItem>> => {
        const response = await api.get<AdminListResponse<AdminTeamListItem>>(`/admin/teams${buildQuery(params)}`);
        return response.data;
    },
    listGames: async (
        params: PageParams & { team_id?: string; date_from?: string; date_to?: string } = {}
    ): Promise<AdminListResponse<AdminGameListItem>> => {
        const response = await api.get<AdminListResponse<AdminGameListItem>>(`/admin/games${buildQuery(params)}`);
        return response.data;
    },
    listAudit: async (params: PageParams = {}): Promise<AdminListResponse<AdminAuditEntry>> => {
        const response = await api.get<AdminListResponse<AdminAuditEntry>>(`/admin/audit${buildQuery(params)}`);
        return response.data;
    },
    forceVerifyEmail: async (userId: string): Promise<void> => {
        await api.post(`/admin/users/${userId}/force-verify-email`);
    },
    resendVerification: async (userId: string): Promise<void> => {
        await api.post(`/admin/users/${userId}/resend-verification`);
    },
    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/admin/users/${userId}`);
    },
    deleteTeam: async (teamId: string): Promise<void> => {
        await api.delete(`/admin/teams/${teamId}`);
    },
    deleteOrganization: async (orgId: string): Promise<void> => {
        await api.delete(`/admin/organizations/${orgId}`);
    },
};
