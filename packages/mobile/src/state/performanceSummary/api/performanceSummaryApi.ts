import api from '../../../services/api';
import { PerformanceSummary, SummarySourceType, BatterBreakdown } from '@pitch-tracker/shared';

export const performanceSummaryApi = {
    getSummary: async (sourceType: SummarySourceType, sourceId: string): Promise<PerformanceSummary | null> => {
        try {
            const response = await api.get<{ summary: PerformanceSummary }>(`/performance-summaries/${sourceType}/${sourceId}`);
            return response.data.summary;
        } catch (err: any) {
            if (err?.response?.status === 404) return null;
            throw err;
        }
    },

    getPitcherSummaries: async (
        pitcherId: string,
        limit = 20,
        offset = 0
    ): Promise<{ summaries: PerformanceSummary[]; total_count: number }> => {
        const response = await api.get<{ summaries: PerformanceSummary[]; total_count: number }>(
            `/performance-summaries/pitcher/${pitcherId}`,
            { params: { limit, offset } }
        );
        return response.data;
    },

    regenerateNarrative: async (id: string): Promise<PerformanceSummary> => {
        const response = await api.post<{ summary: PerformanceSummary }>(`/performance-summaries/${id}/regenerate-narrative`);
        return response.data.summary;
    },

    getBatterBreakdown: async (gameId: string): Promise<BatterBreakdown[]> => {
        const response = await api.get<{ breakdown: BatterBreakdown[] }>(`/performance-summaries/game/${gameId}/batter-breakdown`);
        return response.data.breakdown;
    },

    getMyTeamBatterBreakdown: async (gameId: string): Promise<BatterBreakdown[]> => {
        const response = await api.get<{ breakdown: BatterBreakdown[] }>(
            `/performance-summaries/game/${gameId}/my-team-batter-breakdown`
        );
        return response.data.breakdown;
    },
};
