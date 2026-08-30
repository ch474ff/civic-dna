import { apiClient } from './api';
import { AnalyticsSummary } from '../types';

export const analyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    return apiClient.get<AnalyticsSummary>('/api/analytics/summary');
  },

  getHealth: async (): Promise<{ status: string }> => {
    return apiClient.get<{ status: string }>('/health');
  },
};
