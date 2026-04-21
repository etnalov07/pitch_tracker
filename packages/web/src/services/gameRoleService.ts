import { GameRole, GameRoleRecord } from '@pitch-tracker/shared';
import api from './api';

export const gameRoleService = {
    getRole: async (gameId: string): Promise<GameRole | null> => {
        const response = await api.get<{ role: GameRole | null }>(`/game/${gameId}/role`);
        return response.data.role;
    },

    assignRole: async (gameId: string, role: GameRole): Promise<GameRoleRecord> => {
        const response = await api.post<{ role: GameRoleRecord }>(`/game/${gameId}/role`, { role });
        return response.data.role;
    },
};
