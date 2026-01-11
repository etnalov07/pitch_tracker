import api from './api';
import { Game, Team, Player } from '../types';

export const gameService = {
  // Get all games
  getAllGames: async (): Promise<Game[]> => {
    const response = await api.get<Game[]>('/games');
    return response.data;
  },

  // Get game by ID
  getGameById: async (id: string): Promise<Game> => {
    const response = await api.get<Game>(`/games/${id}`);
    return response.data;
  },

  // Create new game
  createGame: async (gameData: Partial<Game>): Promise<Game> => {
    const response = await api.post<Game>('/games', gameData);
    return response.data;
  },

  // Start game
  startGame: async (id: string): Promise<Game> => {
    const response = await api.post<Game>(`/games/${id}/start`);
    return response.data;
  },

  // End game
  endGame: async (id: string, finalData: { homeScore: number; awayScore: number }): Promise<Game> => {
    const response = await api.post<Game>(`/games/${id}/end`, finalData);
    return response.data;
  },

  // Advance inning
  advanceInning: async (id: string): Promise<Game> => {
    const response = await api.post<Game>(`/games/${id}/advance-inning`);
    return response.data;
  },

  // Update game
  updateGame: async (id: string, gameData: Partial<Game>): Promise<Game> => {
    const response = await api.put<Game>(`/games/${id}`, gameData);
    return response.data;
  },

  // Delete game
  deleteGame: async (id: string): Promise<void> => {
    await api.delete(`/games/${id}`);
  },

  // Get current game state (for live tracking)
  getCurrentGameState: async (id: string): Promise<{
    game: Game;
    homeTeam: Team;
    awayTeam: Team;
    currentPitcher?: Player;
    currentBatter?: Player;
  }> => {
    const response = await api.get(`/games/${id}/state`);
    return response.data;
  },
};
