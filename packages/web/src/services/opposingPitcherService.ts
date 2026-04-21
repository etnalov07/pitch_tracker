import { CreateOpposingPitcherParams, OpposingPitcher } from '../types';
import api from './api';

export const opposingPitcherService = {
    getByGame: async (gameId: string): Promise<OpposingPitcher[]> => {
        const response = await api.get<{ pitchers: OpposingPitcher[] }>(`/opposing-pitchers/game/${gameId}`);
        return response.data.pitchers;
    },

    create: async (params: CreateOpposingPitcherParams): Promise<OpposingPitcher> => {
        const response = await api.post<{ pitcher: OpposingPitcher }>('/opposing-pitchers', params);
        return response.data.pitcher;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/opposing-pitchers/${id}`);
    },
};
