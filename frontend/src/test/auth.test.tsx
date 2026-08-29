import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { OfficerLoginPage } from '../pages/OfficerLoginPage';
import { authService } from '../services/authService';
import { AuthProvider } from '../context/AuthContext';

describe('Officer Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits credentials and persists JWT token', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue({
      access_token: 'mock-jwt-token-xyz',
      token_type: 'bearer',
    });

    const onLoginSuccess = vi.fn();

    render(
      <AuthProvider>
        <OfficerLoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    const userField = screen.getByPlaceholderText('officer');
    const passField = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });

    fireEvent.change(userField, { target: { value: 'officer' } });
    fireEvent.change(passField, { target: { value: 'changeme' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        username: 'officer',
        password: 'changeme',
      });
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('displays friendly error message on 401 invalid credentials', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new Error('Invalid credentials')
    );

    const onLoginSuccess = vi.fn();

    render(
      <AuthProvider>
        <OfficerLoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
