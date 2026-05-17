import type { MyPlayerStats, Player } from '../types';
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

    /**
     * GET /players/me/stats — the logged-in player's own batting/pitching
     * aggregates + per-game scoreboard, scoped to the given team.
     */
    getMyStats: async (teamId: string): Promise<MyPlayerStats> => {
        const response = await api.get<{ stats: MyPlayerStats }>(`/players/me/stats?team_id=${encodeURIComponent(teamId)}`);
        return response.data.stats;
    },
};
