import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { OfficerDashboardPage } from '../pages/OfficerDashboardPage';
import { clusterService } from '../services/clusterService';

describe('Officer Dashboard & Cluster Triage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cluster list and enables search filtering', async () => {
    const mockClusters = [
      {
        cluster_id: 'clust-elec-101',
        member_complaint_ids: ['c1', 'c2'],
        department: 'Electricity Board',
        priority_score: 0.85,
        sla_deadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
        status: 'submitted',
        root_cause_asset: 'TRANSFORMER-A',
      },
      {
        cluster_id: 'clust-road-202',
        member_complaint_ids: ['c3'],
        department: 'Public Works',
        priority_score: 0.35,
        sla_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        status: 'in_progress',
        root_cause_asset: null,
      },
    ];

    vi.spyOn(clusterService, 'listClusters').mockImplementation(() => Promise.resolve(mockClusters));

    const { unmount } = render(<OfficerDashboardPage />);

    expect(await screen.findByText('clust-elec-101')).toBeInTheDocument();
    expect(screen.getByText('clust-road-202')).toBeInTheDocument();
    expect(screen.getAllByText('Electricity Board').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Public Works').length).toBeGreaterThanOrEqual(1);

    // Test filter search
    const searchInput = screen.getByPlaceholderText(/Search Cluster ID/i);
    fireEvent.change(searchInput, { target: { value: 'TRANSFORMER' } });

    expect(screen.getByText('clust-elec-101')).toBeInTheDocument();
    expect(screen.queryByText('clust-road-202')).not.toBeInTheDocument();

    unmount();
  });

  it('executes cluster triage updates via PATCH', async () => {
    const mockClusters = [
      {
        cluster_id: 'clust-pothole-1',
        member_complaint_ids: ['c1'],
        department: 'Public Works',
        priority_score: 0.5,
        sla_deadline: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
        status: 'submitted',
        root_cause_asset: null,
      },
    ];

    const mockPatched = {
      ...mockClusters[0],
      status: 'in_progress',
      root_cause_asset: 'SECTOR-5-ROAD',
    };

    vi.spyOn(clusterService, 'listClusters').mockImplementation(() => Promise.resolve(mockClusters));
    const patchSpy = vi.spyOn(clusterService, 'patchCluster').mockImplementation(() => Promise.resolve(mockPatched));

    const { unmount } = render(<OfficerDashboardPage />);

    expect(await screen.findByText('clust-pothole-1')).toBeInTheDocument();

    const triageBtn = screen.getByRole('button', { name: /Triage/i });
    fireEvent.click(triageBtn);

    expect(screen.getByText(/Triage Cluster/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    expect(patchSpy).toHaveBeenCalledWith('clust-pothole-1', expect.any(Object));

    unmount();
  });
});
