import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Complaint, Cluster } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { calculateSlaStatus } from '../utils/sla';
import { Layers, MapPin } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createPriorityIcon = (priorityScore: number, isHigh: boolean) => {
  const color = isHigh ? '#ef4444' : priorityScore >= 0.4 ? '#f59e0b' : '#10b981';
  const size = isHigh ? 36 : 28;
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isHigh ? '12px' : '10px'};
        ${isHigh ? 'animation: pulse 2s infinite;' : ''}
      ">
        ${isHigh ? '!' : Math.round(priorityScore * 10)}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

interface MapUpdaterProps {
  center?: [number, number];
  bounds?: L.LatLngBoundsExpression;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ center, bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch {
        // Fallback
      }
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, bounds, map]);
  return null;
};

interface LocationPickerEventsProps {
  onLocationSelect?: (lat: number, lng: number) => void;
}

const LocationPickerEvents: React.FC<LocationPickerEventsProps> = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

interface CivicMapProps {
  complaints?: Complaint[];
  clusters?: Cluster[];
  selectedLocation?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  showFilters?: boolean;
  onSelectComplaint?: (complaint: Complaint) => void;
  onSelectCluster?: (cluster: Cluster) => void;
}

export const CivicMap: React.FC<CivicMapProps> = ({
  complaints = [],
  clusters = [],
  selectedLocation = null,
  onLocationSelect,
  height = '500px',
  showFilters = true,
  onSelectComplaint,
  onSelectCluster,
}) => {
  const [showComplaintsLayer, setShowComplaintsLayer] = useState(true);
  const [showClustersLayer, setShowClustersLayer] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const validCoordinates = complaints
    .filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng))
    .map((c) => [c.lat, c.lng] as [number, number]);

  const defaultCenter: [number, number] = validCoordinates.length > 0
    ? [
        validCoordinates.reduce((sum, p) => sum + p[0], 0) / validCoordinates.length,
        validCoordinates.reduce((sum, p) => sum + p[1], 0) / validCoordinates.length,
      ]
    : [28.6139, 77.2090];

  const bounds: L.LatLngBoundsExpression | undefined =
    validCoordinates.length > 1
      ? L.latLngBounds(validCoordinates.map(([lat, lng]) => L.latLng(lat, lng)))
      : undefined;

  const filteredComplaints = complaints.filter((c) => {
    if (filterDepartment !== 'all' && c.department !== filterDepartment) return false;
    return true;
  });

  const clusterCentroids = clusters.map((cluster) => {
    const members = complaints.filter((c) => cluster.member_complaint_ids.includes(c.complaint_id));
    const validMembers = members.filter(
      (m) => typeof m.lat === 'number' && typeof m.lng === 'number' && !isNaN(m.lat) && !isNaN(m.lng)
    );
    if (validMembers.length === 0) return null;
    const lat = validMembers.reduce((sum, m) => sum + m.lat, 0) / validMembers.length;
    const lng = validMembers.reduce((sum, m) => sum + m.lng, 0) / validMembers.length;
    return {
      cluster,
      centroid: [lat, lng] as [number, number],
      memberCount: cluster.member_complaint_ids.length,
    };
  }).filter((c): c is { cluster: Cluster; centroid: [number, number]; memberCount: number } => c !== null);

  const departments = Array.from(new Set(complaints.map((c) => c.department).filter(Boolean)));

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-100" style={{ height }}>
      {showFilters && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur p-2.5 rounded-lg shadow-lg border border-slate-200 text-xs flex flex-wrap items-center gap-2 max-w-lg">
          <div className="flex items-center gap-1 font-semibold text-slate-700 mr-1">
            <Layers className="h-3.5 w-3.5 text-sky-600" />
            <span>GIS Layer:</span>
          </div>

          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showComplaintsLayer}
              onChange={(e) => setShowComplaintsLayer(e.target.checked)}
              className="rounded text-sky-600 focus:ring-0"
            />
            <span>Complaints ({filteredComplaints.length})</span>
          </label>

          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showClustersLayer}
              onChange={(e) => setShowClustersLayer(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0"
            />
            <span>Tokens ({clusterCentroids.length})</span>
          </label>

          {departments.length > 0 && (
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="rounded border border-slate-300 text-[11px] p-1 bg-white text-slate-700"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {onLocationSelect && (
        <div className="absolute top-3 left-14 z-[1000] bg-sky-900/90 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-md flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-sky-300 animate-bounce" />
          <span>Click anywhere on the map to set location</span>
        </div>
      )}

      <MapContainer
        center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds && !selectedLocation && <MapUpdater bounds={bounds} />}
        {selectedLocation && <MapUpdater center={[selectedLocation.lat, selectedLocation.lng]} />}

        {onLocationSelect && <LocationPickerEvents onLocationSelect={onLocationSelect} />}

        {/* Selected Location Marker (for citizen intake form) */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={L.divIcon({
              className: 'custom-pin',
              html: `
                <div style="background-color: #0284c7; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 28],
            })}
          >
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-sky-700">Selected Intake Coordinate</p>
                <p className="font-mono text-[11px] mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Token Centroid Markers */}
        {showClustersLayer &&
          clusterCentroids.map(({ cluster, centroid, memberCount }) => {
            const isHigh = cluster.priority_score >= 0.6;
            const sla = calculateSlaStatus(cluster.sla_deadline);
            return (
              <CircleMarker
                key={`cluster-${cluster.cluster_id}`}
                center={centroid}
                radius={Math.min(12 + memberCount * 3, 35)}
                pathOptions={{
                  color: isHigh ? '#dc2626' : '#4f46e5',
                  fillColor: isHigh ? '#ef4444' : '#6366f1',
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 space-y-2 min-w-[200px] text-xs">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-bold text-indigo-700">Token {cluster.cluster_id.substring(0, 8)}...</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {memberCount} Grievance{memberCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Department:</span>
                        <span className="font-semibold text-slate-800">{cluster.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Priority Tier:</span>
                        <PriorityBadge score={cluster.priority_score} size="sm" />
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="capitalize font-medium text-slate-800">{cluster.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SLA:</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] ${sla.badgeClass}`}>
                          {sla.text}
                        </span>
                      </div>
                    </div>

                    {onSelectCluster && (
                      <button
                        onClick={() => onSelectCluster(cluster)}
                        className="w-full mt-2 bg-indigo-600 text-white rounded py-1 font-semibold text-[11px] hover:bg-indigo-700 transition"
                      >
                        Inspect Token in Portal
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Complaint Markers */}
        {showComplaintsLayer &&
          filteredComplaints.map((complaint) => {
            if (typeof complaint.lat !== 'number' || typeof complaint.lng !== 'number') return null;
            const cluster = clusters.find((cl) => cl.cluster_id === complaint.cluster_id);
            const priority = cluster ? cluster.priority_score : 0.3;
            const isHigh = priority >= 0.6;

            return (
              <Marker
                key={`complaint-${complaint.complaint_id}`}
                position={[complaint.lat, complaint.lng]}
                icon={createPriorityIcon(priority, isHigh)}
              >
                <Popup>
                  <div className="p-1 space-y-2 min-w-[220px] text-xs">
                    <div className="border-b pb-1">
                      <h4 className="font-bold text-slate-900 text-sm">{complaint.title}</h4>
                      <span className="font-mono text-[10px] text-slate-400">ID: {complaint.complaint_id}</span>
                    </div>

                    <p className="text-slate-600 line-clamp-2">{complaint.description}</p>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Category:</span>
                        <span className="font-medium text-slate-800">{complaint.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-medium text-slate-800">{complaint.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Token:</span>
                        <span className="font-mono text-slate-800">
                          {complaint.cluster_id ? `${complaint.cluster_id.substring(0, 8)}...` : 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {complaint.extracted_severity_keywords && complaint.extracted_severity_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {complaint.extracted_severity_keywords.map((kw, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] rounded border border-red-200">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {onSelectComplaint && (
                      <button
                        onClick={() => onSelectComplaint(complaint)}
                        className="w-full mt-1.5 bg-sky-600 text-white rounded py-1 font-semibold text-[11px] hover:bg-sky-700 transition"
                      >
                        View Full Details
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
