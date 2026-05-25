import type { MyPlayerStats, Player } from '@pitch-tracker/shared';

import api from '../../../services/api';

// A player record linked to the logged-in user via team_members.role='player'.
// Web's MyPlayerRecord shape kept identical for parity.
export type MyPlayerRecord = Player & { team_name?: string };

export const playersApi = {
    /**
     * GET /players/me — every player record linked to the logged-in user
     * (one per team where they have role='player').
     */
    getMyPlayers: async (): Promise<MyPlayerRecord[]> => {
        const response = await api.get<{ players: MyPlayerRecord[] }>('/players/me');
        return response.data.players;
    },

    /**
     * GET /players/me/stats — the player's own batting + pitching aggregates
     * plus per-game scoreboard, scoped to a single team_id.
     */
    getMyStats: async (teamId: string): Promise<MyPlayerStats> => {
        const response = await api.get<{ stats: MyPlayerStats }>(`/players/me/stats?team_id=${encodeURIComponent(teamId)}`);
        return response.data.stats;
    },
};
