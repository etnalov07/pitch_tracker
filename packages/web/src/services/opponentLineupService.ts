import { OpponentLineupPlayer } from '../types';
import api from './api';

export const opponentLineupService = {
    getByGame: async (gameId: string): Promise<OpponentLineupPlayer[]> => {
        const response = await api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}`);
        return response.data.lineup ?? [];
    },
};
