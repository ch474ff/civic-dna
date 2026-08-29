import React, { useEffect, useState } from 'react';
import { clusterService } from '../services/clusterService';
import { complaintService } from '../services/complaintService';
import { Cluster, Complaint } from '../types';
import { CivicMap } from '../maps/CivicMap';
import { PriorityBadge } from '../components/PriorityBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { calculateSlaStatus } from '../utils/sla';
import { formatDate } from '../utils/formatters';
import { getErrorMessage } from '../utils/error';
import { 
  Layers, 
  Building, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw,
  X,
  ChevronRight
} from 'lucide-react';

export const MapExplorePage: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const clusterList = await clusterService.listClusters('priority');
      setClusters(clusterList);

      // Fetch individual complaints for members
      const complaintPromises: Promise<Complaint | null>[] = [];
      const memberIds = new Set<string>();
      clusterList.forEach((cl) => {
        cl.member_complaint_ids.forEach((id) => memberIds.add(id));
      });

      Array.from(memberIds).forEach((id) => {
        complaintPromises.push(
          complaintService.getComplaint(id).catch(() => null)
        );
      });

      const loadedComplaints = (await Promise.all(complaintPromises)).filter(
        (c): c is Complaint => c !== null
      );
      setComplaints(loadedComplaints);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-600" />
            City-Wide GIS Incident & Cluster Map
          </h2>
          <p className="text-xs text-slate-500">
            Real-time geospatial intelligence mapping civic grievances, cluster centroids, and SLA urgency.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-300 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh GIS
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 shadow">
          <LoadingSpinner message="Rendering GIS spatial layers and cluster centroids..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map View (2 columns) */}
          <div className="lg:col-span-2">
            <CivicMap
              height="650px"
              complaints={complaints}
              clusters={clusters}
              onSelectComplaint={(c) => {
                setSelectedComplaint(c);
                setSelectedCluster(null);
              }}
              onSelectCluster={(cl) => {
                setSelectedCluster(cl);
                setSelectedComplaint(null);
              }}
            />
          </div>

          {/* Side Inspector Drawer */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4 max-h-[650px] overflow-y-auto">
            {selectedCluster ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                      Cluster Inspector
                    </span>
                    <h3 className="font-mono text-sm font-bold text-slate-900 truncate">
                      {selectedCluster.cluster_id}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedCluster(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedCluster.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                    <span className="text-slate-500">Priority Score:</span>
                    <PriorityBadge score={selectedCluster.priority_score} size="sm" />
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Lifecycle Status:</span>
                    <span className="capitalize font-semibold text-slate-800">{selectedCluster.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">SLA Deadline:</span>
                    <span className="font-mono text-slate-800">{formatDate(selectedCluster.sla_deadline)}</span>
                  </div>
                  {selectedCluster.root_cause_asset && (
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Root Cause Asset:</span>
                      <span className="font-medium text-slate-800">{selectedCluster.root_cause_asset}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Linked Member Grievances ({selectedCluster.member_complaint_ids.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedCluster.member_complaint_ids.map((id) => {
                      const member = complaints.find((c) => c.complaint_id === id);
                      return (
                        <div
                          key={id}
                          onClick={() => {
                            if (member) setSelectedComplaint(member);
                          }}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 cursor-pointer text-xs transition"
                        >
                          <div className="font-semibold text-slate-900 truncate">
                            {member ? member.title : id}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                            <span>{id.substring(0, 10)}...</span>
                            <span>{member?.category || 'Category N/A'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : selectedComplaint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">
                      Complaint Inspector
                    </span>
                    <h3 className="font-mono text-sm font-bold text-slate-900 truncate">
                      {selectedComplaint.complaint_id}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedComplaint.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedComplaint.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-medium text-slate-800">{selectedComplaint.category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Coordinates:</span>
                    <span className="font-mono text-slate-800">
                      {selectedComplaint.lat.toFixed(4)}, {selectedComplaint.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {selectedComplaint.extracted_severity_keywords?.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Extracted Severity Keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedComplaint.extracted_severity_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded border border-red-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-700">GIS Entity Inspector</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click any complaint marker or cluster perimeter circle on the map to inspect telemetry, severity, and SLA details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
