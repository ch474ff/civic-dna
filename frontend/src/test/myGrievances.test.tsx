import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MyGrievancesPage } from '../pages/MyGrievancesPage';
import { complaintService } from '../services/complaintService';
import { clusterService } from '../services/clusterService';

describe('My Grievances List Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders empty state if no grievances exist in localStorage', () => {
    const mockNavigateToTrack = vi.fn();
    const mockNavigateToSubmit = vi.fn();

    render(
      <MyGrievancesPage
        onNavigateToTrack={mockNavigateToTrack}
        onNavigateToSubmit={mockNavigateToSubmit}
      />
    );

    expect(screen.getByText(/You haven't filed any grievances yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Report an issue in your community/i)).toBeInTheDocument();
    
    // Clicking File a Grievance button navigates to submit
    const fileBtn = screen.getAllByRole('button', { name: /File a Grievance/i })[1];
    fireEvent.click(fileBtn);
    expect(mockNavigateToSubmit).toHaveBeenCalled();
  });

  it('loads and lists grievances from localStorage ids', async () => {
    const mockNavigateToTrack = vi.fn();
    const mockNavigateToSubmit = vi.fn();

    localStorage.setItem('my_grievances', JSON.stringify(['cmp-501', 'cmp-502']));

    const mockComp1 = {
      complaint_id: 'cmp-501',
      title: 'Pothole in sector 5',
      description: 'Dangerous pothole',
      lat: 12.9,
      lng: 77.5,
      images: [],
      audio: null,
      language: 'en',
      department: 'Roads Dept',
      category: 'Potholes',
      confidence: 0.9,
      extracted_severity_keywords: [],
      cluster_id: 'clust-pothole',
      created_at: new Date().toISOString(),
    };

    const mockComp2 = {
      complaint_id: 'cmp-502',
      title: 'Water leak',
      description: 'Pipe leaking water',
      lat: 12.8,
      lng: 77.4,
      images: [],
      audio: null,
      language: 'en',
      department: 'Water Dept',
      category: 'Water Leakage',
      confidence: 0.8,
      extracted_severity_keywords: [],
      cluster_id: null,
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    };

    const mockCluster = {
      cluster_id: 'clust-pothole',
      member_complaint_ids: ['cmp-501'],
      department: 'Roads Dept',
      priority_score: 0.5,
      sla_deadline: new Date().toISOString(),
      status: 'resolved',
      root_cause_asset: 'SECTOR-5',
    };

    vi.spyOn(complaintService, 'getComplaint').mockImplementation(async (id) => {
      if (id === 'cmp-501') return mockComp1;
      if (id === 'cmp-502') return mockComp2;
      throw new Error('Not found');
    });
      
    vi.spyOn(clusterService, 'getCluster').mockResolvedValue(mockCluster);

    render(
      <MyGrievancesPage
        onNavigateToTrack={mockNavigateToTrack}
        onNavigateToSubmit={mockNavigateToSubmit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pothole in sector 5')).toBeInTheDocument();
      expect(screen.getByText('Water leak')).toBeInTheDocument();
      expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);
    });

    // Clicking View Grievance triggers navigate to track
    const viewBtns = screen.getAllByRole('button', { name: /View grievance/i });
    fireEvent.click(viewBtns[0]);
    expect(mockNavigateToTrack).toHaveBeenCalledWith('cmp-501');
  });
});
