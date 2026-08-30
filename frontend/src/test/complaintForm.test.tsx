import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CitizenSubmitPage } from '../pages/CitizenSubmitPage';
import { complaintService } from '../services/complaintService';

describe('Citizen Complaint Form & Receipt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks navigation to evidence when location is not confirmed', async () => {
    const mockNavigate = vi.fn();
    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Fill title and description
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water leak on main street' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'Severe pipeline burst flooding road' },
    });

    // Go to Step 2
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    // Warning state is visible
    expect(screen.getByText(/Location not confirmed/i)).toBeInTheDocument();

    // Next step button is disabled (both desktop and mobile)
    const nextBtns = screen.getAllByRole('button', { name: /Continue to Evidence/i });
    nextBtns.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('renders intake inputs, confirms location, and handles successful submission', async () => {
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
      created_at: new Date().toISOString(),
    };

    vi.spyOn(complaintService, 'createComplaint').mockResolvedValue(mockCreated);
    const mockNavigate = vi.fn();

    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Step 1: Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water leak on main street' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'Severe pipeline burst flooding road' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    // Step 2: Confirm location by editing coordinates
    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '28.6140' } });

    // Location confirmed badge appears
    expect(screen.getByText(/Location Confirmed/i)).toBeInTheDocument();

    // Go to Step 3
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Evidence/i })[0]);

    // Step 3: Go to Step 4
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Review/i })[0]);

    // Step 4: Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    // Verify instant AI classification receipt
    await waitFor(() => {
      expect(screen.getByText(/Grievance Registered Successfully/i)).toBeInTheDocument();
      expect(screen.getByText('cmp-101')).toBeInTheDocument();
      expect(screen.getByText('Water Department')).toBeInTheDocument();
      expect(screen.getByText('Water Supply')).toBeInTheDocument();
      expect(screen.getByText('en')).toBeInTheDocument();
    });
  });

  it('validates coordinate range bounds when location is confirmed with out-of-bounds values', async () => {
    const mockNavigate = vi.fn();
    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Step 1: Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'Test Description' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    // Enter invalid latitude > 90
    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '199' } });

    // Go to Step 3 & Step 4
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Evidence/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Review/i })[0]);

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please provide valid coordinates/i)).toBeInTheDocument();
  });
});
