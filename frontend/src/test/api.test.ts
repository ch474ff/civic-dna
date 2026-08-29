import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, authStorage, ApiError } from '../services/api';

describe('Central API Client', () => {
  beforeEach(() => {
    authStorage.clearToken();
    vi.restoreAllMocks();
  });

  it('performs GET requests successfully', async () => {
    const mockData = { status: 'ok' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    } as any);

    const result = await apiClient.get('/health');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('automatically attaches Authorization Bearer token when logged in', async () => {
    authStorage.setToken('test-officer-token');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ cluster_id: 'cl-1' }),
    } as any);

    await apiClient.get('/api/clusters/cl-1');
    const calledHeaders = (global.fetch as any).mock.calls[0][1].headers;
    expect(calledHeaders.get('Authorization')).toBe('Bearer test-officer-token');
  });

  it('normalizes 404 not_found error responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: {
          code: 'not_found',
          message: 'Complaint not found',
          details: { complaint_id: 'fake-id' },
        },
      }),
    } as any);

    try {
      await apiClient.get('/api/complaints/fake-id');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
      expect(err.code).toBe('not_found');
      expect(err.message).toBe('Complaint not found');
    }
  });

  it('normalizes 401 unauthorized errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: {
          code: 'unauthorized',
          message: 'Invalid credentials',
          details: null,
        },
      }),
    } as any);

    try {
      await apiClient.post('/api/auth/login', { username: 'bad', password: 'bad' });
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(err.code).toBe('unauthorized');
    }
  });

  it('handles network connection failures gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    try {
      await apiClient.get('/health');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('NETWORK_ERROR');
    }
  });
});
