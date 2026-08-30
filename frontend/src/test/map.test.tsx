import { describe, it, expect } from 'vitest';
import { Complaint, Cluster } from '../types';
import { calculateSlaStatus } from '../utils/sla';
import { formatScore, formatPercent } from '../utils/formatters';

describe('GIS Map Marker Transformations & Helpers', () => {
  it('computes cluster centroid from member complaints', () => {
    const complaints: Complaint[] = [
      {
        complaint_id: 'cmp-1',
        title: 'Pothole 1',
        description: 'Road damage',
        lat: 28.6100,
        lng: 77.2000,
        images: [],
        audio: null,
        language: 'en',
        department: 'Public Works',
        category: 'Roads & Potholes',
        confidence: 0.9,
        extracted_severity_keywords: [],
        cluster_id: 'clust-1',
        created_at: new Date().toISOString(),
      },
      {
        complaint_id: 'cmp-2',
        title: 'Pothole 2',
        description: 'Road damage',
        lat: 28.6200,
        lng: 77.2200,
        images: [],
        audio: null,
        language: 'en',
        department: 'Public Works',
        category: 'Roads & Potholes',
        confidence: 0.9,
        extracted_severity_keywords: [],
        cluster_id: 'clust-1',
        created_at: new Date().toISOString(),
      },
    ];

    const avgLat = complaints.reduce((sum, c) => sum + c.lat, 0) / complaints.length;
    const avgLng = complaints.reduce((sum, c) => sum + c.lng, 0) / complaints.length;

    expect(avgLat).toBeCloseTo(28.6150, 4);
    expect(avgLng).toBeCloseTo(27.2100 + 50.0000, 4); // 77.2100
  });

  it('determines priority badge tier and SLA warning correctly', () => {
    expect(formatScore(0.856)).toBe('0.86');
    expect(formatPercent(0.924)).toBe('92%');

    const highPriorityCluster: Cluster = {
      cluster_id: 'c-high',
      member_complaint_ids: ['cmp-1'],
      department: 'Electricity Board',
      priority_score: 0.88,
      sla_deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      status: 'submitted',
      root_cause_asset: 'WIRE-DOWN',
    };

    const sla = calculateSlaStatus(highPriorityCluster.sla_deadline);
    expect(sla.isWarning).toBe(true);
    expect(sla.isOverdue).toBe(false);
    expect(sla.text).toContain('Urgent');
  });
});
