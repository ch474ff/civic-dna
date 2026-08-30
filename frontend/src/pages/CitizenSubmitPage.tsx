import React, { useState, useEffect } from 'react';
import { complaintService } from '../services/complaintService';
import { ComplaintCreate, Complaint } from '../types';
import { CivicMap } from '../maps/CivicMap';
import { getErrorMessage } from '../utils/error';
import { formatPercent } from '../utils/formatters';
import { 
  Send, 
  CheckCircle2, 
  Copy, 
  Layers, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  Trash2,
  Navigation,
  Globe,
  MapPin,
  AlertTriangle
} from 'lucide-react';

interface CitizenSubmitPageProps {
  onNavigateToTrack: (complaintId: string) => void;
}

export const CitizenSubmitPage: React.FC<CitizenSubmitPageProps> = ({ onNavigateToTrack }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [lat, setLat] = useState<number>(28.6139);
  const [lng, setLng] = useState<number>(77.2090);
  const [locationConfirmed, setLocationConfirmed] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(6)));
          setLng(Number(pos.coords.longitude.toFixed(6)));
          setLocationConfirmed(true);
        },
        () => {
          // Fall back to Delhi default if denied or unavailable, locationConfirmed remains false
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(6)));
          setLng(Number(pos.coords.longitude.toFixed(6)));
          setLocationConfirmed(true);
          setError(null);
        },
        () => {
          setError('Could not retrieve GPS location. Please select on the map or enter coordinates.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and detailed description.');
      return;
    }
    if (!locationConfirmed) {
      setError('Location not confirmed — click map or use GPS to confirm incident location.');
      return;
    }
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Please provide valid coordinates (-90 to 90 lat, -180 to 180 lng).');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: ComplaintCreate = {
      title: title.trim(),
      description: description.trim(),
      lat: Number(lat),
      lng: Number(lng),
      language,
      images: images.length > 0 ? images : [],
    };

    try {
      const result = await complaintService.createComplaint(payload);
      setReceipt(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copyComplaintId = () => {
    if (receipt?.complaint_id) {
      navigator.clipboard.writeText(receipt.complaint_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setImages([]);
    setImageUrl('');
    setReceipt(null);
    setError(null);
    setLocationConfirmed(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Receipt view when grievance is submitted */}
      {receipt ? (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-2 text-emerald-100 animate-bounce" />
            <h2 className="text-2xl font-bold">Grievance Registered Successfully</h2>
            <p className="text-emerald-100 text-sm mt-1">
              Your issue has passed real-time ML classification and deduplication into municipal tokens.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Tracking ID Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                  Official Complaint Tracking ID
                </span>
                <span className="font-mono text-lg font-bold text-slate-900">{receipt.complaint_id}</span>
              </div>
              <button
                onClick={copyComplaintId}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Copy className="h-4 w-4 text-sky-600" />
                {copied ? 'Copied to Clipboard!' : 'Copy ID'}
              </button>
            </div>

            {/* AI Classification & Routing Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-sky-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sky-800 font-semibold text-sm">
                  <Sparkles className="h-4 w-4 text-sky-600" />
                  <span>AI Classification Insights</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Auto-Assigned Category:</span>
                    <span className="font-semibold text-slate-800">{receipt.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Routed Department:</span>
                    <span className="font-semibold text-slate-800">{receipt.department}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ML Model Confidence:</span>
                    <span className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded text-xs">
                      {formatPercent(receipt.confidence)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Submission Language:</span>
                    <span className="font-medium text-slate-700 uppercase">{receipt.language}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-indigo-50/50 space-y-3">
                <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span>Token & Deduplication Status</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Token ID:</span>
                    <span className="font-mono text-xs font-semibold text-indigo-900">
                      {receipt.cluster_id ? `${receipt.cluster_id}` : 'Pending Graph Batch'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coordinates:</span>
                    <span className="font-mono text-xs text-slate-700">
                      {receipt.lat.toFixed(4)}, {receipt.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {receipt.extracted_severity_keywords && receipt.extracted_severity_keywords.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Extracted Safety Keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {receipt.extracted_severity_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full border border-red-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                File Another Grievance
              </button>
              <button
                onClick={() => onNavigateToTrack(receipt.complaint_id)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition shadow flex items-center justify-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                Track Live Resolution
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grievance Submission Form */
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Lodge Citizen Grievance</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AI pipeline automatically scores severity, determines department routing, and groups duplicate incidents into tokens.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-medium">
              <Globe className="h-3.5 w-3.5" />
              <span>Multilingual Support</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Intake Details */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Grievance Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Deep pothole causing accidents near Metro Station"
                    maxLength={500}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Intake Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      <option value="en">English (en)</option>
                      <option value="hi">हिन्दी — Hindi (hi)</option>
                      <option value="hinglish">Hinglish (Hindi in Latin script)</option>
                      <option value="ta">தமிழ் — Tamil (ta)</option>
                      <option value="bn">বাংলা — Bengali (bn)</option>
                      <option value="mr">मराठी — Marathi (mr)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Location Assistance
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300 transition"
                    >
                      <Navigation className="h-3.5 w-3.5 text-sky-600" />
                      Detect Device GPS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Detailed Grievance Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={10000}
                    placeholder="Describe the exact location, safety hazards, affected public infrastructure, or recurring nature..."
                    className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Image URLs */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Image Evidence URLs (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/pothole-photo.jpg"
                      className="flex-1 text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add URL
                    </button>
                  </div>
                  {images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {images.map((img, idx) => (
                        <div key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border border-slate-200">
                          <span className="truncate max-w-[200px]">{img}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: GIS Coordinates & Map Picker */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      GIS Coordinates <span className="text-red-500">*</span>
                    </label>
                    {locationConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Location Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Location not confirmed
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Latitude:</span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={lat}
                        onChange={(e) => {
                          setLat(parseFloat(e.target.value));
                          setLocationConfirmed(true);
                        }}
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-2 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Longitude:</span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={lng}
                        onChange={(e) => {
                          setLng(parseFloat(e.target.value));
                          setLocationConfirmed(true);
                        }}
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-2 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Interactive Map Pinpoint:</span>
                    {!locationConfirmed && (
                      <span className="text-[10px] text-amber-700 font-medium">Click map or use GPS</span>
                    )}
                  </div>
                  <CivicMap
                    height="240px"
                    selectedLocation={{ lat, lng }}
                    onLocationSelect={(newLat, newLng) => {
                      setLat(Number(newLat.toFixed(6)));
                      setLng(Number(newLng.toFixed(6)));
                      setLocationConfirmed(true);
                      setError(null);
                    }}
                    showFilters={false}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing ML Intelligence Pipeline...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Grievance
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
