import React, { useEffect, useState } from 'react';
import { clusterService } from '../services/clusterService';
import { complaintService } from '../services/complaintService';
import { Cluster, Complaint, EscalationItem } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ClusterEditModal } from '../dashboard/ClusterEditModal';
import { calculateSlaStatus } from '../utils/sla';
import { getApiErrorMessage } from '../utils/errorHandler';
import { 
  Shield, 
  Search, 
  Edit3, 
  Eye, 
  Layers, 
  ArrowUpDown, 
  RefreshCw,
  X
} from 'lucide-react';

export const OfficerDashboardPage: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escalations, setEscalations] = useState<Record<string, EscalationItem>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'priority_desc' | 'priority_asc'>('priority_desc');

  // Modals & Drawers
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [inspectingCluster, setInspectingCluster] = useState<Cluster | null>(null);
  const [memberComplaints, setMemberComplaints] = useState<Complaint[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clusterService.listClusters(sortOrder);
      setClusters(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't load incident clusters."));
    } finally {
      setLoading(false);
    }
  };

  const fetchEscalations = async () => {
    try {
      const items = await clusterService.getEscalations();
      const map: Record<string, EscalationItem> = {};
      for (const item of items) {
        map[item.cluster_id] = item;
      }
      setEscalations(map);
    } catch {
      // Fallback to client-side SLA calculation if endpoint fails
    }
  };

  useEffect(() => {
    fetchClusters();
    fetchEscalations();
  }, [sortOrder]);

  const handleInspect = async (cluster: Cluster) => {
    setInspectingCluster(cluster);
    setLoadingMembers(true);
    try {
      const promises = cluster.member_complaint_ids.map((id) =>
        complaintService.getComplaint(id).catch(() => null)
      );
      const results = (await Promise.all(promises)).filter((c): c is Complaint => c !== null);
      setMemberComplaints(results);
    } catch {
      // Ignore
    } finally {
      setLoadingMembers(false);
    }
  };

  const departments = Array.from(new Set(clusters.map((c) => c.department).filter(Boolean)));

  const filteredClusters = clusters.filter((cl) => {
    if (statusFilter !== 'all' && cl.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && cl.department !== departmentFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = (cl.cluster_id || '').toLowerCase().includes(term);
      const matchDept = (cl.department || '').toLowerCase().includes(term);
      const matchAsset = (cl.root_cause_asset || '').toLowerCase().includes(term);
      if (!matchId && !matchDept && !matchAsset) return false;
    }
    return true;
  });

  const getEscalationBadge = (clusterId: string, slaDeadline: string) => {
    const esc = escalations[clusterId];
    if (esc) {
      const levelClass =
        esc.level === 'overdue'
          ? 'bg-red-100 text-red-800 border-red-300'
          : esc.level === 'warning'
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-300';
      const label =
        esc.level === 'overdue'
          ? `Overdue by ${Math.abs(Math.round(esc.hours_remaining))}h`
          : esc.level === 'warning'
            ? `${Math.round(esc.hours_remaining)}h remaining (Urgent)`
            : `${Math.round(esc.hours_remaining)}h remaining`;
      return { text: label, badgeClass: levelClass };
    }
    // Fallback to client-side calculation
    return calculateSlaStatus(slaDeadline);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-sky-400" />
            <h2 className="text-xl font-bold">Officer Incident Triage & Token Command</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time graph tokens, multi-signal priority tiers, and municipal SLA monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'priority_desc' ? 'priority_asc' : 'priority_desc')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-sky-400" />
            Sort: {sortOrder === 'priority_desc' ? 'Highest Priority First' : 'Lowest Priority First'}
          </button>
          <button
            onClick={() => { fetchClusters(); fetchEscalations(); }}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Token ID or Asset..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Lifecycle Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Token Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 shadow">
          <LoadingSpinner message="Fetching live tokens from backend..." />
        </div>
      ) : filteredClusters.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-semibold text-slate-700">No Tokens Match Filters</h4>
          <p className="text-xs text-slate-500 mt-1">Try resetting filters or submitting a new grievance.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Token ID</th>
                  <th className="py-3.5 px-4">Grievance Count</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Priority Tier</th>
                  <th className="py-3.5 px-4">SLA Status</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClusters.map((cl) => {
                  const sla = getEscalationBadge(cl.cluster_id, cl.sla_deadline);
                  return (
                    <tr 
                      key={cl.cluster_id} 
                      data-testid={`cluster-row-${cl.cluster_id}`}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900" title={cl.cluster_id}>
                        {cl.cluster_id}
                        {cl.root_cause_asset && (
                          <span className="block text-[10px] text-slate-400 font-sans font-normal">
                            Asset: {cl.root_cause_asset}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-800">
                          {cl.member_complaint_ids.length} Incidents
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{cl.department}</td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge score={cl.priority_score} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${sla.badgeClass}`}>
                          {sla.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-semibold text-slate-800 px-2 py-0.5 rounded bg-slate-100">
                          {cl.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleInspect(cl)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3 text-sky-600" />
                          Inspect
                        </button>
                        <button
                          onClick={() => setEditingCluster(cl)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3 text-indigo-600" />
                          Triage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member Grievances Drawer */}
      {inspectingCluster && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Token Members: <span className="font-mono text-indigo-600">{inspectingCluster.cluster_id}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {inspectingCluster.member_complaint_ids.length} deduplicated grievances grouped by multi-signal similarity.
              </p>
            </div>
            <button
              onClick={() => setInspectingCluster(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loadingMembers ? (
            <LoadingSpinner message="Loading member grievance payloads..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {memberComplaints.map((c) => (
                <div key={c.complaint_id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-xs text-slate-900">{c.title}</h5>
                    <span className="font-mono text-[10px] text-slate-400">{c.complaint_id}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                    <span>Category: <b>{c.category}</b></span>
                    <span>Coordinates: <b>{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <ClusterEditModal
        cluster={editingCluster}
        isOpen={!!editingCluster}
        onClose={() => setEditingCluster(null)}
        onSuccess={(updated) => {
          setClusters((prev) => prev.map((c) => (c.cluster_id === updated.cluster_id ? updated : c)));
          if (inspectingCluster?.cluster_id === updated.cluster_id) {
            setInspectingCluster(updated);
          }
        }}
      />
    </div>
  );
};
