import api from '../../../services/api';
import { Game, Team, Player, AtBat, Pitch, Play } from '../../../types';

interface GameState {
    game: Game;
    homeTeam: Team;
    awayTeam: Team;
    currentPitcher?: Player;
    currentBatter?: Player;
}

export const gamesApi = {
    getAllGames: async (): Promise<Game[]> => {
        const response = await api.get<Game[]>('/games');
        return response.data;
    },

    getGameById: async (id: string): Promise<Game> => {
        const response = await api.get<Game>(`/games/${id}`);
        return response.data;
    },

    createGame: async (gameData: Partial<Game>): Promise<Game> => {
        const response = await api.post<Game>('/games', gameData);
        return response.data;
    },

    updateGame: async (id: string, gameData: Partial<Game>): Promise<Game> => {
        const response = await api.put<Game>(`/games/${id}`, gameData);
        return response.data;
    },

    deleteGame: async (id: string): Promise<void> => {
        await api.delete(`/games/${id}`);
    },

    startGame: async (id: string): Promise<Game> => {
        const response = await api.post<Game>(`/games/${id}/start`);
        return response.data;
    },

    endGame: async (id: string, finalData: { homeScore: number; awayScore: number }): Promise<Game> => {
        const response = await api.post<Game>(`/games/${id}/end`, finalData);
        return response.data;
    },

    advanceInning: async (id: string): Promise<Game> => {
        const response = await api.post<Game>(`/games/${id}/advance-inning`);
        return response.data;
    },

    getCurrentGameState: async (id: string): Promise<GameState> => {
        const response = await api.get<GameState>(`/games/${id}/state`);
        return response.data;
    },

    // At-Bat operations
    createAtBat: async (atBatData: Partial<AtBat>): Promise<AtBat> => {
        const response = await api.post<AtBat>('/at-bats', atBatData);
        return response.data;
    },

    updateAtBat: async (id: string, atBatData: Partial<AtBat>): Promise<AtBat> => {
        const response = await api.put<AtBat>(`/at-bats/${id}`, atBatData);
        return response.data;
    },

    // Pitch operations
    logPitch: async (pitchData: Partial<Pitch>): Promise<Pitch> => {
        const response = await api.post<Pitch>('/pitches', pitchData);
        return response.data;
    },

    // Play operations
    recordPlay: async (playData: Partial<Play>): Promise<Play> => {
        const response = await api.post<Play>('/plays', playData);
        return response.data;
    },
};
