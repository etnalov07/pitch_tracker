import {
    ScoutingReport,
    ScoutingReportBatter,
    ScoutingReportBatterInput,
    ScoutingReportInput,
    ScoutingReportWithBatters,
} from '../types';
import api from './api';

export interface LiveScoutingMatch {
    report: ScoutingReport;
    batter: ScoutingReportBatter;
}

export const scoutingReportService = {
    listByTeam: async (teamId: string): Promise<ScoutingReport[]> => {
        const response = await api.get<{ reports: ScoutingReport[] }>(`/scouting-reports/team/${teamId}`);
        return response.data.reports;
    },

    getById: async (reportId: string): Promise<ScoutingReportWithBatters> => {
        const response = await api.get<{ report: ScoutingReportWithBatters }>(`/scouting-reports/${reportId}`);
        return response.data.report;
    },

    getByGameId: async (gameId: string): Promise<ScoutingReportWithBatters | null> => {
        const response = await api.get<{ report: ScoutingReportWithBatters | null }>(`/scouting-reports/game/${gameId}`);
        return response.data.report;
    },

    create: async (teamId: string, payload: ScoutingReportInput): Promise<ScoutingReport> => {
        const response = await api.post<{ report: ScoutingReport }>(`/scouting-reports/team/${teamId}`, payload);
        return response.data.report;
    },

    update: async (reportId: string, payload: Partial<ScoutingReportInput>): Promise<ScoutingReport> => {
        const response = await api.patch<{ report: ScoutingReport }>(`/scouting-reports/${reportId}`, payload);
        return response.data.report;
    },

    delete: async (reportId: string): Promise<void> => {
        await api.delete(`/scouting-reports/${reportId}`);
    },

    addBatter: async (reportId: string, payload: ScoutingReportBatterInput): Promise<ScoutingReportBatter> => {
        const response = await api.post<{ batter: ScoutingReportBatter }>(`/scouting-reports/${reportId}/batters`, payload);
        return response.data.batter;
    },

    updateBatter: async (batterId: string, payload: Partial<ScoutingReportBatterInput>): Promise<ScoutingReportBatter> => {
        const response = await api.patch<{ batter: ScoutingReportBatter }>(`/scouting-reports/batters/${batterId}`, payload);
        return response.data.batter;
    },

    deleteBatter: async (batterId: string): Promise<void> => {
        await api.delete(`/scouting-reports/batters/${batterId}`);
    },

    importLineup: async (reportId: string, sourceGameId: string): Promise<ScoutingReportBatter[]> => {
        const response = await api.post<{ batters: ScoutingReportBatter[] }>(
            `/scouting-reports/${reportId}/import-lineup/${sourceGameId}`
        );
        return response.data.batters;
    },

    getLiveMatch: async (gameId: string, name: string, jersey?: number | null): Promise<LiveScoutingMatch | null> => {
        const params = new URLSearchParams();
        if (name) params.set('name', name);
        if (jersey !== null && jersey !== undefined) params.set('jersey', String(jersey));
        const response = await api.get<{ match: LiveScoutingMatch | null }>(
            `/scouting-reports/game/${gameId}/live-match?${params.toString()}`
        );
        return response.data.match;
    },
};

export default scoutingReportService;
