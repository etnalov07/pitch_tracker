import api from '../../../services/api';
import { PitcherTendenciesLive, HitterTendenciesLive } from '@pitch-tracker/shared';

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
};
