import {
    BullpenIntensity,
    BullpenPitch,
    BullpenPitchResult,
    BullpenSession,
    BullpenSessionWithDetails,
    BullpenSessionSummary,
    PitchType,
} from '@pitch-tracker/shared';
import api from './api';

export const bullpenService = {
    createSession: async (
        teamId: string,
        pitcherId: string,
        intensity: BullpenIntensity,
        createdBy?: string
    ): Promise<BullpenSession> => {
        const response = await api.post<BullpenSession>('/bullpen/sessions', {
            team_id: teamId,
            pitcher_id: pitcherId,
            intensity,
            created_by: createdBy,
        });
        return response.data;
    },

    getSession: async (sessionId: string): Promise<BullpenSessionWithDetails> => {
        const response = await api.get<BullpenSessionWithDetails>(`/bullpen/sessions/${sessionId}`);
        return response.data;
    },

    logPitch: async (data: {
        session_id: string;
        pitch_type: PitchType;
        result: BullpenPitchResult;
        actual_x?: number;
        actual_y?: number;
        target_x?: number;
        target_y?: number;
        velocity?: number;
    }): Promise<BullpenPitch> => {
        const response = await api.post<BullpenPitch>('/bullpen/pitches', data);
        return response.data;
    },

    getSessionPitches: async (sessionId: string): Promise<BullpenPitch[]> => {
        const response = await api.get<BullpenPitch[]>(`/bullpen/pitches/session/${sessionId}`);
        return response.data;
    },

    endSession: async (sessionId: string, notes?: string): Promise<BullpenSession> => {
        const response = await api.post<BullpenSession>(`/bullpen/sessions/${sessionId}/end`, { notes });
        return response.data;
    },

    getTeamSessions: async (teamId: string, pitcherId?: string): Promise<BullpenSessionWithDetails[]> => {
        const params = pitcherId ? { pitcher_id: pitcherId } : {};
        const response = await api.get<BullpenSessionWithDetails[]>(`/bullpen/sessions/team/${teamId}`, { params });
        return response.data;
    },

    getPitcherSessions: async (pitcherId: string): Promise<BullpenSessionWithDetails[]> => {
        const response = await api.get<BullpenSessionWithDetails[]>(`/bullpen/sessions/pitcher/${pitcherId}`);
        return response.data;
    },

    getSessionSummary: async (sessionId: string): Promise<BullpenSessionSummary> => {
        const response = await api.get<BullpenSessionSummary>(`/bullpen/sessions/${sessionId}/summary`);
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
