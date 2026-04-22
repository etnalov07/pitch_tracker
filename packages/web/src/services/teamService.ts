import { Team, Player, RosterImportRow, RosterImportResult } from '../types';
import api from './api';

export const teamService = {
    // Get all teams for current user
    getAllTeams: async (): Promise<Team[]> => {
        const response = await api.get<Team[]>('/teams');
        return response.data;
    },

    // Get team by ID
    getTeamById: async (id: string): Promise<Team> => {
        const response = await api.get<Team>(`/teams/${id}`);
        return response.data;
    },

    // Create new team
    createTeam: async (teamData: Partial<Team>): Promise<Team> => {
        const response = await api.post<Team>('/teams', teamData);
        return response.data;
    },

    // Update team
    updateTeam: async (id: string, teamData: Partial<Team>): Promise<Team> => {
        const response = await api.put<Team>(`/teams/${id}`, teamData);
        return response.data;
    },

    // Delete team
    deleteTeam: async (id: string): Promise<void> => {
        await api.delete(`/teams/${id}`);
    },

    // Get team roster (players)
    getTeamRoster: async (team_id: string): Promise<Player[]> => {
        const response = await api.get<{ players: Player[] }>(`/teams/${team_id}/players`);
        return response.data.players ?? [];
    },

    // Add player to team
    addPlayer: async (team_id: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.post<Player>(`/players`, { ...playerData, team_id });
        return response.data;
    },

    // Update player
    updatePlayer: async (player_id: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.put<Player>(`/players/${player_id}`, playerData);
        return response.data;
    },

    // Delete player
    deletePlayer: async (player_id: string): Promise<void> => {
        await api.delete(`/players/${player_id}`);
    },

    // Import roster from parsed rows
    importRoster: async (team_id: string, players: RosterImportRow[], mode: 'merge' | 'replace'): Promise<RosterImportResult> => {
        const response = await api.post<{ result: RosterImportResult }>(`/players/team/${team_id}/import`, { players, mode });
        return response.data.result;
    },
};
