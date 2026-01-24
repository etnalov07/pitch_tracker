import api from '../../../services/api';
import { Team, Player, TeamWithPlayers } from '../../../types';

export const teamsApi = {
    getAllTeams: async (): Promise<Team[]> => {
        const response = await api.get<{ teams: Team[] }>('/teams');
        return response.data.teams;
    },

    getTeamById: async (id: string): Promise<Team> => {
        const response = await api.get<{ team: Team }>(`/teams/${id}`);
        return response.data.team;
    },

    createTeam: async (teamData: Partial<Team>): Promise<Team> => {
        const response = await api.post<{ team: Team }>('/teams', teamData);
        return response.data.team;
    },

    updateTeam: async (id: string, teamData: Partial<Team>): Promise<Team> => {
        const response = await api.put<{ team: Team }>(`/teams/${id}`, teamData);
        return response.data.team;
    },

    deleteTeam: async (id: string): Promise<void> => {
        await api.delete(`/teams/${id}`);
    },

    getTeamRoster: async (team_id: string): Promise<TeamWithPlayers> => {
        const response = await api.get<{ team: TeamWithPlayers }>(`/teams/${team_id}/players`);
        return response.data.team;
    },

    addPlayer: async (team_id: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.post<{ player: Player }>('/players', { ...playerData, team_id });
        return response.data.player;
    },

    updatePlayer: async (player_id: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.put<{ player: Player }>(`/players/${player_id}`, playerData);
        return response.data.player;
    },

    deletePlayer: async (player_id: string): Promise<void> => {
        await api.delete(`/players/${player_id}`);
    },

    uploadLogo: async (teamId: string, file: File): Promise<Team> => {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await api.post<{ team: Team }>(`/teams/${teamId}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.team;
    },

    updateColors: async (
        teamId: string,
        colors: { primary_color?: string; secondary_color?: string; accent_color?: string }
    ): Promise<Team> => {
        const response = await api.put<{ team: Team }>(`/teams/${teamId}/colors`, colors);
        return response.data.team;
    },

    deleteLogo: async (teamId: string): Promise<Team> => {
        const response = await api.delete<{ team: Team }>(`/teams/${teamId}/logo`);
        return response.data.team;
    },
};
