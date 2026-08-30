import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CitizenTrackPage } from '../pages/CitizenTrackPage';
import { complaintService } from '../services/complaintService';
import { clusterService } from '../services/clusterService';
import { calculateSlaStatus } from '../utils/sla';

describe('Citizen Tracking & SLA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates SLA status correctly for overdue and upcoming deadlines', () => {
    const pastDate = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    const overdueStatus = calculateSlaStatus(pastDate);
    expect(overdueStatus.isOverdue).toBe(true);
    expect(overdueStatus.text).toContain('Overdue');

    const futureDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const futureStatus = calculateSlaStatus(futureDate);
    expect(futureStatus.isOverdue).toBe(false);
    expect(futureStatus.text).toContain('remaining');
  });

  it('fetches complaint and cluster details on search', async () => {
    const mockComplaint = {
      complaint_id: 'cmp-202',
      title: 'Broken streetlight',
      description: 'Streetlight pole 44 not turning on at night',
      lat: 12.9716,
      lng: 77.5946,
      images: [],
      audio: null,
      language: 'en',
      department: 'Street Lighting Division',
      category: 'Street Lighting',
      confidence: 0.9,
      extracted_severity_keywords: ['dark'],
      cluster_id: 'clust-lit-1',
      created_at: new Date().toISOString(),
    };

    const mockCluster = {
      cluster_id: 'clust-lit-1',
      member_complaint_ids: ['cmp-202'],
      department: 'Street Lighting Division',
      priority_score: 0.45,
      sla_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'acknowledged',
      root_cause_asset: 'POLE-44',
    };

    vi.spyOn(complaintService, 'getComplaint').mockResolvedValue(mockComplaint);
    vi.spyOn(clusterService, 'getCluster').mockResolvedValue(mockCluster);

    render(<CitizenTrackPage initialComplaintId="cmp-202" />);

    await waitFor(() => {
      expect(screen.getByText('Broken streetlight')).toBeInTheDocument();
      expect(screen.getAllByText(/Street Lighting Division/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Streetlight pole 44 not turning on/i)).toBeInTheDocument();
    });
  });
});
