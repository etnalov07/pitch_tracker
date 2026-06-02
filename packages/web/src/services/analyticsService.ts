import {
    BatterHistory,
    BatterScoutingNote,
    BatterScoutingReport,
    CountBucketBreakdown,
    HitterTendenciesLive,
    PitchChart,
    PitcherEffectiveness,
    PitcherEffectivenessWindow,
    PitcherTendenciesLive,
    PitchLocationData,
    SprayChartData,
    TeamSide,
} from '../types';
import api from './api';

// Analytics service
export const analyticsService = {
    // Get batter history (optionally vs specific pitcher)
    getBatterHistory: async (batterId: string, pitcherId?: string, limit: number = 10): Promise<BatterHistory> => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (pitcherId) {
            params.append('pitcherId', pitcherId);
        }
        const response = await api.get<BatterHistory>(`/analytics/batter/${batterId}/history?${params}`);
        return response.data;
    },

    // Get raw pitch locations for scatter plot (colored by type).
    // pitcherId scopes to a single pitcher (Opponent Lineup view); opponentTeamId
    // / opponentName scope to all games against the same opposing team (Our
    // Lineup view — e.g. every game in a series vs the Wolves).
    getPitchLocations: async (
        batterId: string,
        pitcherId?: string,
        opponentTeamId?: string,
        opponentName?: string
    ): Promise<PitchLocationData[]> => {
        const qs = new URLSearchParams();
        if (pitcherId) qs.append('pitcherId', pitcherId);
        if (opponentTeamId) qs.append('opponentTeamId', opponentTeamId);
        if (opponentName) qs.append('opponentName', opponentName);
        const params = qs.toString() ? `?${qs.toString()}` : '';
        const response = await api.get<{ pitches: PitchLocationData[] }>(`/analytics/batter/${batterId}/pitch-locations${params}`);
        return response.data.pitches ?? [];
    },

    // Get spray chart.
    // gameId scopes to a single game (Opponent Lineup view); opponentTeamId / opponentName
    // scope to all games against the same opposing team (Our Lineup view — e.g. every game
    // in a series vs the Wolves), with rows grouped per-game so the client can distinguish
    // outcomes by game.
    getSprayChart: async (
        batterId: string,
        gameId?: string,
        opponentTeamId?: string,
        opponentName?: string
    ): Promise<SprayChartData[]> => {
        const qs = new URLSearchParams();
        if (gameId) qs.append('game_id', gameId);
        if (opponentTeamId) qs.append('opponentTeamId', opponentTeamId);
        if (opponentName) qs.append('opponentName', opponentName);
        const params = qs.toString() ? `?${qs.toString()}` : '';
        const response = await api.get<{ sprayChart: SprayChartData[] }>(`/analytics/batter/${batterId}/spray-chart${params}`);
        return response.data.sprayChart ?? [];
    },

    // Get pitcher tendencies
    getPitcherTendencies: async (pitcherId: string) => {
        const response = await api.get(`/analytics/pitcher/${pitcherId}/tendencies`);
        return response.data;
    },

    // Get matchup stats
    getMatchupStats: async (batterId: string, pitcherId: string) => {
        const response = await api.get(`/analytics/matchup/${batterId}/${pitcherId}`);
        return response.data;
    },

    // Get live pitcher tendencies for the current at-bat
    getPitcherLiveTendencies: async (pitcherId: string, batterHand: 'L' | 'R'): Promise<PitcherTendenciesLive> => {
        const response = await api.get<{ tendencies: PitcherTendenciesLive }>(
            `/analytics/pitcher/${pitcherId}/tendencies-live?batter_hand=${batterHand}`
        );
        return response.data.tendencies;
    },

    // Per-pitcher pitch-type × zone × handedness effectiveness (strike% / whiff%).
    // Drives the live pitch-button tint and the pitcher-profile effectiveness card.
    getPitcherEffectiveness: async (
        pitcherId: string,
        batterHand: 'L' | 'R',
        window: PitcherEffectivenessWindow = 'career',
        gameId?: string
    ): Promise<PitcherEffectiveness> => {
        const qs = new URLSearchParams({ batter_hand: batterHand, window });
        if (gameId) qs.append('game_id', gameId);
        const response = await api.get<{ effectiveness: PitcherEffectiveness }>(
            `/analytics/pitcher/${pitcherId}/effectiveness?${qs}`
        );
        return response.data.effectiveness;
    },

    // Get live hitter tendencies for the current at-bat
    getHitterLiveTendencies: async (batterId: string, batterType: 'team' | 'opponent'): Promise<HitterTendenciesLive> => {
        const response = await api.get<{ tendencies: HitterTendenciesLive }>(
            `/analytics/hitter/${batterId}/tendencies-live?batter_type=${batterType}`
        );
        return response.data.tendencies;
    },

    // Get count breakdown for a game
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

    // Get pitcher's chart (per-individual-count breakdown)
    getPitchChart: async (gameId: string, pitcherId?: string, teamSide?: TeamSide): Promise<PitchChart> => {
        const params = new URLSearchParams();
        if (pitcherId) params.append('pitcherId', pitcherId);
        if (teamSide) params.append('team_side', teamSide);
        const qs = params.toString() ? `?${params}` : '';
        const response = await api.get<{ chart: PitchChart }>(`/analytics/game/${gameId}/pitch-chart${qs}`);
        return response.data.chart;
    },
};

// Scouting service for opponent batter notes and tendencies
export const scoutingService = {
    // Get full scouting report for opponent batter
    getScoutingReport: async (batterId: string): Promise<BatterScoutingReport> => {
        const response = await api.get<{ report: BatterScoutingReport }>(`/analytics/opponent-batter/${batterId}/scouting`);
        return response.data.report;
    },

    // Add note to opponent batter
    addNote: async (batterId: string, noteText: string): Promise<BatterScoutingNote> => {
        const response = await api.post<{ note: BatterScoutingNote }>(`/analytics/opponent-batter/${batterId}/notes`, {
            note_text: noteText,
        });
        return response.data.note;
    },

    // Update note
    updateNote: async (batterId: string, noteId: string, noteText: string): Promise<BatterScoutingNote> => {
        const response = await api.put<{ note: BatterScoutingNote }>(`/analytics/opponent-batter/${batterId}/notes/${noteId}`, {
            note_text: noteText,
        });
        return response.data.note;
    },

    // Delete note
    deleteNote: async (batterId: string, noteId: string): Promise<void> => {
        await api.delete(`/analytics/opponent-batter/${batterId}/notes/${noteId}`);
    },

    // Force recalculate tendencies
    recalculateTendencies: async (batterId: string): Promise<void> => {
        await api.post(`/analytics/opponent-batter/${batterId}/tendencies/recalculate`);
    },
};
