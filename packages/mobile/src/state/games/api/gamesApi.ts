import api from '../../../services/api';
import {
    BatterScoutingProfile,
    Game,
    GameRole,
    GameRoleRecord,
    Team,
    Player,
    AtBat,
    Pitch,
    Play,
    Inning,
    GamePitcherWithPlayer,
    MyTeamLineupPlayer,
    CreateMyTeamLineupPlayerParams,
    OpponentLineupPlayer,
    OpponentPitcherProfile,
    OpponentRosterPlayer,
    BaseRunners,
    BaserunnerEvent,
    OpposingPitcher,
    CreateOpposingPitcherParams,
    CountBucketBreakdown,
    TeamSide,
    PitchResult,
} from '@pitch-tracker/shared';

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

    getGamesByTeam: async (teamId: string): Promise<Game[]> => {
        const response = await api.get<{ games: Game[] }>(`/games/team/${teamId}`);
        return response.data.games;
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

    resumeGame: async (id: string): Promise<Game> => {
        const response = await api.post<{ game: Game }>(`/games/${id}/resume`);
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

    // End at-bat (sets ab_end_time on server)
    endAtBat: async (
        id: string,
        data: { result: string; outs_after: number; rbi?: number; runs_scored?: number }
    ): Promise<AtBat> => {
        const response = await api.post<{ atBat: AtBat }>(`/at-bats/${id}/end`, data);
        return response.data.atBat;
    },

    getAtBatsByGame: async (gameId: string): Promise<AtBat[]> => {
        const response = await api.get<{ atBats: AtBat[] }>(`/at-bats/game/${gameId}`);
        return response.data.atBats;
    },

    // Pitch operations
    logPitch: async (pitchData: Partial<Pitch>): Promise<Pitch> => {
        const response = await api.post<{ pitch: Pitch }>('/pitches', pitchData);
        return response.data.pitch;
    },

    undoPitch: async (pitchId: string): Promise<{ pitch: Pitch; atBat: AtBat; game: Game }> => {
        const response = await api.delete<{ pitch: Pitch; atBat: AtBat; game: Game }>(`/pitches/${pitchId}`);
        return { pitch: response.data.pitch, atBat: response.data.atBat, game: response.data.game };
    },

    // Result-only edit of the most recent pitch (UX-LG-01 Fix Last Pitch).
    // Throws an Error with `.status` and `.code` for 409 cases so the caller can
    // route AB_BOUNDARY errors to a "use Undo" toast.
    updatePitchResult: async (pitchId: string, pitchResult: PitchResult): Promise<{ pitch: Pitch; atBat: AtBat }> => {
        try {
            const response = await api.patch<{ pitch: Pitch; atBat: AtBat }>(`/pitches/${pitchId}`, {
                pitch_result: pitchResult,
            });
            return { pitch: response.data.pitch, atBat: response.data.atBat };
        } catch (err: unknown) {
            const e = err as { response?: { status?: number; data?: { error?: string; code?: string } } };
            const status = e.response?.status;
            const code = e.response?.data?.code;
            const message = e.response?.data?.error || 'Failed to update pitch';
            const wrapped: Error & { status?: number; code?: string } = new Error(message);
            wrapped.status = status;
            wrapped.code = code;
            throw wrapped;
        }
    },

    getGamePitches: async (gameId: string): Promise<Pitch[]> => {
        const response = await api.get<{ pitches: Pitch[] }>(`/pitches/game/${gameId}`);
        return response.data.pitches;
    },

    getPitcherGameStats: async (pitcherId: string, gameId: string): Promise<{ total_pitches: number }> => {
        const response = await api.get<{ stats: { total_pitches: number } }>(`/players/${pitcherId}/game-stats/${gameId}`);
        return response.data.stats;
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

    addGamePitcher: async (gameId: string, playerId: string): Promise<GamePitcherWithPlayer> => {
        const response = await api.post<{ pitcher: GamePitcherWithPlayer }>(`/game-pitchers/game/${gameId}`, {
            player_id: playerId,
            pitching_order: 1,
            inning_entered: 1,
        });
        return response.data.pitcher;
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

    /**
     * Returns the starting lineup from the most recent prior game vs the same
     * opponent team. Empty when there's no linked opponent team or no prior game.
     */
    getLastLineupVsOpponent: async (gameId: string): Promise<OpponentLineupPlayer[]> => {
        const response = await api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}/last-vs-opponent`);
        return response.data.lineup;
    },

    /**
     * In-game substitute for an opponent batter. Inserts a new lineup row with
     * is_starter=false, inning_entered set, and chains replaced_by_id from the
     * original player. Returns the new sub row.
     */
    substituteOpponentPlayer: async (
        playerId: string,
        sub: { player_name: string; inning_entered: number; position?: string; bats?: 'R' | 'L' | 'S' }
    ): Promise<OpponentLineupPlayer> => {
        const response = await api.post<{ player: OpponentLineupPlayer }>(`/opponent-lineup/player/${playerId}/substitute`, sub);
        return response.data.player;
    },

    createOpponentLineupBulk: async (
        gameId: string,
        players: {
            player_name: string;
            batting_order: number;
            position?: string;
            bats: 'R' | 'L' | 'S';
            is_starter: boolean;
        }[]
    ): Promise<OpponentLineupPlayer[]> => {
        const response = await api.post<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}/bulk`, {
            players,
        });
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

    // Base runners operations
    updateBaseRunners: async (gameId: string, baseRunners: BaseRunners): Promise<Game> => {
        const response = await api.put<{ game: Game }>(`/games/${gameId}/base-runners`, { base_runners: baseRunners });
        return response.data.game;
    },

    getBaseRunners: async (gameId: string): Promise<BaseRunners> => {
        const response = await api.get<{ base_runners: BaseRunners }>(`/games/${gameId}/base-runners`);
        return response.data.base_runners;
    },

    // Baserunner event operations
    recordBaserunnerEvent: async (eventData: Partial<BaserunnerEvent>): Promise<BaserunnerEvent> => {
        const response = await api.post<{ event: BaserunnerEvent }>('/baserunner-events', eventData);
        return response.data.event;
    },

    getBaserunnerEventsByGame: async (gameId: string): Promise<BaserunnerEvent[]> => {
        const response = await api.get<{ events: BaserunnerEvent[] }>(`/baserunner-events/game/${gameId}`);
        return response.data.events;
    },

    toggleHomeAway: async (id: string): Promise<Game> => {
        const response = await api.post<{ game: Game }>(`/games/${id}/toggle-home-away`);
        return response.data.game;
    },

    // Opposing pitcher operations
    getOpposingPitchers: async (gameId: string): Promise<OpposingPitcher[]> => {
        const response = await api.get<{ pitchers: OpposingPitcher[] }>(`/opposing-pitchers/game/${gameId}`);
        return response.data.pitchers;
    },

    createOpposingPitcher: async (params: CreateOpposingPitcherParams): Promise<OpposingPitcher> => {
        const response = await api.post<{ pitcher: OpposingPitcher }>('/opposing-pitchers', params);
        return response.data.pitcher;
    },

    updateOpposingPitcher: async (id: string, params: Partial<CreateOpposingPitcherParams>): Promise<OpposingPitcher> => {
        const response = await api.put<{ pitcher: OpposingPitcher }>(`/opposing-pitchers/${id}`, params);
        return response.data.pitcher;
    },

    deleteOpposingPitcher: async (id: string): Promise<void> => {
        await api.delete(`/opposing-pitchers/${id}`);
    },

    // Game roles
    getGameRole: async (gameId: string): Promise<GameRole | null> => {
        const response = await api.get<{ role: GameRole | null }>(`/game/${gameId}/role`);
        return response.data.role;
    },

    assignGameRole: async (gameId: string, role: GameRole): Promise<GameRoleRecord> => {
        const response = await api.post<{ role: GameRoleRecord }>(`/game/${gameId}/role`, { role });
        return response.data.role;
    },

    // Count breakdown
    getCountBreakdown: async (
        gameId: string,
        pitcherId?: string,
        teamSide?: TeamSide,
        opposingPitcherId?: string
    ): Promise<CountBucketBreakdown> => {
        const params = new URLSearchParams();
        if (pitcherId) params.append('pitcherId', pitcherId);
        if (teamSide) params.append('team_side', teamSide);
        if (opposingPitcherId) params.append('opposingPitcherId', opposingPitcherId);
        const qs = params.toString() ? `?${params}` : '';
        const response = await api.get<{ breakdown: CountBucketBreakdown }>(`/analytics/game/${gameId}/count-breakdown${qs}`);
        return response.data.breakdown;
    },

    // My team lineup
    getMyTeamLineup: async (gameId: string): Promise<MyTeamLineupPlayer[]> => {
        const response = await api.get<{ lineup: MyTeamLineupPlayer[] }>(`/my-team-lineup/game/${gameId}`);
        return response.data.lineup;
    },

    createMyTeamLineupBulk: async (gameId: string, players: CreateMyTeamLineupPlayerParams[]): Promise<MyTeamLineupPlayer[]> => {
        const response = await api.post<{ lineup: MyTeamLineupPlayer[] }>(`/my-team-lineup/game/${gameId}/bulk`, { players });
        return response.data.lineup;
    },

    /**
     * Substitutes a my-team batter with a roster player. The server inserts a new
     * lineup row (is_starter=false) in the same batting slot and links the original
     * via replaced_by_id. Returns the new sub row.
     */
    substituteMyTeamPlayer: async (
        playerId: string,
        sub: { player_id: string; inning_entered: number; position?: string }
    ): Promise<MyTeamLineupPlayer> => {
        const response = await api.post<{ player: MyTeamLineupPlayer }>(`/my-team-lineup/player/${playerId}/substitute`, sub);
        return response.data.player;
    },

    // All team players (full roster)
    getTeamPlayers: async (teamId: string): Promise<Player[]> => {
        const response = await api.get<{ players: Player[] }>(`/players/team/${teamId}`);
        return response.data.players;
    },

    getOpponentRoster: async (
        gameId: string
    ): Promise<{
        pitchers: OpponentPitcherProfile[];
        batters: BatterScoutingProfile[];
        players: OpponentRosterPlayer[];
    }> => {
        const response = await api.get<{
            pitchers: OpponentPitcherProfile[];
            batters: BatterScoutingProfile[];
            players?: OpponentRosterPlayer[];
        }>(`/games/${gameId}/opponent-roster`);
        return {
            pitchers: response.data.pitchers ?? [],
            batters: response.data.batters ?? [],
            players: response.data.players ?? [],
        };
    },
};
