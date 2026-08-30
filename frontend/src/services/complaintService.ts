import { apiClient } from './api';
import {
  Complaint,
  ComplaintCreate,
  ComplaintStatusResponse,
  ComplaintTimelineItem,
  Feedback,
  FeedbackCreate,
} from '../types';

export const complaintService = {
  createComplaint: async (payload: ComplaintCreate): Promise<Complaint> => {
    return apiClient.post<Complaint>('/api/complaints', payload);
  },

  getComplaint: async (complaintId: string): Promise<Complaint> => {
    return apiClient.get<Complaint>(`/api/complaints/${encodeURIComponent(complaintId)}`);
  },

  getComplaintStatus: async (complaintId: string): Promise<ComplaintStatusResponse> => {
    return apiClient.get<ComplaintStatusResponse>(`/api/complaints/${encodeURIComponent(complaintId)}/status`);
  },

  getComplaintTimeline: async (complaintId: string): Promise<ComplaintTimelineItem[]> => {
    return apiClient.get<ComplaintTimelineItem[]>(`/api/complaints/${encodeURIComponent(complaintId)}/timeline`);
  },

  submitFeedback: async (complaintId: string, payload: FeedbackCreate): Promise<Feedback> => {
    return apiClient.post<Feedback>(`/api/complaints/${encodeURIComponent(complaintId)}/feedback`, payload);
  },
};
