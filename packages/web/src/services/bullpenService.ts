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
        const response = await api.post<{ session: BullpenSession }>('/bullpen/sessions', {
            team_id: teamId,
            pitcher_id: pitcherId,
            intensity,
            created_by: createdBy,
        });
        return response.data.session;
    },

    getSession: async (sessionId: string): Promise<BullpenSessionWithDetails> => {
        const response = await api.get<{ session: BullpenSessionWithDetails }>(`/bullpen/sessions/${sessionId}`);
        return response.data.session;
    },

    logPitch: async (data: {
        session_id: string;
        pitch_type: PitchType;
        result?: BullpenPitchResult;
        actual_x?: number;
        actual_y?: number;
        target_x?: number;
        target_y?: number;
        velocity?: number;
    }): Promise<BullpenPitch> => {
        const response = await api.post<{ pitch: BullpenPitch }>('/bullpen/pitches', data);
        return response.data.pitch;
    },

    getSessionPitches: async (sessionId: string): Promise<BullpenPitch[]> => {
        const response = await api.get<{ pitches: BullpenPitch[] }>(`/bullpen/pitches/session/${sessionId}`);
        return response.data.pitches;
    },

    endSession: async (sessionId: string, notes?: string): Promise<BullpenSession> => {
        const response = await api.post<{ session: BullpenSession }>(`/bullpen/sessions/${sessionId}/end`, { notes });
        return response.data.session;
    },

    getTeamSessions: async (teamId: string, pitcherId?: string): Promise<BullpenSessionWithDetails[]> => {
        const params = pitcherId ? { pitcher_id: pitcherId } : {};
        const response = await api.get<{ sessions: BullpenSessionWithDetails[] }>(`/bullpen/sessions/team/${teamId}`, {
            params,
        });
        return response.data.sessions;
    },

    getPitcherSessions: async (pitcherId: string): Promise<BullpenSessionWithDetails[]> => {
        const response = await api.get<{ sessions: BullpenSessionWithDetails[] }>(`/bullpen/sessions/pitcher/${pitcherId}`);
        return response.data.sessions;
    },

    getSessionSummary: async (sessionId: string): Promise<BullpenSessionSummary> => {
        const response = await api.get<{ summary: BullpenSessionSummary }>(`/bullpen/sessions/${sessionId}/summary`);
        return response.data.summary;
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
