import api from '../../../services/api';
import { HitterTendenciesLive, PitchLocationHeatMap, PitcherTendenciesLive, SprayChart } from '@pitch-tracker/shared';

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
        const params = pitcherId ? `?pitcher_id=${pitcherId}` : '';
        const response = await api.get<{ heatmap: PitchLocationHeatMap }>(`/analytics/batter/${batterId}/heat-map${params}`);
        return response.data.heatmap;
    },

    getSprayChart: async (batterId: string, gameId?: string): Promise<SprayChart> => {
        const params = gameId ? `?game_id=${gameId}` : '';
        const response = await api.get<{ spray_chart: SprayChart }>(`/analytics/batter/${batterId}/spray-chart${params}`);
        return response.data.spray_chart;
    },
};
