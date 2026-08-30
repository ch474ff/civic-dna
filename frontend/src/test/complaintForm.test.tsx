import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CitizenSubmitPage } from '../pages/CitizenSubmitPage';
import { complaintService } from '../services/complaintService';
import { ApiError } from '../services/api';

describe('Citizen Complaint Form, Hinglish Support & Error Handling', () => {
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

  it('submits Hinglish complaint when Hinglish option is selected', async () => {
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

    // Step 1: Fill details
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Water pipeline leak ho rahi hai' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'Hamare area mein main water pipeline bahut badly leak ho rahi hai.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    // Step 2: Confirm location
    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '28.6140' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Evidence/i })[0]);

    // Step 3 & 4
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Review/i })[0]);
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
      expect(screen.getByText(/Grievance registered/i)).toBeInTheDocument();
      expect(screen.getAllByText(/hinglish/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('submits Kannada complaint when Kannada option is selected', async () => {
    const mockCreated = {
      complaint_id: 'cmp-kannada-101',
      title: 'ದೊಡ್ಡ ನೀರಿನ ಪೈಪ್ ಸೋರಿಕೆ',
      description: 'ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ಮುಖ್ಯ ನೀರಿನ ಪೈಪ್ಲೈನ್ ತುಂಬಾ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ. ತಕ್ಷಣ ದುರಸ್ತಿ ಮಾಡಬೇಕು.',
      lat: 12.9716,
      lng: 77.5946,
      images: [],
      audio: null,
      language: 'kn',
      department: 'Water Department',
      category: 'Water Supply',
      confidence: 0.95,
      extracted_severity_keywords: ['ತುಂಬಾ', 'ತಕ್ಷಣ'],
      cluster_id: 'clust-kn-w1',
      created_at: new Date().toISOString(),
    };

    const createSpy = vi.spyOn(complaintService, 'createComplaint').mockResolvedValue(mockCreated);
    const mockNavigate = vi.fn();

    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    // Verify Kannada option is rendered in the select dropdown
    const select = screen.getByRole('combobox');
    expect(screen.getByRole('option', { name: /Kannada/i })).toBeInTheDocument();

    // Select Kannada
    fireEvent.change(select, { target: { value: 'kn' } });

    // Step 1: Fill details in Kannada
    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'ದೊಡ್ಡ ನೀರಿನ ಪೈಪ್ ಸೋರಿಕೆ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ಮುಖ್ಯ ನೀರಿನ ಪೈಪ್ಲೈನ್ ತುಂಬಾ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ. ತಕ್ಷಣ ದುರಸ್ತಿ ಮಾಡಬೇಕು.' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    // Step 2: Confirm location
    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '12.9716' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Evidence/i })[0]);

    // Step 3 & 4
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Review/i })[0]);
    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'kn',
          title: 'ದೊಡ್ಡ ನೀರಿನ ಪೈಪ್ ಸೋರಿಕೆ',
          description: 'ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ಮುಖ್ಯ ನೀರಿನ ಪೈಪ್ಲೈನ್ ತುಂಬಾ ಸೋರಿಕೆಯಾಗುತ್ತಿದೆ. ತಕ್ಷಣ ದುರಸ್ತಿ ಮಾಡಬೇಕು.',
        })
      );
      expect(screen.getByText(/Grievance registered/i)).toBeInTheDocument();
      expect(screen.getAllByText(/kn/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays validation error message on HTTP 422 instead of network error', async () => {
    vi.spyOn(complaintService, 'createComplaint').mockRejectedValue(
      new ApiError(422, 'Title length must be at least 3 characters', 'validation_error')
    );
    const mockNavigate = vi.fn();

    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Road leak' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'Description' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '28.6140' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Evidence/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Review/i })[0]);

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Title length must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.queryByText(/Please check your network connection/i)).not.toBeInTheDocument();
    });
  });

  it('displays network failure message when ApiError status is 0', async () => {
    vi.spyOn(complaintService, 'createComplaint').mockRejectedValue(
      new ApiError(0, 'Failed to fetch', 'NETWORK_ERROR')
    );
    const mockNavigate = vi.fn();

    render(<CitizenSubmitPage onNavigateToTrack={mockNavigate} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Deep pothole/i), {
      target: { value: 'Road leak' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe what happened/i), {
      target: { value: 'Description' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Location/i })[0]);

    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '28.6140' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Evidence/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Continue to Review/i })[0]);

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Unable to reach the Civic DNA server/i)).toBeInTheDocument();
    });
  });
});
