import {
    PerformanceSummary,
    PublicGameReport,
    SummarySourceType,
    BatterBreakdown,
    TeamOffenseSummary,
} from '@pitch-tracker/shared';
import api from './api';
import publicApi from './publicApi';

export const performanceSummaryService = {
    getSummary: async (sourceType: SummarySourceType, sourceId: string, pitcherId?: string): Promise<PerformanceSummary> => {
        const params = pitcherId ? { pitcher_id: pitcherId } : undefined;
        const response = await api.get<{ summary: PerformanceSummary }>(`/performance-summaries/${sourceType}/${sourceId}`, {
            params,
        });
        return response.data.summary;
    },

    getPitcherSummaries: async (
        pitcherId: string,
        limit = 20,
        offset = 0
    ): Promise<{ summaries: PerformanceSummary[]; total_count: number }> => {
        const response = await api.get<{ summaries: PerformanceSummary[]; total_count: number }>(
            `/performance-summaries/pitcher/${pitcherId}`,
            { params: { limit, offset } }
        );
        return response.data;
    },

    getGamePitcherSummaries: async (gameId: string): Promise<PerformanceSummary[]> => {
        const response = await api.get<{ summaries: PerformanceSummary[] }>(`/performance-summaries/game/${gameId}/pitchers`);
        return response.data.summaries;
    },

    regenerateNarrative: async (id: string): Promise<PerformanceSummary> => {
        const response = await api.post<{ summary: PerformanceSummary }>(`/performance-summaries/${id}/regenerate-narrative`);
        return response.data.summary;
    },

    getBatterBreakdown: async (gameId: string): Promise<BatterBreakdown[]> => {
        const response = await api.get<{ breakdown: BatterBreakdown[] }>(`/performance-summaries/game/${gameId}/batter-breakdown`);
        return response.data.breakdown;
    },

    getMyTeamBatterBreakdown: async (gameId: string): Promise<BatterBreakdown[]> => {
        const response = await api.get<{ breakdown: BatterBreakdown[] }>(
            `/performance-summaries/game/${gameId}/my-team-batter-breakdown`
        );
        return response.data.breakdown;
    },

    getOpponentAttackSummary: async (gameId: string): Promise<TeamOffenseSummary> => {
        const response = await api.get<{ summary: TeamOffenseSummary }>(`/performance-summaries/game/${gameId}/opponent-attack`);
        return response.data.summary;
    },

    regenerateTeamOffenseNarrative: async (gameId: string): Promise<TeamOffenseSummary> => {
        const response = await api.post<{ summary: TeamOffenseSummary }>(
            `/performance-summaries/team-offense/${gameId}/regenerate-narrative`
        );
        return response.data.summary;
    },

    emailPostGameReport: async (gameId: string, emails: string[]): Promise<string[]> => {
        const response = await api.post<{ message: string; recipients: string[] }>(
            `/performance-summaries/game/${gameId}/email-report`,
            { emails }
        );
        return response.data.recipients;
    },

    // Unauthenticated — used by the public /report/:gameId page. Calls
    // through `publicApi` so we don't get bounced to /login on any error.
    getPublicReport: async (gameId: string): Promise<PublicGameReport> => {
        const response = await publicApi.get<{ report: PublicGameReport }>(`/performance-summaries/game/${gameId}/public-report`);
        return response.data.report;
    },
};
