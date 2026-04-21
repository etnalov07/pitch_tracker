import { PerformanceSummary, SummarySourceType, BatterBreakdown } from '@pitch-tracker/shared';
import api from './api';

export const performanceSummaryService = {
    getSummary: async (sourceType: SummarySourceType, sourceId: string): Promise<PerformanceSummary> => {
        const response = await api.get<{ summary: PerformanceSummary }>(`/performance-summaries/${sourceType}/${sourceId}`);
        return response.data.summary;
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
};
