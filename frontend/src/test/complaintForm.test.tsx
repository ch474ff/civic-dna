import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CitizenSubmitPage } from '../pages/CitizenSubmitPage';
import { complaintService } from '../services/complaintService';

describe('Citizen Complaint Form & Receipt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks submission when location is not confirmed', async () => {
    const mockNavigate = vi.fn();
    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Fill title and description
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water leak on main street' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact location/i), {
      target: { value: 'Severe pipeline burst flooding road' },
    });

    // Warning state is visible
    expect(screen.getByText(/Location not confirmed/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    // Submission is blocked with inline error
    expect(await screen.findByText(/Location not confirmed — click map or use GPS/i)).toBeInTheDocument();
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

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water leak on main street' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact location/i), {
      target: { value: 'Severe pipeline burst flooding road' },
    });

    // Confirm location by editing coordinates or clicking GPS
    const latInput = screen.getByDisplayValue('28.6139');
    fireEvent.change(latInput, { target: { value: '28.6140' } });

    // Location confirmed badge appears
    expect(screen.getByText(/Location Confirmed/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    // Verify instant AI classification receipt
    await waitFor(() => {
      expect(screen.getByText(/Grievance Registered Successfully/i)).toBeInTheDocument();
      expect(screen.getByText('cmp-101')).toBeInTheDocument();
      expect(screen.getByText('Water Department')).toBeInTheDocument();
      expect(screen.getByText('Water Supply')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText(/Submission Language:/i)).toBeInTheDocument();
    });
  });

  it('validates coordinate range bounds when location is confirmed with out-of-bounds values', async () => {
    const mockNavigate = vi.fn();
    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact location/i), {
      target: { value: 'Test Description' },
    });

    // Enter invalid latitude > 90 (also marks location as confirmed by user input)
    const latInput = screen.getByDisplayValue('28.6139');
    fireEvent.change(latInput, { target: { value: '199' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please provide valid coordinates/i)).toBeInTheDocument();
  });

  it('supports selecting Hinglish and submitting Hinglish complaints', async () => {
    const mockCreated = {
      complaint_id: 'cmp-hinglish-101',
      title: 'Water pipeline leak ho rahi hai',
      description: 'Hamare area mein main water pipeline bahut badly leak ho rahi hai.',
      lat: 28.6140,
      lng: 77.2090,
      images: [],
      audio: null,
      language: 'hinglish',
      department: 'Water Department',
      category: 'Water Supply',
      confidence: 0.90,
      extracted_severity_keywords: ['leak', 'waste'],
      cluster_id: 'clust-w1',
      created_at: new Date().toISOString(),
    };

    const createSpy = vi.spyOn(complaintService, 'createComplaint').mockResolvedValue(mockCreated);
    const mockNavigate = vi.fn();

    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Verify Hinglish option is rendered in the select dropdown
    const select = screen.getByRole('combobox');
    expect(screen.getByRole('option', { name: /Hinglish/i })).toBeInTheDocument();

    // Select Hinglish
    fireEvent.change(select, { target: { value: 'hinglish' } });

    // Fill Hinglish title and description
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water pipeline leak ho rahi hai' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the exact location/i), {
      target: { value: 'Hamare area mein main water pipeline bahut badly leak ho rahi hai.' },
    });

    // Confirm location
    const latInput = screen.getByDisplayValue('28.6139');
    fireEvent.change(latInput, { target: { value: '28.6140' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'hinglish',
          title: 'Water pipeline leak ho rahi hai',
          description: 'Hamare area mein main water pipeline bahut badly leak ho rahi hai.',
        })
      );
      expect(screen.getByText(/Grievance Registered Successfully/i)).toBeInTheDocument();
      expect(screen.getByText('Submission Language:')).toBeInTheDocument();
      expect(screen.getAllByText(/hinglish/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
