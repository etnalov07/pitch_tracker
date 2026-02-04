import api from '../../../services/api';
import { Invite, Team, JoinRequest } from '@pitch-tracker/shared';

export const invitesApi = {
    createInvite: async (data: {
        team_id: string;
        player_id?: string;
        role?: string;
    }): Promise<Invite> => {
        const response = await api.post<Invite>('/invites', data);
        return response.data;
    },

    getInvitesByTeam: async (teamId: string): Promise<Invite[]> => {
        const response = await api.get<{ invites: Invite[] }>(`/invites/team/${teamId}`);
        return response.data.invites;
    },

    getInviteByToken: async (token: string): Promise<Invite> => {
        const response = await api.get<Invite>(`/invites/token/${token}`);
        return response.data;
    },

    acceptInvite: async (token: string): Promise<{ message: string; team_id: string }> => {
        const response = await api.post<{ message: string; team_id: string }>(`/invites/token/${token}/accept`);
        return response.data;
    },

    revokeInvite: async (inviteId: string): Promise<void> => {
        await api.put(`/invites/${inviteId}/revoke`);
    },

    searchTeams: async (query: string): Promise<Team[]> => {
        const response = await api.get<{ teams: Team[] }>(`/teams/search?q=${encodeURIComponent(query)}`);
        return response.data.teams;
    },

    createJoinRequest: async (data: { team_id: string; message?: string }): Promise<JoinRequest> => {
        const response = await api.post<JoinRequest>('/join-requests', data);
        return response.data;
    },

    getMyJoinRequests: async (): Promise<JoinRequest[]> => {
        const response = await api.get<{ requests: JoinRequest[] }>('/join-requests/my');
        return response.data.requests;
    },

    getTeamJoinRequests: async (teamId: string): Promise<JoinRequest[]> => {
        const response = await api.get<{ requests: JoinRequest[] }>(`/teams/${teamId}/join-requests`);
        return response.data.requests;
    },

    approveJoinRequest: async (requestId: string, linkedPlayerId?: string): Promise<void> => {
        await api.put(`/join-requests/${requestId}/approve`, { linked_player_id: linkedPlayerId });
    },

    denyJoinRequest: async (requestId: string): Promise<void> => {
        await api.put(`/join-requests/${requestId}/deny`);
    },
};
