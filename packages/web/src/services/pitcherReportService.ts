import type { PitcherReportPayload, PitcherReportWindow } from '@pitch-tracker/shared';
import api from './api';

export const pitcherReportService = {
    getReport: async (pitcherId: string, window: PitcherReportWindow): Promise<PitcherReportPayload> => {
        const response = await api.get<PitcherReportPayload>(`/analytics/pitcher/${pitcherId}/report?window=${window}`);
        return response.data;
    },

    regenerateNarrative: async (pitcherId: string, window: PitcherReportWindow): Promise<PitcherReportPayload> => {
        const response = await api.post<PitcherReportPayload>(
            `/analytics/pitcher/${pitcherId}/report/${window}/regenerate-narrative`
        );
        return response.data;
    },
};
