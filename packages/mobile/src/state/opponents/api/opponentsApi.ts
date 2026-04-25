import {
    CreateOpponentTeamParams,
    OpponentPitcherProfile,
    OpponentPitcherTendencies,
    OpponentTeam,
    OpponentTeamWithRoster,
} from '@pitch-tracker/shared';
import api from '../../../services/api';

export const opponentsApi = {
    list: async (teamId: string): Promise<OpponentTeam[]> => {
        const res = await api.get<{ opponents: OpponentTeam[] }>(`/teams/${teamId}/opponents`);
        return res.data.opponents;
    },

    getById: async (teamId: string, id: string): Promise<OpponentTeamWithRoster> => {
        const res = await api.get<{ opponent: OpponentTeamWithRoster }>(`/teams/${teamId}/opponents/${id}`);
        return res.data.opponent;
    },

    create: async (teamId: string, params: CreateOpponentTeamParams): Promise<OpponentTeam> => {
        const res = await api.post<{ opponent: OpponentTeam }>(`/teams/${teamId}/opponents`, params);
        return res.data.opponent;
    },

    update: async (teamId: string, id: string, params: Partial<CreateOpponentTeamParams>): Promise<OpponentTeam> => {
        const res = await api.put<{ opponent: OpponentTeam }>(`/teams/${teamId}/opponents/${id}`, params);
        return res.data.opponent;
    },

    linkGame: async (teamId: string, id: string, gameId: string): Promise<void> => {
        await api.post(`/teams/${teamId}/opponents/${id}/link-game`, { game_id: gameId });
    },

    getPitcherProfile: async (
        profileId: string
    ): Promise<{ pitcher: OpponentPitcherProfile; tendencies: OpponentPitcherTendencies | null }> => {
        const res = await api.get<{ pitcher: OpponentPitcherProfile; tendencies: OpponentPitcherTendencies | null }>(
            `/opponent-pitcher-profiles/${profileId}`
        );
        return res.data;
    },

    recalculateTendencies: async (profileId: string): Promise<OpponentPitcherTendencies> => {
        const res = await api.post<{ tendencies: OpponentPitcherTendencies }>(
            `/opponent-pitcher-profiles/${profileId}/recalculate`
        );
        return res.data.tendencies;
    },
};

export default opponentsApi;
