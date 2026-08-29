import { apiClient, authStorage } from './api';
import { LoginRequest, TokenResponse } from '../types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    const data = await apiClient.post<TokenResponse>('/api/auth/login', credentials);
    if (data.access_token) {
      authStorage.setToken(data.access_token);
    }
    return data;
  },

  logout: (): void => {
    authStorage.clearToken();
  },

  isAuthenticated: (): boolean => {
    return !!authStorage.getToken();
  },

  getToken: (): string | null => {
    return authStorage.getToken();
  },
};
