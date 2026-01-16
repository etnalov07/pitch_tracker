import api from '../../../services/api';
import { Team, Player } from '../../../types';

export const teamsApi = {
    getAllTeams: async (): Promise<Team[]> => {
        const response = await api.get<Team[]>('/teams');
        return response.data;
    },

    getTeamById: async (id: string): Promise<Team> => {
        const response = await api.get<Team>(`/teams/${id}`);
        return response.data;
    },

    createTeam: async (teamData: Partial<Team>): Promise<Team> => {
        const response = await api.post<Team>('/teams', teamData);
        return response.data;
    },

    updateTeam: async (id: string, teamData: Partial<Team>): Promise<Team> => {
        const response = await api.put<Team>(`/teams/${id}`, teamData);
        return response.data;
    },

    deleteTeam: async (id: string): Promise<void> => {
        await api.delete(`/teams/${id}`);
    },

    getTeamRoster: async (teamId: string): Promise<Player[]> => {
        const response = await api.get<Player[]>(`/teams/${teamId}/players`);
        return response.data;
    },

    addPlayer: async (teamId: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.post<Player>('/players', { ...playerData, teamId });
        return response.data;
    },

    updatePlayer: async (playerId: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.put<Player>(`/players/${playerId}`, playerData);
        return response.data;
    },

    deletePlayer: async (playerId: string): Promise<void> => {
        await api.delete(`/players/${playerId}`);
    },
};
