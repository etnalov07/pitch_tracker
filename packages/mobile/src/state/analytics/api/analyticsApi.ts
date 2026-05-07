import api from '../../../services/api';
import { HitterTendenciesLive, PitchLocationData, PitcherTendenciesLive, SprayChartData } from '@pitch-tracker/shared';

export const analyticsApi = {
    getPitcherLiveTendencies: async (pitcherId: string, batterHand: 'L' | 'R'): Promise<PitcherTendenciesLive> => {
        const response = await api.get<{ tendencies: PitcherTendenciesLive }>(
            `/analytics/pitcher/${pitcherId}/tendencies-live?batter_hand=${batterHand}`
        );
        return response.data.tendencies;
    },

    getHitterLiveTendencies: async (batterId: string, batterType: 'team' | 'opponent'): Promise<HitterTendenciesLive> => {
        const response = await api.get<{ tendencies: HitterTendenciesLive }>(
            `/analytics/hitter/${batterId}/tendencies-live?batter_type=${batterType}`
        );
        return response.data.tendencies;
    },

    getPitchLocations: async (
        batterId: string,
        pitcherId?: string,
        opponentTeamId?: string,
        opponentName?: string
    ): Promise<PitchLocationData[]> => {
        const qs = new URLSearchParams();
        if (pitcherId) qs.append('pitcherId', pitcherId);
        if (opponentTeamId) qs.append('opponentTeamId', opponentTeamId);
        if (opponentName) qs.append('opponentName', opponentName);
        const params = qs.toString() ? `?${qs.toString()}` : '';
        const response = await api.get<{ pitches: PitchLocationData[] }>(`/analytics/batter/${batterId}/pitch-locations${params}`);
        return response.data.pitches ?? [];
    },

    getSprayChart: async (
        batterId: string,
        gameId?: string,
        opponentTeamId?: string,
        opponentName?: string
    ): Promise<SprayChartData[]> => {
        const qs = new URLSearchParams();
        if (gameId) qs.append('game_id', gameId);
        if (opponentTeamId) qs.append('opponentTeamId', opponentTeamId);
        if (opponentName) qs.append('opponentName', opponentName);
        const params = qs.toString() ? `?${qs.toString()}` : '';
        const response = await api.get<{ sprayChart: SprayChartData[] }>(`/analytics/batter/${batterId}/spray-chart${params}`);
        return response.data.sprayChart ?? [];
    },
};
