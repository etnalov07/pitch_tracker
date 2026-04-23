import {
    BatterHistory,
    BatterScoutingNote,
    BatterScoutingReport,
    CountBucketBreakdown,
    HitterTendenciesLive,
    PitchChart,
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

    // Get raw pitch locations for scatter plot (colored by type)
    getPitchLocations: async (batterId: string, pitcherId?: string): Promise<PitchLocationData[]> => {
        const params = pitcherId ? `?pitcherId=${pitcherId}` : '';
        const response = await api.get<{ pitches: PitchLocationData[] }>(`/analytics/batter/${batterId}/pitch-locations${params}`);
        return response.data.pitches ?? [];
    },

    // Get spray chart
    getSprayChart: async (batterId: string): Promise<SprayChartData[]> => {
        const response = await api.get<{ sprayChart: SprayChartData[] }>(`/analytics/batter/${batterId}/spray-chart`);
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

    // Get live hitter tendencies for the current at-bat
    getHitterLiveTendencies: async (batterId: string, batterType: 'team' | 'opponent'): Promise<HitterTendenciesLive> => {
        const response = await api.get<{ tendencies: HitterTendenciesLive }>(
            `/analytics/hitter/${batterId}/tendencies-live?batter_type=${batterType}`
        );
        return response.data.tendencies;
    },

    // Get count breakdown for a game
    getCountBreakdown: async (gameId: string, pitcherId?: string, teamSide?: TeamSide): Promise<CountBucketBreakdown> => {
        const params = new URLSearchParams();
        if (pitcherId) params.append('pitcherId', pitcherId);
        if (teamSide) params.append('team_side', teamSide);
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
