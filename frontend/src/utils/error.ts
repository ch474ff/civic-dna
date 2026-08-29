import { ApiError } from '../services/api';

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Unauthorized: Please verify officer credentials or log in again.';
    if (error.status === 404) return 'Not Found: The requested complaint or cluster could not be found.';
    if (error.status === 422) {
      return error.message || 'Validation Error: Please check required fields and coordinates.';
    }
    if (error.status === 500) return 'Server Error: The backend encountered an internal error.';
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
