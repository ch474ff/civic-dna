import React, { useState } from 'react';
import { clusterService } from '../services/clusterService';
import { Cluster, ClusterPatch } from '../types';
import { getApiErrorMessage } from '../utils/errorHandler';
import { getPriorityTier } from '../components/PriorityBadge';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';

interface ClusterEditModalProps {
  cluster: Cluster | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Cluster) => void;
}

export const ClusterEditModal: React.FC<ClusterEditModalProps> = ({
  cluster,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !cluster) return null;

  const [status, setStatus] = useState(cluster.status);
  const [department, setDepartment] = useState(cluster.department);
  const [priorityScore, setPriorityScore] = useState(cluster.priority_score);
  const [rootCauseAsset, setRootCauseAsset] = useState(cluster.root_cause_asset || '');
  const [slaDeadline, setSlaDeadline] = useState(
    cluster.sla_deadline ? new Date(cluster.sla_deadline).toISOString().slice(0, 16) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTier = getPriorityTier(priorityScore).label;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: ClusterPatch = {
      status,
      department: department.trim() || undefined,
      priority_score: priorityScore,
      root_cause_asset: rootCauseAsset.trim() || null,
      sla_deadline: slaDeadline ? new Date(slaDeadline).toISOString() : undefined,
    };

    try {
      const updated = await clusterService.patchCluster(cluster.cluster_id, payload);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't update the incident token."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Triage Token {cluster.cluster_id.substring(0, 8)}...</h3>
            <p className="text-xs text-slate-500">Update status, routing, and SLA overrides via PATCH endpoint.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-800 focus:ring-2 focus:ring-sky-500"
              >
                <option value="submitted">Submitted</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Assigned Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Priority Tier Override
              </label>
              <span className="font-semibold text-xs text-sky-700">{currentTier} Tier</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priorityScore}
              onChange={(e) => setPriorityScore(parseFloat(e.target.value))}
              className="w-full accent-sky-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
              <span>Critical</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              SLA Deadline Override
            </label>
            <input
              type="datetime-local"
              value={slaDeadline}
              onChange={(e) => setSlaDeadline(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Root Cause Asset / Tag (Optional)
            </label>
            <input
              type="text"
              value={rootCauseAsset}
              onChange={(e) => setRootCauseAsset(e.target.value)}
              placeholder="e.g. TRANSFORMER-449A / WATER-MAIN-EAST"
              className="w-full text-xs rounded-lg border border-slate-300 p-2 font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1.5 shadow"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
