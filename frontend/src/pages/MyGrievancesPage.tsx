import React, { useState, useEffect } from 'react';
import { complaintService } from '../services/complaintService';
import { clusterService } from '../services/clusterService';
import { Complaint } from '../types';
import { formatDate } from '../utils/formatters';
import { getErrorMessage } from '../utils/error';
import { ClipboardList, Plus, AlertCircle, Eye, ArrowUpDown, Filter } from 'lucide-react';

interface MyGrievancesPageProps {
  onNavigateToTrack: (complaintId: string) => void;
  onNavigateToSubmit: () => void;
}

interface GrievanceItem {
  complaint: Complaint;
  status: 'Submitted' | 'Under Review' | 'Resolved' | 'Closed';
  updatedAt: string;
}

export const MyGrievancesPage: React.FC<MyGrievancesPageProps> = ({
  onNavigateToTrack,
  onNavigateToSubmit,
}) => {
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'updated'>('newest');

  const fetchGrievances = async () => {
    const saved = localStorage.getItem('my_grievances');
    const ids: string[] = saved ? JSON.parse(saved) : [];

    if (ids.length === 0) {
      setGrievances([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load complaints in parallel
      const complaintPromises = ids.map(id =>
        complaintService.getComplaint(id).catch(() => null)
      );
      const loadedComplaints = (await Promise.all(complaintPromises)).filter(
        (c): c is Complaint => c !== null
      );

      // Load corresponding cluster status in parallel
      const itemPromises = loadedComplaints.map(async (comp) => {
        let status: 'Submitted' | 'Under Review' | 'Resolved' | 'Closed' = 'Submitted';
        let updatedAt = comp.created_at;

        if (comp.cluster_id) {
          try {
            const cl = await clusterService.getCluster(comp.cluster_id);
            if (cl.status === 'acknowledged' || cl.status === 'in_progress') {
              status = 'Under Review';
            } else if (cl.status === 'resolved') {
              status = 'Resolved';
            } else if (cl.status === 'closed') {
              status = 'Closed';
            }
            // Mapped timestamp update
            updatedAt = cl.sla_deadline || comp.created_at;
          } catch {
            // Ignore optional cluster status fetch error
          }
        }

        return {
          complaint: comp,
          status,
          updatedAt,
        };
      });

      const items = await Promise.all(itemPromises);
      setGrievances(items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, []);

  // Filter & Sort computation
  const filteredGrievances = grievances
    .filter(g => statusFilter === 'All' || g.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.complaint.created_at).getTime() - new Date(a.complaint.created_at).getTime();
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Grievances</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and track the grievances you've submitted.
          </p>
        </div>
        <button
          onClick={onNavigateToSubmit}
          className="civic-btn-primary self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          File a Grievance
        </button>
      </div>

      {/* Info notice about local storage */}
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3 flex items-start gap-2">
        <span className="font-semibold text-blue-600">ⓘ</span>
        <span>
          Note: This list is stored locally in your browser. Clearing your cookies or browsing history will clear this tracking list.
          (Backend authentication list capability is currently reserved for officer accounts).
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="font-medium">We couldn't load your grievances.</span>
          </div>
          <button
            onClick={fetchGrievances}
            className="civic-btn-secondary w-fit text-xs px-3 py-1.5"
          >
            Try again
          </button>
        </div>
      )}

      {/* Skeleton Loading State */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-slate-200 rounded-md w-full"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {grievances.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200 bg-slate-50/50 rounded-lg space-y-4">
              <ClipboardList className="h-12 w-12 mx-auto text-slate-300" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">You haven't filed any grievances yet.</p>
                <p className="text-xs text-slate-400">Report an issue in your community and track its progress here.</p>
              </div>
              <button
                onClick={onNavigateToSubmit}
                className="civic-btn-primary"
              >
                File a Grievance
              </button>
            </div>
          ) : (
            /* Main List & Filters */
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {['All', 'Submitted', 'Under Review', 'Resolved', 'Closed'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        statusFilter === filter
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ArrowUpDown className="h-4 w-4 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="civic-select text-xs py-1 px-2.5 h-8 w-auto min-w-[140px]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="updated">Recently updated</option>
                  </select>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3">
                {filteredGrievances.length === 0 ? (
                  <p className="text-center py-8 text-sm text-slate-400">
                    No grievances found matching the status filter.
                  </p>
                ) : (
                  filteredGrievances.map((item) => {
                    const statusColors: Record<string, string> = {
                      'Submitted': 'bg-slate-100 text-slate-700 border-slate-200',
                      'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
                      'Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      'Closed': 'bg-slate-100 text-slate-600 border-slate-200',
                    };

                    return (
                      <div
                        key={item.complaint.complaint_id}
                        className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              {item.complaint.complaint_id}
                            </span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors[item.status]}`}>
                              {item.status}
                            </span>
                          </div>
                          
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {item.complaint.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {item.complaint.department && (
                              <span className="font-semibold text-slate-600">
                                {item.complaint.department}
                              </span>
                            )}
                            {item.complaint.department && <span>&bull;</span>}
                            <span>Filed {formatDate(item.complaint.created_at)}</span>
                            {item.updatedAt !== item.complaint.created_at && (
                              <>
                                <span>&bull;</span>
                                <span>Updated {formatDate(item.updatedAt)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => onNavigateToTrack(item.complaint.complaint_id)}
                          className="civic-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 self-start md:self-auto"
                        >
                          <Eye className="h-4.5 w-4.5" />
                          View grievance &rarr;
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
