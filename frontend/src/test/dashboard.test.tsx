import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { OfficerDashboardPage } from '../pages/OfficerDashboardPage';
import { clusterService } from '../services/clusterService';

describe('Officer Dashboard & Token Command', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Token terminology and hides numeric priority scores in table', async () => {
    const mockClusters = [
      {
        cluster_id: 'clust-crit-101',
        member_complaint_ids: ['c1', 'c2'],
        department: 'Electricity Board',
        priority_score: 0.85,
        sla_deadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
        status: 'submitted',
        root_cause_asset: 'TRANSFORMER-A',
      },
      {
        cluster_id: 'clust-high-202',
        member_complaint_ids: ['c3'],
        department: 'Public Works',
        priority_score: 0.65,
        sla_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        status: 'acknowledged',
        root_cause_asset: 'ROAD-BRIDGE',
      },
      {
        cluster_id: 'clust-med-303',
        member_complaint_ids: ['c4'],
        department: 'Water Department',
        priority_score: 0.45,
        sla_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        status: 'in_progress',
        root_cause_asset: 'PIPE-MAIN',
      },
      {
        cluster_id: 'clust-low-404',
        member_complaint_ids: ['c5'],
        department: 'Sanitation',
        priority_score: 0.20,
        sla_deadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        status: 'resolved',
        root_cause_asset: null,
      },
    ];

    vi.spyOn(clusterService, 'listClusters').mockResolvedValue(mockClusters);
    vi.spyOn(clusterService, 'getEscalations').mockResolvedValue([]);

    const { unmount } = render(<OfficerDashboardPage />);

    // 1. "Token Command" is displayed, "Cluster Command" is NOT
    expect(await screen.findByText(/Officer Incident Triage & Token Command/i)).toBeInTheDocument();
    expect(screen.queryByText(/Officer Incident Triage & Cluster Command/i)).not.toBeInTheDocument();

    // 2. Table column header says "Token ID" (not "Cluster ID")
    expect(screen.getByRole('columnheader', { name: 'Token ID' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Cluster ID' })).not.toBeInTheDocument();

    // 3. Search placeholder has "Search Token ID or Asset..."
    expect(screen.getByPlaceholderText(/Search Token ID or Asset/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search Cluster ID/i)).not.toBeInTheDocument();

    // 4. Priority tiers display correctly without numeric floats
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();

    // 5. Numeric scores (0.85, 0.65, 0.45, 0.20) are NOT displayed in table
    expect(screen.queryByText(/0\.85/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.65/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.45/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.20/)).not.toBeInTheDocument();

    // 6. Test search filter functionality
    const searchInput = screen.getByPlaceholderText(/Search Token ID or Asset/i);
    fireEvent.change(searchInput, { target: { value: 'TRANSFORMER' } });

    expect(screen.getByText('clust-crit-101')).toBeInTheDocument();
    expect(screen.queryByText('clust-high-202')).not.toBeInTheDocument();

    unmount();
  });

  it('preserves internal cluster_id for PATCH triage operations', async () => {
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

    vi.spyOn(clusterService, 'listClusters').mockResolvedValue(mockClusters);
    vi.spyOn(clusterService, 'getEscalations').mockResolvedValue([]);
    const patchSpy = vi.spyOn(clusterService, 'patchCluster').mockResolvedValue(mockPatched);

    const { unmount } = render(<OfficerDashboardPage />);

    expect(await screen.findByText('clust-pothole-1')).toBeInTheDocument();

    const triageBtn = screen.getByRole('button', { name: /Triage/i });
    fireEvent.click(triageBtn);

    // Modal title uses Token terminology
    expect(screen.getByText(/Triage Token/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('clust-pothole-1', expect.any(Object));
    });

    unmount();
  });
});
