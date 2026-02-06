import api from '../../../services/api';
import {
    BullpenSession,
    BullpenSessionWithDetails,
    BullpenPitch,
    BullpenSessionSummary,
} from '@pitch-tracker/shared';

export const bullpenApi = {
    // Session CRUD
    createSession: async (data: {
        team_id: string;
        pitcher_id: string;
        intensity?: string;
        plan_id?: string;
    }): Promise<BullpenSession> => {
        const response = await api.post<{ session: BullpenSession }>('/bullpen/sessions', data);
        return response.data.session;
    },

    getSession: async (id: string): Promise<BullpenSessionWithDetails> => {
        const response = await api.get<{ session: BullpenSessionWithDetails }>(`/bullpen/sessions/${id}`);
        return response.data.session;
    },

    getTeamSessions: async (teamId: string, pitcherId?: string): Promise<BullpenSessionWithDetails[]> => {
        const params = pitcherId ? `?pitcherId=${pitcherId}` : '';
        const response = await api.get<{ sessions: BullpenSessionWithDetails[] }>(`/bullpen/sessions/team/${teamId}${params}`);
        return response.data.sessions;
    },

    getPitcherSessions: async (pitcherId: string): Promise<BullpenSessionWithDetails[]> => {
        const response = await api.get<{ sessions: BullpenSessionWithDetails[] }>(`/bullpen/sessions/pitcher/${pitcherId}`);
        return response.data.sessions;
    },

    updateSession: async (id: string, data: { intensity?: string; notes?: string }): Promise<BullpenSession> => {
        const response = await api.put<{ session: BullpenSession }>(`/bullpen/sessions/${id}`, data);
        return response.data.session;
    },

    endSession: async (id: string, notes?: string): Promise<BullpenSession> => {
        const response = await api.post<{ session: BullpenSession }>(`/bullpen/sessions/${id}/end`, { notes });
        return response.data.session;
    },

    // Pitch logging
    logPitch: async (data: {
        session_id: string;
        pitch_type: string;
        target_x?: number;
        target_y?: number;
        actual_x?: number;
        actual_y?: number;
        velocity?: number;
        result: string;
    }): Promise<BullpenPitch> => {
        const response = await api.post<{ pitch: BullpenPitch }>('/bullpen/pitches', data);
        return response.data.pitch;
    },

    getSessionPitches: async (sessionId: string): Promise<BullpenPitch[]> => {
        const response = await api.get<{ pitches: BullpenPitch[] }>(`/bullpen/pitches/session/${sessionId}`);
        return response.data.pitches;
    },

    // Analytics
    getSessionSummary: async (sessionId: string): Promise<BullpenSessionSummary> => {
        const response = await api.get<{ summary: BullpenSessionSummary }>(`/bullpen/sessions/${sessionId}/summary`);
        return response.data.summary;
    },

    getPitcherBullpenLogs: async (pitcherId: string): Promise<{ sessions: BullpenSessionSummary[]; total_count: number }> => {
        const response = await api.get<{ sessions: BullpenSessionSummary[]; total_count: number }>(`/bullpen/pitcher/${pitcherId}/logs`);
        return response.data;
    },
};
