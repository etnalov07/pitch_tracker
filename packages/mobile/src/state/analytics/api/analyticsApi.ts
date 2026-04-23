import api from '../../../services/api';
import { HitterTendenciesLive, PitchLocationHeatMap, PitcherTendenciesLive, SprayChartData } from '@pitch-tracker/shared';

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

    getHeatMap: async (batterId: string, pitcherId?: string): Promise<PitchLocationHeatMap> => {
        const params = pitcherId ? `?pitcherId=${pitcherId}` : '';
        const response = await api.get<{ heatMap: PitchLocationHeatMap }>(`/analytics/batter/${batterId}/heat-map${params}`);
        return response.data.heatMap;
    },

    getSprayChart: async (batterId: string, gameId?: string): Promise<SprayChartData[]> => {
        const params = gameId ? `?game_id=${gameId}` : '';
        const response = await api.get<{ sprayChart: SprayChartData[] }>(`/analytics/batter/${batterId}/spray-chart${params}`);
        return response.data.sprayChart ?? [];
    },
};
