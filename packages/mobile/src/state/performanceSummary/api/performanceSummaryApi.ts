import api from '../../../services/api';
import { PerformanceSummary, SummarySourceType } from '@pitch-tracker/shared';

export const performanceSummaryApi = {
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
};
