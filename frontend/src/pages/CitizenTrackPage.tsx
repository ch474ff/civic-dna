import React, { useState, useEffect } from 'react';
import { complaintService } from '../services/complaintService';
import { clusterService } from '../services/clusterService';
import { Complaint, Cluster } from '../types';
import { CivicMap } from '../maps/CivicMap';
import { FeedbackModal } from '../components/FeedbackModal';
import { calculateSlaStatus } from '../utils/sla';
import { formatDate } from '../utils/formatters';
import { getErrorMessage } from '../utils/error';
import { 
  Search, 
  Clock, 
  MapPin, 
  Layers, 
  Building, 
  Star, 
  AlertCircle
} from 'lucide-react';

interface CitizenTrackPageProps {
  initialComplaintId?: string;
}

export const CitizenTrackPage: React.FC<CitizenTrackPageProps> = ({ initialComplaintId = '' }) => {
  const [complaintId, setComplaintId] = useState(initialComplaintId);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialComplaintId) {
      setComplaintId(initialComplaintId);
      handleSearch(initialComplaintId);
    }
  }, [initialComplaintId]);

  const handleSearch = async (idToSearch?: string) => {
    const id = (idToSearch || complaintId).trim();
    if (!id) {
      setError('Please enter a Complaint ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setComplaint(null);
    setCluster(null);

    try {
      const comp = await complaintService.getComplaint(id);
      setComplaint(comp);

      if (comp.cluster_id) {
        try {
          const cl = await clusterService.getCluster(comp.cluster_id);
          setCluster(cl);
        } catch {
          // Cluster fetch optional
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sla = cluster ? calculateSlaStatus(cluster.sla_deadline) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Search Input Box */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Track Grievance Status & SLA</h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter the unique Complaint Tracking ID provided upon registration.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl transition shadow flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
            Track Status
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {feedbackSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          {feedbackSuccessMessage}
        </div>
      )}

      {/* Complaint Detail Card */}
      {complaint && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-6">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700">
                  ID: {complaint.complaint_id}
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  Language: {complaint.language}
                </span>
                {complaint.created_at && (
                  <span className="text-xs text-slate-400">
                    Filed on {formatDate(complaint.created_at)}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold mt-1 text-white">{complaint.title}</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600/30 text-sky-300 border border-sky-500/40 uppercase">
                {cluster?.status || 'Active'}
              </span>
              
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Grievance Description
              </h4>
              <p className="text-slate-800 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {complaint.description}
              </p>
            </div>

            {/* Department & SLA Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-sky-600" />
                  Assigned Department
                </span>
                <p className="text-base font-semibold text-slate-900">{complaint.department}</p>
                <p className="text-xs text-slate-500">Category: {complaint.category}</p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  SLA Timeline
                </span>
                {sla ? (
                  <>
                    <p className={`text-sm font-bold inline-block px-2 py-0.5 rounded border ${sla.badgeClass}`}>
                      {sla.text}
                    </p>
                    <p className="text-xs text-slate-500">Target: {formatDate(cluster?.sla_deadline)}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">SLA schedule under evaluation</p>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  Token Intelligence
                </span>
                <p className="text-xs font-mono text-slate-800 truncate">
                  {complaint.cluster_id ? complaint.cluster_id : 'Single Incident Token'}
                </p>
                <p className="text-xs text-slate-500">
                  {cluster ? `${cluster.member_complaint_ids.length} linked grievances` : 'Direct Routing'}
                </p>
              </div>
            </div>

            {/* Severity Keywords */}
            {complaint.extracted_severity_keywords && complaint.extracted_severity_keywords.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Extracted Severity Indicators
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {complaint.extracted_severity_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location Map */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-sky-600" />
                Incident Location Pin
              </span>
              <CivicMap
                height="260px"
                complaints={[complaint]}
                clusters={cluster ? [cluster] : []}
                showFilters={false}
              />
            </div>

            {/* Citizen Feedback Trigger */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-xl">
              <div>
                <h5 className="font-bold text-slate-800 text-sm">Citizen Service Rating</h5>
                <p className="text-xs text-slate-500">How satisfied are you with the resolution of this grievance?</p>
              </div>
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Star className="h-4 w-4 fill-white" />
                Submit Resolution Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {complaint && (
        <FeedbackModal
          complaintId={complaint.complaint_id}
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          onSuccess={() => {
            setFeedbackSuccessMessage('Your rating has been recorded successfully. Thank you!');
          }}
        />
      )}
    </div>
  );
};
