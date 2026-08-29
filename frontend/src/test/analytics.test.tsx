import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { analyticsService } from '../services/analyticsService';

describe('Analytics Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders aggregated analytics telemetry from summary endpoint', async () => {
    const mockSummary = {
      complaints_total: 42,
      clusters_total: 12,
      clusters_by_status: {
        submitted: 4,
        in_progress: 5,
        resolved: 3,
      },
      complaints_by_department: {
        'Public Works': 20,
        'Water Department': 15,
        'Electricity Board': 7,
      },
      average_priority_score: 0.62,
    };

    vi.spyOn(analyticsService, 'getSummary').mockResolvedValue(mockSummary);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('0.62')).toBeInTheDocument();
      expect(screen.getByText('Public Works')).toBeInTheDocument();
      expect(screen.getByText('Water Department')).toBeInTheDocument();
      expect(screen.getByText('Electricity Board')).toBeInTheDocument();
    });
  });
});
