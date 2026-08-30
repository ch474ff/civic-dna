import { apiClient } from './api';
import { Cluster, ClusterPatch, EscalationItem } from '../types';

export const clusterService = {
  listClusters: async (sort: 'priority_desc' | 'priority_asc' = 'priority_desc'): Promise<Cluster[]> => {
    return apiClient.get<Cluster[]>(`/api/clusters?sort=${sort}`, {
      requiresAuth: true,
    });
  },

  getCluster: async (clusterId: string): Promise<Cluster> => {
    return apiClient.get<Cluster>(`/api/clusters/${encodeURIComponent(clusterId)}`, {
      requiresAuth: true,
    });
  },

  patchCluster: async (clusterId: string, payload: ClusterPatch): Promise<Cluster> => {
    return apiClient.patch<Cluster>(`/api/clusters/${encodeURIComponent(clusterId)}`, payload, {
      requiresAuth: true,
    });
  },

  getEscalations: async (): Promise<EscalationItem[]> => {
    return apiClient.get<EscalationItem[]>('/api/clusters/escalations', {
      requiresAuth: true,
    });
  },
};
