import { apiClient } from './api';
import { Cluster, ClusterPatch, EscalationItem, PublicMapCluster } from '../types';

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

  getPublicMapClusters: async (params?: {
    limit?: number;
    offset?: number;
    category?: string;
    status?: string;
  }): Promise<PublicMapCluster[]> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const endpoint = `/api/public/map${qs ? `?${qs}` : ''}`;
    return apiClient.get<PublicMapCluster[]>(endpoint);
  },
};
