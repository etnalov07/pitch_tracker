import { PitchCall, PitchCallAbbrev, PitchCallResult, PitchCallZone } from '@pitch-tracker/shared';
import api from './api';

export const pitchCallService = {
    createCall: async (data: {
        game_id: string;
        team_id: string;
        pitch_type: PitchCallAbbrev;
        zone: PitchCallZone;
        at_bat_id?: string;
        pitcher_id?: string;
        opponent_batter_id?: string;
        inning?: number;
        balls_before?: number;
        strikes_before?: number;
    }): Promise<PitchCall> => {
        const response = await api.post<{ call: PitchCall }>('/pitch-calls', data);
        return response.data.call;
    },

    logResult: async (callId: string, result: PitchCallResult): Promise<PitchCall> => {
        const response = await api.put<{ call: PitchCall }>(`/pitch-calls/${callId}/result`, { result });
        return response.data.call;
    },

    getActiveCall: async (gameId: string): Promise<PitchCall | null> => {
        try {
            const response = await api.get<{ call: PitchCall }>(`/pitch-calls/game/${gameId}/active`);
            return response.data.call;
        } catch {
            return null;
        }
    },
};
