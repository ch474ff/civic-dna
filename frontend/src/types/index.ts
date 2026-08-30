export type SupportedLanguage = 'en' | 'hi' | 'hinglish' | 'ta' | 'bn' | 'mr' | 'kn' | string;

export interface ComplaintCreate {
  title: string;
  description: string;
  lat: number;
  lng: number;
  images?: string[];
  audio?: string | null;
  language?: SupportedLanguage;
}

export interface ComplaintResponse {
  complaint_id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  images: string[];
  audio: string | null;
  language: string;
  department: string;
  category: string;
  confidence: number;
  extracted_severity_keywords: string[];
  cluster_id: string | null;
  created_at: string;
}

export type Complaint = ComplaintResponse;

export type ClusterStatus = 'submitted' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | string;

export interface ComplaintStatusResponse {
  complaint_id: string;
  cluster_id: string | null;
  status: ClusterStatus;
  department: string;
  category: string;
  priority_score: number;
  sla_deadline: string | null;
  root_cause_asset: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ComplaintTimelineItem {
  status: string;
  timestamp: string;
}

export interface ClusterResponse {
  cluster_id: string;
  member_complaint_ids: string[];
  department: string;
  priority_score: number;
  sla_deadline: string;
  status: ClusterStatus;
  root_cause_asset: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type Cluster = ClusterResponse;

export interface PublicMapCluster {
  cluster_id: string;
  category: string;
  department: string;
  status: ClusterStatus;
  priority_score: number;
  centroid: { lat: number; lng: number };
  complaint_count: number;
}

export interface EscalationItem {
  cluster_id: string;
  level: 'normal' | 'warning' | 'overdue';
  sla_deadline: string;
  hours_remaining: number;
}

export interface ClusterPatch {
  status?: string;
  root_cause_asset?: string | null;
  department?: string;
  priority_score?: number;
  sla_deadline?: string;
}

export interface FeedbackCreate {
  rating?: number;
  comment?: string;
}

export interface FeedbackResponse {
  feedback_id: string;
  complaint_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

export type Feedback = FeedbackResponse;

export interface AnalyticsSummary {
  complaints_total: number;
  clusters_total: number;
  clusters_by_status: Record<string, number>;
  complaints_by_department: Record<string, number>;
  average_priority_score: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type OfficerLoginResponse = TokenResponse;

export interface ErrorBody {
  code: string;
  message: string;
  details?: any;
}

export interface ApiErrorResponse {
  error: ErrorBody;
}

export interface ClusterMapPoint {
  cluster: Cluster;
  centroid: { lat: number; lng: number };
  memberComplaints: Complaint[];
}
