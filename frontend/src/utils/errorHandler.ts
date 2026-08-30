import { ApiError } from '../services/api';

/**
 * Reusable helper to transform API and network errors into clean, citizen-safe messages.
 */
export function getApiErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (import.meta.env.DEV) {
    console.error('[CivicDNA API Error]:', error);
  }

  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'NETWORK_ERROR') {
      return 'Unable to reach the Civic DNA server. Please check your connection and try again.';
    }

    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    if (error.status === 404) {
      return error.message || 'The requested resource was not found.';
    }

    if (error.status === 422) {
      if (error.details && Array.isArray(error.details) && error.details.length > 0) {
        const first = error.details[0];
        const field = first.loc ? first.loc[first.loc.length - 1] : 'field';
        return `Validation error on ${field}: ${first.msg || error.message}`;
      }
      return error.message || 'Please verify your input fields and try again.';
    }

    if (error.status === 400) {
      return error.message || 'Invalid request. Please check your details.';
    }

    if (error.status === 500) {
      return 'Something went wrong while processing your grievance. Please try again.';
    }

    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Unable to reach the Civic DNA server. Please check your connection and try again.';
    }
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
