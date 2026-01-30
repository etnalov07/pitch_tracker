import api from '../../../services/api';
import { Game, Team, Player, AtBat, Pitch, Play, Inning, GamePitcherWithPlayer, OpponentLineupPlayer } from '@pitch-tracker/shared';

export interface GameState {
    game: Game;
    homeTeam: Team;
    awayTeam: Team;
    currentPitcher?: Player;
    currentBatter?: Player;
}

export const gamesApi = {
    getAllGames: async (): Promise<Game[]> => {
        const response = await api.get<{ games: Game[] }>('/games/my-games');
        return response.data.games;
    },

    getGameById: async (id: string): Promise<Game> => {
        const response = await api.get<{ game: Game }>(`/games/${id}`);
        return response.data.game;
    },

    createGame: async (gameData: Partial<Game>): Promise<Game> => {
        const response = await api.post<{ game: Game }>('/games', gameData);
        return response.data.game;
    },

    updateGame: async (id: string, gameData: Partial<Game>): Promise<Game> => {
        const response = await api.put<{ game: Game }>(`/games/${id}`, gameData);
        return response.data.game;
    },

    deleteGame: async (id: string): Promise<void> => {
        await api.delete(`/games/${id}`);
    },

    startGame: async (id: string): Promise<Game> => {
        const response = await api.post<{ game: Game }>(`/games/${id}/start`);
        return response.data.game;
    },

    endGame: async (id: string, finalData: { home_score: number; away_score: number }): Promise<Game> => {
        const response = await api.post<{ game: Game }>(`/games/${id}/end`, finalData);
        return response.data.game;
    },

    advanceInning: async (id: string): Promise<Game> => {
        const response = await api.post<{ game: Game }>(`/games/${id}/advance-inning`);
        return response.data.game;
    },

    updateScore: async (id: string, homeScore: number, awayScore: number): Promise<Game> => {
        const response = await api.put<{ game: Game }>(`/games/${id}/score`, {
            home_score: homeScore,
            away_score: awayScore,
        });
        return response.data.game;
    },

    getCurrentGameState: async (id: string): Promise<GameState> => {
        const response = await api.get<GameState>(`/analytics/game/${id}/state`);
        return response.data;
    },

    // At-Bat operations
    createAtBat: async (atBatData: Partial<AtBat>): Promise<AtBat> => {
        const response = await api.post<{ atBat: AtBat }>('/at-bats', atBatData);
        return response.data.atBat;
    },

    updateAtBat: async (id: string, atBatData: Partial<AtBat>): Promise<AtBat> => {
        const response = await api.put<{ atBat: AtBat }>(`/at-bats/${id}`, atBatData);
        return response.data.atBat;
    },

    // Pitch operations
    logPitch: async (pitchData: Partial<Pitch>): Promise<Pitch> => {
        const response = await api.post<{ pitch: Pitch }>('/pitches', pitchData);
        return response.data.pitch;
    },

    // Play operations
    recordPlay: async (playData: Partial<Play>): Promise<Play> => {
        const response = await api.post<{ play: Play }>('/plays', playData);
        return response.data.play;
    },

    // Current inning
    getCurrentInning: async (gameId: string): Promise<Inning | null> => {
        try {
            const response = await api.get<{ inning: Inning }>(`/games/${gameId}/current-inning`);
            return response.data.inning;
        } catch {
            return null;
        }
    },

    // Game Pitcher operations
    getGamePitchers: async (gameId: string): Promise<GamePitcherWithPlayer[]> => {
        const response = await api.get<{ pitchers: GamePitcherWithPlayer[] }>(`/game-pitchers/game/${gameId}`);
        return response.data.pitchers;
    },

    changePitcher: async (gameId: string, playerId: string, inningEntered: number): Promise<GamePitcherWithPlayer> => {
        const response = await api.post<{ pitcher: GamePitcherWithPlayer }>(`/game-pitchers/game/${gameId}/change`, {
            player_id: playerId,
            inning_entered: inningEntered,
        });
        return response.data.pitcher;
    },

    // Opponent Lineup operations
    getOpponentLineup: async (gameId: string): Promise<OpponentLineupPlayer[]> => {
        const response = await api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}`);
        return response.data.lineup;
    },

    // Team pitchers (roster)
    getTeamPitchers: async (teamId: string): Promise<Player[]> => {
        const response = await api.get<{ pitchers: Player[] }>(`/players/pitchers/team/${teamId}`);
        return response.data.pitchers;
    },

    // Pitcher's pitch types
    getPitcherPitchTypes: async (playerId: string): Promise<string[]> => {
        const response = await api.get<{ pitch_types: string[] }>(`/players/${playerId}/pitch-types`);
        return response.data.pitch_types || [];
    },
};
