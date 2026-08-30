import React, { useEffect, useState } from 'react';
import { clusterService } from '../services/clusterService';
import { complaintService } from '../services/complaintService';
import { Cluster, Complaint } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatDate } from '../utils/formatters';
import { getErrorMessage } from '../utils/error';
import { CivicMap } from '../maps/CivicMap';
import { 
  Layers, 
  MapPin, 
  RefreshCw,
  X,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';

const GIS_CATEGORIES = ['All Issues', 'Infrastructure', 'Sanitation', 'Roads', 'Public Safety', 'Other'];

export const MapExplorePage: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Issues');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSelectedCluster(null);
    setSelectedComplaint(null);
    try {
      const clusterList = await clusterService.listClusters('priority_desc');
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

  const filterByGisCategory = (complaint: Complaint, filter: string) => {
    if (filter === 'All Issues') return true;
    
    const cat = complaint.category || '';
    if (filter === 'Roads') {
      return cat === 'Roads & Potholes' || cat === 'Street Lighting';
    }
    if (filter === 'Sanitation') {
      return cat === 'Sanitation & Waste' || cat === 'Drainage';
    }
    if (filter === 'Public Safety') {
      return cat === 'Public Safety';
    }
    if (filter === 'Infrastructure') {
      return cat === 'Electricity' || cat === 'Water Supply';
    }
    if (filter === 'Other') {
      return cat === 'Other' || !cat;
    }
    return true;
  };

  // Filter complaints based on Search Input & Category Tab
  const filteredComplaints = complaints.filter((c) => {
    if (!filterByGisCategory(c, activeCategory)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchId = c.complaint_id.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchId;
    }
    return true;
  });

  // Filter clusters based on whether any of their member complaints match the filters
  const filteredClusters = clusters.filter((cl) => {
    const matchedMembers = cl.member_complaint_ids.filter((id) => {
      const member = complaints.find((comp) => comp.complaint_id === id);
      return member && filteredComplaints.some((fc) => fc.complaint_id === id);
    });
    return matchedMembers.length > 0;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Civic Map
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore reported civic issues around your community.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-300 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Map
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>We couldn't retrieve the map details right now. Please try again.</span>
          <button onClick={fetchData} className="text-xs font-bold underline hover:text-red-900">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg p-12 border border-slate-200 shadow-sm">
          <LoadingSpinner message="Rendering GIS spatial layers and token centroids..." />
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Controls / Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
            {/* Text Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location or area"
                className="civic-input pl-9"
              />
            </div>

            {/* Category tabs filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mr-1" />
              {GIS_CATEGORIES.map((filterName) => (
                <button
                  key={filterName}
                  onClick={() => setActiveCategory(filterName)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors flex-shrink-0 font-medium ${
                    activeCategory === filterName
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filterName}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
            {/* Map container (2 columns) */}
            <div className="lg:col-span-2 rounded-lg overflow-hidden border border-slate-200">
              {filteredComplaints.length === 0 && filteredClusters.length === 0 ? (
                <div className="h-[550px] bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg p-6">
                  <AlertTriangle className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No issues found matching the query.</p>
                  <p className="text-xs text-slate-400 mt-1">Try refining your filters or search keywords.</p>
                </div>
              ) : (
                <CivicMap
                  height="550px"
                  complaints={filteredComplaints}
                  clusters={filteredClusters}
                  showFilters={false}
                  onSelectComplaint={(c) => {
                    setSelectedComplaint(c);
                    setSelectedCluster(null);
                  }}
                  onSelectCluster={(cl) => {
                    setSelectedCluster(cl);
                    setSelectedComplaint(null);
                  }}
                />
              )}
            </div>

            {/* Desktop Side Inspector Drawer (1 column) */}
            <div className="hidden lg:block bg-white rounded-lg p-5 border border-slate-200 shadow-sm space-y-4 max-h-[550px] overflow-y-auto">
              {selectedCluster ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                        Token Inspector
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
                      <span className="text-slate-500">Priority Tier:</span>
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
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                        Grievance Inspector
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
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-700">GIS Entity Inspector</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Click any complaint marker or token cluster circle on the map to inspect details, department routing, and priority tiers.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile bottom-sheet inspector drawer (visible only on md/sm screens) */}
            {(selectedCluster || selectedComplaint) && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-xl shadow-2xl p-4 max-h-[35vh] overflow-y-auto border-t border-slate-300 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    {selectedCluster ? 'Token Inspector' : 'Grievance Inspector'}
                  </span>
                  <button onClick={() => { setSelectedCluster(null); setSelectedComplaint(null); }} className="text-slate-400">
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {selectedCluster && (
                  <div className="text-xs space-y-1.5">
                    <p className="font-semibold text-slate-800">ID: {selectedCluster.cluster_id.substring(0, 15)}...</p>
                    <p className="text-slate-600">Department: <span className="font-semibold">{selectedCluster.department}</span></p>
                    <p className="text-slate-600">Status: <span className="font-semibold capitalize">{selectedCluster.status}</span></p>
                    <p className="text-slate-600">Deadline: <span>{formatDate(selectedCluster.sla_deadline)}</span></p>
                  </div>
                )}

                {selectedComplaint && (
                  <div className="text-xs space-y-1.5">
                    <p className="font-bold text-slate-800 text-sm">{selectedComplaint.title}</p>
                    <p className="text-slate-500 line-clamp-2">{selectedComplaint.description}</p>
                    <p className="text-slate-600 mt-1">Department: <span className="font-semibold">{selectedComplaint.department}</span></p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
