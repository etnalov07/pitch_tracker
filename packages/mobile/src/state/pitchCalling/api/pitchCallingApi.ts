import api from '../../../services/api';
import {
    PitchCall,
    PitchCallWithDetails,
    PitchCallAbbrev,
    PitchCallZone,
    PitchCallGameSummary,
    GameCallAnalytics,
    PitchCallAccuracy,
    SeasonCallAnalytics,
} from '@pitch-tracker/shared';

export const pitchCallingApi = {
    createCall: async (data: {
        game_id: string;
        team_id: string;
        pitch_type: PitchCallAbbrev;
        zone: PitchCallZone;
        at_bat_id?: string;
        pitcher_id?: string;
        batter_id?: string;
        opponent_batter_id?: string;
        inning?: number;
        balls_before?: number;
        strikes_before?: number;
    }): Promise<PitchCall> => {
        const response = await api.post<{ call: PitchCall }>('/pitch-calls', data);
        return response.data.call;
    },

    changeCall: async (
        callId: string,
        data: {
            pitch_type: PitchCallAbbrev;
            zone: PitchCallZone;
        }
    ): Promise<PitchCall> => {
        const response = await api.post<{ call: PitchCall }>(`/pitch-calls/${callId}/change`, data);
        return response.data.call;
    },

    markTransmitted: async (callId: string): Promise<PitchCall> => {
        const response = await api.post<{ call: PitchCall }>(`/pitch-calls/${callId}/transmitted`);
        return response.data.call;
    },

    logResult: async (callId: string, result: string, pitchId?: string): Promise<PitchCall> => {
        const response = await api.put<{ call: PitchCall }>(`/pitch-calls/${callId}/result`, {
            result,
            pitch_id: pitchId,
        });
        return response.data.call;
    },

    getCall: async (callId: string): Promise<PitchCallWithDetails> => {
        const response = await api.get<{ call: PitchCallWithDetails }>(`/pitch-calls/${callId}`);
        return response.data.call;
    },

    getGameCalls: async (gameId: string): Promise<PitchCallWithDetails[]> => {
        const response = await api.get<{ calls: PitchCallWithDetails[] }>(`/pitch-calls/game/${gameId}`);
        return response.data.calls;
    },

    getActiveCall: async (gameId: string): Promise<PitchCallWithDetails | null> => {
        const response = await api.get<{ call: PitchCallWithDetails | null }>(`/pitch-calls/game/${gameId}/active`);
        return response.data.call;
    },

    getAtBatCalls: async (atBatId: string): Promise<PitchCallWithDetails[]> => {
        const response = await api.get<{ calls: PitchCallWithDetails[] }>(`/pitch-calls/at-bat/${atBatId}`);
        return response.data.calls;
    },

    getGameSummary: async (gameId: string): Promise<PitchCallGameSummary> => {
        const response = await api.get<{ summary: PitchCallGameSummary }>(`/pitch-calls/game/${gameId}/summary`);
        return response.data.summary;
    },

    // Analytics
    getGameAnalytics: async (gameId: string): Promise<GameCallAnalytics> => {
        const response = await api.get<{ analytics: GameCallAnalytics }>(`/pitch-call-analytics/game/${gameId}`);
        return response.data.analytics;
    },

    getPitcherAccuracy: async (pitcherId: string, gameId?: string): Promise<PitchCallAccuracy> => {
        const params = gameId ? `?gameId=${gameId}` : '';
        const response = await api.get<{ accuracy: PitchCallAccuracy }>(`/pitch-call-analytics/pitcher/${pitcherId}${params}`);
        return response.data.accuracy;
    },

    getSeasonAnalytics: async (teamId: string): Promise<SeasonCallAnalytics> => {
        const response = await api.get<{ analytics: SeasonCallAnalytics }>(`/pitch-call-analytics/team/${teamId}/season`);
        return response.data.analytics;
    },
};
