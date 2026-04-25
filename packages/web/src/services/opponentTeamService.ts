import {
    CreateOpponentTeamParams,
    OpponentPitcherProfile,
    OpponentPitcherTendencies,
    OpponentTeam,
    OpponentTeamWithRoster,
} from '../types';
import api from './api';

export const opponentTeamService = {
    list: async (teamId: string): Promise<OpponentTeam[]> => {
        const response = await api.get<{ opponents: OpponentTeam[] }>(`/teams/${teamId}/opponents`);
        return response.data.opponents;
    },

    getById: async (teamId: string, id: string): Promise<OpponentTeamWithRoster> => {
        const response = await api.get<{ opponent: OpponentTeamWithRoster }>(`/teams/${teamId}/opponents/${id}`);
        return response.data.opponent;
    },

    create: async (teamId: string, params: CreateOpponentTeamParams): Promise<OpponentTeam> => {
        const response = await api.post<{ opponent: OpponentTeam }>(`/teams/${teamId}/opponents`, params);
        return response.data.opponent;
    },

    update: async (teamId: string, id: string, params: Partial<CreateOpponentTeamParams>): Promise<OpponentTeam> => {
        const response = await api.put<{ opponent: OpponentTeam }>(`/teams/${teamId}/opponents/${id}`, params);
        return response.data.opponent;
    },

    linkGame: async (teamId: string, id: string, gameId: string): Promise<void> => {
        await api.post(`/teams/${teamId}/opponents/${id}/link-game`, { game_id: gameId });
    },

    delete: async (teamId: string, id: string): Promise<void> => {
        await api.delete(`/teams/${teamId}/opponents/${id}`);
    },
};

export const opponentPitcherProfileService = {
    getByOpponentTeam: async (opponentTeamId: string): Promise<OpponentPitcherProfile[]> => {
        const response = await api.get<{ pitchers: OpponentPitcherProfile[] }>(
            `/opponent-pitcher-profiles/opponent-team/${opponentTeamId}`
        );
        return response.data.pitchers;
    },

    getById: async (id: string): Promise<{ pitcher: OpponentPitcherProfile; tendencies: OpponentPitcherTendencies | null }> => {
        const response = await api.get<{ pitcher: OpponentPitcherProfile; tendencies: OpponentPitcherTendencies | null }>(
            `/opponent-pitcher-profiles/${id}`
        );
        return response.data;
    },

    recalculate: async (id: string): Promise<OpponentPitcherTendencies> => {
        const response = await api.post<{ tendencies: OpponentPitcherTendencies }>(`/opponent-pitcher-profiles/${id}/recalculate`);
        return response.data.tendencies;
    },

    linkOpposingPitcher: async (profileId: string, opposingPitcherId: string): Promise<void> => {
        await api.post(`/opponent-pitcher-profiles/${profileId}/link-opposing-pitcher`, {
            opposing_pitcher_id: opposingPitcherId,
        });
    },
};
