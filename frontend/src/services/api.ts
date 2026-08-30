import { ApiErrorResponse } from '../types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const getApiBaseUrl = (): string => {
  // Use Vite environment variable if present, fallback to local backend port
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
};

const TOKEN_KEY = 'civic_dna_officer_token';

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to store auth token:', e);
    }
  },
  clearToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear auth token:', e);
    }
  },
};

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.requiresAuth || authStorage.getToken()) {
    const token = authStorage.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // Backend contract error format: { error: { code, message, details } }
      let message = `Request failed with status ${response.status}`;
      let code = `HTTP_${response.status}`;
      let details: any = null;

      if (isJson && data && typeof data === 'object') {
        const errorData = data as ApiErrorResponse;
        if (errorData.error) {
          message = errorData.error.message || message;
          code = errorData.error.code || code;
          details = errorData.error.details;
        } else if ((data as any).detail) {
          const detail = (data as any).detail;
          if (typeof detail === 'string') {
            message = detail;
          } else if (typeof detail === 'object' && detail.error) {
            message = detail.error.message || message;
            code = detail.error.code || code;
            details = detail.error.details;
          } else {
            details = detail;
          }
        }
      }

      throw new ApiError(response.status, message, code, details);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network / offline error
    throw new ApiError(0, error.message || 'Network connection failed', 'NETWORK_ERROR');
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
