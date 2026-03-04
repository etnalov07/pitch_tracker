import { BatterHistory, PitchLocationHeatMap, SprayChart, BatterScoutingReport, BatterScoutingNote } from '../types';
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

    // Get pitch location heat map
    getHeatMap: async (batterId: string, pitcherId?: string): Promise<PitchLocationHeatMap> => {
        const params = pitcherId ? `?pitcherId=${pitcherId}` : '';
        const response = await api.get<PitchLocationHeatMap>(`/analytics/batter/${batterId}/heatmap${params}`);
        return response.data;
    },

    // Get spray chart
    getSprayChart: async (batterId: string): Promise<SprayChart> => {
        const response = await api.get<SprayChart>(`/analytics/batter/${batterId}/spray-chart`);
        return response.data;
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
