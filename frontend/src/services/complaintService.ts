import { apiClient } from './api';
import { Complaint, ComplaintCreate, Feedback, FeedbackCreate } from '../types';

export const complaintService = {
  createComplaint: async (payload: ComplaintCreate): Promise<Complaint> => {
    return apiClient.post<Complaint>('/api/complaints', payload);
  },

  getComplaint: async (complaintId: string): Promise<Complaint> => {
    return apiClient.get<Complaint>(`/api/complaints/${encodeURIComponent(complaintId)}`);
  },

  submitFeedback: async (complaintId: string, payload: FeedbackCreate): Promise<Feedback> => {
    return apiClient.post<Feedback>(`/api/complaints/${encodeURIComponent(complaintId)}/feedback`, payload);
  },
};
