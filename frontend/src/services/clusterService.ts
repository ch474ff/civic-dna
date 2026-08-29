import { apiClient } from './api';
import { Cluster, ClusterPatch } from '../types';

export const clusterService = {
  listClusters: async (sort: 'priority' | '-priority' = 'priority'): Promise<Cluster[]> => {
    return apiClient.get<Cluster[]>(`/api/clusters?sort=${sort}`);
  },

  getCluster: async (clusterId: string): Promise<Cluster> => {
    return apiClient.get<Cluster>(`/api/clusters/${encodeURIComponent(clusterId)}`);
  },

  patchCluster: async (clusterId: string, payload: ClusterPatch): Promise<Cluster> => {
    return apiClient.patch<Cluster>(`/api/clusters/${encodeURIComponent(clusterId)}`, payload, {
      requiresAuth: true,
    });
  },
};
