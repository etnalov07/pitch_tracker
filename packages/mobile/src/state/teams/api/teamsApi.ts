import api from '../../../services/api';
import { Team, TeamAccessLevel, Player, PlayerWithPitchTypes } from '@pitch-tracker/shared';

export const teamsApi = {
    getAllTeams: async (): Promise<Team[]> => {
        const response = await api.get<{ teams: Team[] }>('/teams');
        return response.data.teams;
    },

    // Returns the team + the caller's access level. UI uses access_level to
    // gate write affordances when the user has org_view (org member, not on
    // the team).
    getTeamById: async (id: string): Promise<{ team: Team; access_level: TeamAccessLevel }> => {
        const response = await api.get<{ team: Team; access_level: TeamAccessLevel }>(`/teams/${id}`);
        return { team: response.data.team, access_level: response.data.access_level };
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
        const response = await api.post<{ player: Player }>('/players', { ...playerData, team_id: teamId });
        return response.data.player;
    },

    updatePlayer: async (playerId: string, playerData: Partial<Player>): Promise<Player> => {
        const response = await api.put<{ player: Player }>(`/players/${playerId}`, playerData);
        return response.data.player;
    },

    deletePlayer: async (playerId: string): Promise<void> => {
        await api.delete(`/players/${playerId}`);
    },

    getPitchTypes: async (playerId: string): Promise<string[]> => {
        const response = await api.get<{ pitch_types: string[] }>(`/players/${playerId}/pitch-types`);
        return response.data.pitch_types || [];
    },

    setPitchTypes: async (playerId: string, pitchTypes: string[]): Promise<string[]> => {
        const response = await api.put<{ pitch_types: string[] }>(`/players/${playerId}/pitch-types`, {
            pitch_types: pitchTypes,
        });
        return response.data.pitch_types || pitchTypes;
    },
};
