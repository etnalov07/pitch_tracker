import {
    ScoutingReport,
    ScoutingReportBatter,
    ScoutingReportBatterInput,
    ScoutingReportInput,
    ScoutingReportWithBatters,
} from '@pitch-tracker/shared';
import api from '../../../services/api';

export interface LiveScoutingMatch {
    report: ScoutingReport;
    batter: ScoutingReportBatter;
}

export const scoutingReportsApi = {
    listByTeam: async (teamId: string): Promise<ScoutingReport[]> => {
        const res = await api.get<{ reports: ScoutingReport[] }>(`/scouting-reports/team/${teamId}`);
        return res.data.reports;
    },

    getById: async (reportId: string): Promise<ScoutingReportWithBatters> => {
        const res = await api.get<{ report: ScoutingReportWithBatters }>(`/scouting-reports/${reportId}`);
        return res.data.report;
    },

    getByGameId: async (gameId: string): Promise<ScoutingReportWithBatters | null> => {
        const res = await api.get<{ report: ScoutingReportWithBatters | null }>(`/scouting-reports/game/${gameId}`);
        return res.data.report;
    },

    create: async (teamId: string, payload: ScoutingReportInput): Promise<ScoutingReport> => {
        const res = await api.post<{ report: ScoutingReport }>(`/scouting-reports/team/${teamId}`, payload);
        return res.data.report;
    },

    update: async (reportId: string, payload: Partial<ScoutingReportInput>): Promise<ScoutingReport> => {
        const res = await api.patch<{ report: ScoutingReport }>(`/scouting-reports/${reportId}`, payload);
        return res.data.report;
    },

    delete: async (reportId: string): Promise<void> => {
        await api.delete(`/scouting-reports/${reportId}`);
    },

    addBatter: async (reportId: string, payload: ScoutingReportBatterInput): Promise<ScoutingReportBatter> => {
        const res = await api.post<{ batter: ScoutingReportBatter }>(`/scouting-reports/${reportId}/batters`, payload);
        return res.data.batter;
    },

    updateBatter: async (batterId: string, payload: Partial<ScoutingReportBatterInput>): Promise<ScoutingReportBatter> => {
        const res = await api.patch<{ batter: ScoutingReportBatter }>(`/scouting-reports/batters/${batterId}`, payload);
        return res.data.batter;
    },

    deleteBatter: async (batterId: string): Promise<void> => {
        await api.delete(`/scouting-reports/batters/${batterId}`);
    },

    getLiveMatch: async (gameId: string, name: string, jersey?: number | null): Promise<LiveScoutingMatch | null> => {
        const params = new URLSearchParams();
        if (name) params.set('name', name);
        if (jersey !== null && jersey !== undefined) params.set('jersey', String(jersey));
        const res = await api.get<{ match: LiveScoutingMatch | null }>(
            `/scouting-reports/game/${gameId}/live-match?${params.toString()}`
        );
        return res.data.match;
    },
};

export default scoutingReportsApi;
