import {
    BatterScoutingProfile,
    CreateBatterScoutingProfileParams,
    CreateOpponentPitcherProfileParams,
    CreateOpponentTeamParams,
    OpponentPitcherProfile,
    OpponentPitcherTendencies,
    OpponentTeam,
    OpponentTeamWithRoster,
    UpdateBatterScoutingProfileParams,
    UpdateOpponentPitcherProfileParams,
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

    createPitcher: async (opponentTeamId: string, params: CreateOpponentPitcherProfileParams): Promise<OpponentPitcherProfile> => {
        const res = await api.post<{ pitcher: OpponentPitcherProfile }>(
            `/opponent-pitcher-profiles/opponent-team/${opponentTeamId}`,
            params
        );
        return res.data.pitcher;
    },

    updatePitcher: async (id: string, params: UpdateOpponentPitcherProfileParams): Promise<OpponentPitcherProfile> => {
        const res = await api.patch<{ pitcher: OpponentPitcherProfile }>(`/opponent-pitcher-profiles/${id}`, params);
        return res.data.pitcher;
    },

    deletePitcher: async (id: string): Promise<void> => {
        await api.delete(`/opponent-pitcher-profiles/${id}`);
    },

    createBatter: async (opponentTeamId: string, params: CreateBatterScoutingProfileParams): Promise<BatterScoutingProfile> => {
        const res = await api.post<{ batter: BatterScoutingProfile }>(
            `/opponent-batter-profiles/opponent-team/${opponentTeamId}`,
            params
        );
        return res.data.batter;
    },

    updateBatter: async (id: string, params: UpdateBatterScoutingProfileParams): Promise<BatterScoutingProfile> => {
        const res = await api.patch<{ batter: BatterScoutingProfile }>(`/opponent-batter-profiles/${id}`, params);
        return res.data.batter;
    },

    deleteBatter: async (id: string): Promise<void> => {
        await api.delete(`/opponent-batter-profiles/${id}`);
    },
};

export default opponentsApi;
