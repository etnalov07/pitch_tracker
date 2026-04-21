import { MyTeamLineupPlayer, CreateMyTeamLineupPlayerParams } from '../types';
import api from './api';

export const myTeamLineupService = {
    getByGame: async (gameId: string): Promise<MyTeamLineupPlayer[]> => {
        const response = await api.get<{ lineup: MyTeamLineupPlayer[] }>(`/my-team-lineup/game/${gameId}`);
        return response.data.lineup;
    },

    bulkCreate: async (gameId: string, players: CreateMyTeamLineupPlayerParams[]): Promise<MyTeamLineupPlayer[]> => {
        const response = await api.post<{ lineup: MyTeamLineupPlayer[] }>(`/my-team-lineup/game/${gameId}/bulk`, { players });
        return response.data.lineup;
    },

    update: async (id: string, data: Partial<CreateMyTeamLineupPlayerParams>): Promise<MyTeamLineupPlayer> => {
        const response = await api.put<{ player: MyTeamLineupPlayer }>(`/my-team-lineup/${id}`, data);
        return response.data.player;
    },
};
