import api from '../../../services/api';
import { Team, Player, PlayerWithPitchTypes } from '@pitch-tracker/shared';

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

    // Player operations
    getTeamPlayers: async (teamId: string): Promise<PlayerWithPitchTypes[]> => {
        const response = await api.get<{ team: { players: PlayerWithPitchTypes[] } }>(`/teams/${teamId}/players`);
        return response.data.team.players || [];
    },

    addPlayer: async (teamId: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.post<{ player: Player }>(`/teams/${teamId}/players`, playerData);
        return response.data.player;
    },

    updatePlayer: async (playerId: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.put<{ player: Player }>(`/players/${playerId}`, playerData);
        return response.data.player;
    },

    deletePlayer: async (playerId: string): Promise<void> => {
        await api.delete(`/players/${playerId}`);
    },
};
