import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CitizenSubmitPage } from '../pages/CitizenSubmitPage';
import { complaintService } from '../services/complaintService';

describe('Citizen Complaint Form & Receipt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders intake inputs and handles submission', async () => {
    const mockCreated = {
      complaint_id: 'cmp-101',
      title: 'Water leak on main street',
      description: 'Severe pipeline burst flooding road',
      lat: 28.6139,
      lng: 77.2090,
      images: [],
      audio: null,
      language: 'en',
      department: 'Water Department',
      category: 'Water Supply',
      confidence: 0.85,
      extracted_severity_keywords: ['flood', 'burst'],
      cluster_id: 'clust-w1',
    };

    vi.spyOn(complaintService, 'createComplaint').mockResolvedValue(mockCreated);
    const mockNavigate = vi.fn();

    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water leak on main street' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact location/i), {
      target: { value: 'Severe pipeline burst flooding road' },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    // Verify instant AI classification receipt
    await waitFor(() => {
      expect(screen.getByText(/Grievance Registered Successfully/i)).toBeInTheDocument();
      expect(screen.getByText('cmp-101')).toBeInTheDocument();
      expect(screen.getByText('Water Department')).toBeInTheDocument();
      expect(screen.getByText('Water Supply')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  it('validates coordinate range bounds', async () => {
    const mockNavigate = vi.fn();
    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact location/i), {
      target: { value: 'Test Description' },
    });

    // Enter invalid latitude > 90
    const latInput = screen.getByDisplayValue('28.6139');
    fireEvent.change(latInput, { target: { value: '199' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please provide valid coordinates/i)).toBeInTheDocument();
  });
});
