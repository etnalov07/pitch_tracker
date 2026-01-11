import api from './api';
import { AtBat, Pitch, Play, BatterHistory, PitchLocationHeatMap, SprayChart } from '../types';

export const pitchService = {
  // Create new at-bat
  createAtBat: async (atBatData: Partial<AtBat>): Promise<AtBat> => {
    const response = await api.post<AtBat>('/at-bats', atBatData);
    return response.data;
  },

  // End at-bat
  endAtBat: async (id: string, result: string, rbis?: number): Promise<AtBat> => {
    const response = await api.post<AtBat>(`/at-bats/${id}/end`, { result, rbis });
    return response.data;
  },

  // Log a pitch
  logPitch: async (pitchData: Partial<Pitch>): Promise<Pitch> => {
    const response = await api.post<Pitch>('/pitches', pitchData);
    return response.data;
  },

  // Get pitches for an at-bat
  getPitchesByAtBat: async (atBatId: string): Promise<Pitch[]> => {
    const response = await api.get<Pitch[]>(`/pitches/at-bat/${atBatId}`);
    return response.data;
  },

  // Record a play (ball in play)
  recordPlay: async (playData: Partial<Play>): Promise<Play> => {
    const response = await api.post<Play>('/plays', playData);
    return response.data;
  },

  // Get play by at-bat
  getPlayByAtBat: async (atBatId: string): Promise<Play | null> => {
    try {
      const response = await api.get<Play>(`/plays/at-bat/${atBatId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },
};

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
