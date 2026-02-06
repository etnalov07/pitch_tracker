import { BullpenSessionWithDetails, BullpenSessionSummary } from '@pitch-tracker/shared';
import api from './api';

export const bullpenService = {
    getTeamSessions: async (teamId: string, pitcherId?: string): Promise<BullpenSessionWithDetails[]> => {
        const params = pitcherId ? { pitcher_id: pitcherId } : {};
        const response = await api.get<BullpenSessionWithDetails[]>(
            `/bullpen/sessions/team/${teamId}`,
            { params }
        );
        return response.data;
    },

    getPitcherSessions: async (pitcherId: string): Promise<BullpenSessionWithDetails[]> => {
        const response = await api.get<BullpenSessionWithDetails[]>(
            `/bullpen/sessions/pitcher/${pitcherId}`
        );
        return response.data;
    },

    getSessionSummary: async (sessionId: string): Promise<BullpenSessionSummary> => {
        const response = await api.get<BullpenSessionSummary>(
            `/bullpen/sessions/${sessionId}/summary`
        );
        return response.data;
    },

    getPitcherBullpenLogs: async (
        pitcherId: string,
        limit = 20,
        offset = 0
    ): Promise<{ sessions: BullpenSessionSummary[]; total_count: number }> => {
        const response = await api.get<{ sessions: BullpenSessionSummary[]; total_count: number }>(
            `/bullpen/pitcher/${pitcherId}/logs`,
            { params: { limit, offset } }
        );
        return response.data;
    },
};
