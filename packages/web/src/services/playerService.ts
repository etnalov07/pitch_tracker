import type { Player } from '../types';
import api from './api';

export type MyPlayerRecord = Player & { team_name?: string };

export const playerService = {
    /**
     * GET /players/me — returns every player record linked to the
     * logged-in user (one per team where they have role='player').
     */
    getMyPlayers: async (): Promise<MyPlayerRecord[]> => {
        const response = await api.get<{ players: MyPlayerRecord[] }>('/players/me');
        return response.data.players;
    },
};
