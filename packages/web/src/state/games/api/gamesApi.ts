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
        const response = await api.get<Game[]>('/game');
        return response.data;
    },

    getGameById: async (id: string): Promise<Game> => {
        const response = await api.get<Game>(`/game/${id}`);
        return response.data;
    },

    createGame: async (gameData: Partial<Game>): Promise<Game> => {
        const response = await api.post<Game>('/game', gameData);
        return response.data;
    },

    updateGame: async (id: string, gameData: Partial<Game>): Promise<Game> => {
        const response = await api.put<Game>(`/game/${id}`, gameData);
        return response.data;
    },

    deleteGame: async (id: string): Promise<void> => {
        await api.delete(`/game/${id}`);
    },

    startGame: async (id: string): Promise<Game> => {
        const response = await api.post<Game>(`/game/${id}/start`);
        return response.data;
    },

    endGame: async (id: string, finalData: { home_score: number; away_score: number }): Promise<Game> => {
        const response = await api.post<Game>(`/game/${id}/end`, finalData);
        return response.data;
    },

    advanceInning: async (id: string): Promise<Game> => {
        const response = await api.post<Game>(`/game/${id}/advance-inning`);
        return response.data;
    },

    getCurrentGameState: async (id: string): Promise<GameState> => {
        const response = await api.get<GameState>(`/game/${id}/state`);
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
