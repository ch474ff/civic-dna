import React, { useEffect, useState } from 'react';
import { clusterService } from '../services/clusterService';
import { PublicMapCluster } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getApiErrorMessage } from '../utils/errorHandler';
import { CivicMap } from '../maps/CivicMap';
import { 
  Layers, 
  MapPin, 
  RefreshCw,
  X,
  Search,
  Filter,
} from 'lucide-react';

const GIS_CATEGORIES = ['All Issues', 'Infrastructure', 'Sanitation', 'Roads', 'Public Safety', 'Other'];

export const MapExplorePage: React.FC = () => {
  const [publicClusters, setPublicClusters] = useState<PublicMapCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCluster, setSelectedCluster] = useState<PublicMapCluster | null>(null);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Issues');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSelectedCluster(null);
    try {
      const clusterList = await clusterService.getPublicMapClusters({ limit: 200 });
      setPublicClusters(clusterList);
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't load civic map data right now. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filterByGisCategory = (cluster: PublicMapCluster, filter: string) => {
    if (filter === 'All Issues') return true;
    
    const cat = cluster.category || '';
    if (filter === 'Roads') {
      return cat.includes('Road') || cat.includes('Pothole') || cat.includes('Lighting');
    }
    if (filter === 'Sanitation') {
      return cat.includes('Sanitation') || cat.includes('Waste') || cat.includes('Drainage');
    }
    if (filter === 'Public Safety') {
      return cat.includes('Safety');
    }
    if (filter === 'Infrastructure') {
      return cat.includes('Electricity') || cat.includes('Water');
    }
    if (filter === 'Other') {
      return cat === 'Other' || !cat;
    }
    return true;
  };

  // Filter clusters based on Search Input & Category Tab
  const filteredClusters = publicClusters.filter((c) => {
    if (!filterByGisCategory(c, activeCategory)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = (c.category || '').toLowerCase().includes(q);
      const matchDept = (c.department || '').toLowerCase().includes(q);
      const matchId = c.cluster_id.toLowerCase().includes(q);
      if (!matchCat && !matchDept && !matchId) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-sky-600" />
            Civic Problem Map
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore reported civic incidents and aggregated problem clusters in your municipality.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="civic-btn-secondary self-start sm:self-auto flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Map
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">

          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category, department, or keyword..."
              className="civic-input pl-9 text-xs py-2 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 self-start md:self-auto">
            <span className="font-semibold text-slate-700">{filteredClusters.length}</span> Active Incident Clusters
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Filter className="h-3.5 w-3.5 text-slate-400 mr-1 flex-shrink-0" />
          {GIS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Map & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Main Leaflet GIS Map */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="h-[550px] bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
              <LoadingSpinner message="Loading GIS Map Data..." />
            </div>
          ) : (
            <CivicMap
              height="550px"
              publicClusters={filteredClusters}
              showFilters={true}
              onSelectPublicCluster={(cluster) => setSelectedCluster(cluster)}
            />
          )}
        </div>

        {/* Selected Details Sidebar */}
        <div className="space-y-4">
          {selectedCluster ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Incident Token Details</h3>
                </div>
                <button
                  onClick={() => setSelectedCluster(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-mono text-slate-400 block text-[10px]">Cluster ID</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedCluster.cluster_id}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Category</span>
                    <span className="font-semibold text-slate-800 text-sm">{selectedCluster.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Department</span>
                    <span className="font-semibold text-slate-800 text-sm">{selectedCluster.department}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Priority Tier:</span>
                  <PriorityBadge score={selectedCluster.priority_score} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Reports in Cluster:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {selectedCluster.complaint_count} citizen report{selectedCluster.complaint_count > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="capitalize font-semibold text-slate-800">{selectedCluster.status}</span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-slate-400 block text-[10px] mb-1">Centroid Location</span>
                  <p className="font-mono text-slate-600 bg-slate-50 p-2 rounded text-[11px]">
                    Lat: {selectedCluster.centroid.lat.toFixed(4)}, Lng: {selectedCluster.centroid.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-400 space-y-3">
              <Layers className="h-8 w-8 mx-auto text-slate-300" />
              <div>
                <h4 className="font-semibold text-slate-700 text-sm">Select an Incident Token</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Click any marker or cluster circle on the map to inspect department assignments and priority level.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
