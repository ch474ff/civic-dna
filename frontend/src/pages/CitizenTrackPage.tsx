import React, { useState, useEffect } from 'react';
import { complaintService } from '../services/complaintService';
import { clusterService } from '../services/clusterService';
import { Complaint, Cluster } from '../types';
import { CivicMap } from '../maps/CivicMap';
import { FeedbackModal } from '../components/FeedbackModal';
import { formatDate } from '../utils/formatters';
import { getErrorMessage } from '../utils/error';
import { 
  Search, 
  Clock, 
  MapPin, 
  Layers, 
  Building, 
  Star, 
  AlertCircle,
  Check,
  FileText
} from 'lucide-react';

interface CitizenTrackPageProps {
  initialComplaintId?: string;
}

const getPriorityLabel = (score: number) => {
  if (score >= 0.8) return 'Critical';
  if (score >= 0.6) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
};

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
      setError('Please enter a Grievance ID.');
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
      const errMsg = getErrorMessage(err);
      if (errMsg.includes('404') || errMsg.toLowerCase().includes('not found')) {
        setError("We couldn't find a grievance with that ID.");
      } else {
        setError("We couldn't retrieve your grievance right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getTimelineStages = (comp: Complaint, clust: Cluster | null) => {
    const currentStatus = clust?.status || 'submitted';
    
    return [
      { 
        label: 'Submitted', 
        desc: 'Grievance received and registered.', 
        done: true, 
        current: currentStatus === 'submitted' && !comp.department 
      },
      { 
        label: 'Reviewed', 
        desc: 'Automatically reviewed for department routing.', 
        done: !!comp.department || !!comp.cluster_id, 
        current: false 
      },
      { 
        label: 'Automatically Routed', 
        desc: comp.department ? `Routed to ${comp.department}` : 'Routing to department...', 
        done: !!comp.department, 
        current: currentStatus === 'submitted' && !!comp.department 
      },
      { 
        label: 'Department Reviewing', 
        desc: 'Assessing priority and scheduling action.', 
        done: ['acknowledged', 'in_progress', 'resolved', 'closed'].includes(currentStatus), 
        current: currentStatus === 'acknowledged' 
      },
      { 
        label: 'Resolution', 
        desc: 'Department executing required resolution actions.', 
        done: ['resolved', 'closed'].includes(currentStatus), 
        current: currentStatus === 'in_progress' 
      },
      { 
        label: 'Closed', 
        desc: 'Grievance resolved and case closed.', 
        done: currentStatus === 'closed', 
        current: currentStatus === 'closed' 
      },
    ];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Search Input Box */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Track your grievance</h2>
        <p className="text-sm text-slate-500 mb-4">
          Enter your grievance ID to check its current status.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              placeholder="e.g. CDNA-2026-001284"
              className="civic-input font-mono text-sm uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="civic-btn-primary px-6 self-stretch sm:self-auto"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
            Track
          </button>
        </form>
        <span className="civic-helper block mt-2 text-slate-400">
          You can find your grievance ID in the confirmation message you received after submission.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Feedback banner */}
      {feedbackSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          {feedbackSuccessMessage}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
          <div className="h-48 bg-slate-200 rounded"></div>
        </div>
      )}

      {/* Empty state */}
      {!complaint && !loading && !error && (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Track your grievance</p>
          <p className="text-xs text-slate-400 mt-1">Enter your grievance ID above to see updates.</p>
        </div>
      )}

      {/* Complaint Detail Grid */}
      {complaint && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Details & Location Map (2/3 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 p-5 bg-slate-50/50">
                <span className="font-mono text-xs text-slate-500 block mb-1">
                  Grievance ID: {complaint.complaint_id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {complaint.title}
                </h3>
              </div>

              <div className="p-5 space-y-5">
                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Grievance Description
                  </h4>
                  <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-md border border-slate-200">
                    {complaint.description}
                  </p>
                </div>

                {/* Properties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-md p-4 bg-white shadow-sm space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-500" />
                      Routed Department
                    </span>
                    <p className="text-sm font-semibold text-slate-800">{complaint.department || 'Under evaluation'}</p>
                  </div>

                  <div className="border border-slate-200 rounded-md p-4 bg-white shadow-sm space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      Submitted Date
                    </span>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(complaint.created_at)}</p>
                  </div>
                </div>

                {/* Intelligence Metrics (understated, no confidence levels) */}
                {cluster && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Priority Level
                      </span>
                      <p className="text-sm font-semibold text-slate-800">
                        {getPriorityLabel(cluster.priority_score)}
                      </p>
                    </div>

                    {cluster.member_complaint_ids.length > 1 && (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          Similar reports nearby
                        </span>
                        <p className="text-sm font-semibold text-slate-800">
                          {cluster.member_complaint_ids.length - 1} other active report(s)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Location Map */}
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    Incident Location
                  </span>
                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <CivicMap
                      height="240px"
                      complaints={[complaint]}
                      clusters={cluster ? [cluster] : []}
                      showFilters={false}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1.5 font-mono">
                    Coordinates: {complaint.lat.toFixed(6)}, {complaint.lng.toFixed(6)}
                  </span>
                </div>

                {/* Feedback rating */}
                {cluster?.status === 'resolved' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-slate-50 p-4 rounded-md">
                    <div>
                      <h5 className="font-semibold text-slate-800 text-sm">Grievance Resolved</h5>
                      <p className="text-xs text-slate-500 mt-0.5">How satisfied are you with the resolution?</p>
                    </div>
                    <button
                      onClick={() => setIsFeedbackOpen(true)}
                      className="civic-btn-primary px-4 py-2 bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Star className="h-3.5 w-3.5 fill-white" />
                      Submit Feedback
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Status Timeline (1/3 col) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Grievance Status Timeline
              </h3>
              
              <div className="space-y-6 pl-1.5">
                {getTimelineStages(complaint, cluster).map((stage, idx, arr) => {
                  const isDone = stage.done;
                  const isCurrent = stage.current;
                  const isLast = idx === arr.length - 1;

                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isDone 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : isCurrent 
                            ? 'bg-white border-blue-600 text-blue-600' 
                            : 'bg-white border-slate-300 text-slate-300'
                        }`}>
                          {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                          {isCurrent && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 my-1.5 ${
                            isDone ? 'bg-blue-600' : 'bg-slate-200'
                          }`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-semibold leading-none ${
                          isDone || isCurrent ? 'text-slate-950' : 'text-slate-400'
                        }`}>
                          {stage.label}
                        </p>
                        <p className={`text-xs mt-1.5 leading-relaxed ${
                          isDone || isCurrent ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {stage.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
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
