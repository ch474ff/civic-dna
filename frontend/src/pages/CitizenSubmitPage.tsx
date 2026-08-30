import React, { useState, useEffect, useMemo } from 'react';
import { complaintService } from '../services/complaintService';
import { ComplaintCreate, Complaint } from '../types';
import { CivicMap } from '../maps/CivicMap';
import { StepIndicator } from '../components/StepIndicator';
import { getApiErrorMessage } from '../utils/errorHandler';
import { formatPercent } from '../utils/formatters';
import {
  Send,
  CheckCircle2,
  Copy,
  AlertCircle,
  Plus,
  Trash2,
  Navigation,
  MapPin,
  AlertTriangle,
  Upload,
  FileText,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Layers,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी — Hindi' },
  { code: 'hinglish', label: 'Hinglish (Hindi in Latin script)' },
  { code: 'ta', label: 'தமிழ் — Tamil' },
  { code: 'bn', label: 'বাংলা — Bengali' },
  { code: 'mr', label: 'मराठी — Marathi' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CitizenSubmitPageProps {
  onNavigateToTrack: (complaintId: string) => void;
}

export const CitizenSubmitPage: React.FC<CitizenSubmitPageProps> = ({ onNavigateToTrack }) => {
  /* ----- Form state ----- */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [lat, setLat] = useState<number>(28.6139);
  const [lng, setLng] = useState<number>(77.2090);
  const [address, setAddress] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);

  /* ----- UI state ----- */
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    if (title.trim() && description.trim()) set.add(1);
    if (locationConfirmed) set.add(2);
    // Step 3 (evidence) is always considered "complete" since it's optional
    set.add(3);
    return set;
  }, [title, description, locationConfirmed]);

  /* ----- Geolocation on mount ----- */
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(6)));
          setLng(Number(pos.coords.longitude.toFixed(6)));
          setLocationConfirmed(true);
        },
        () => { /* Fall back to Delhi defaults */ },
        { timeout: 5000 }
      );
    }
  }, []);

  /* ----- Handlers ----- */
  const handleAddImage = () => {
    if (imageUrl.trim() && images.length < 5) {
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
          setError('Location permission was denied or GPS coordinates could not be retrieved. Please click the map or enter coordinates.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and detailed description.');
      setCurrentStep(1);
      return;
    }
    if (!locationConfirmed) {
      setError('Location not confirmed — click map or use GPS to confirm incident location.');
      setCurrentStep(2);
      return;
    }
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Please provide valid coordinates (-90 to 90 lat, -180 to 180 lng).');
      setCurrentStep(2);
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
      
      // Save ID locally for citizen tracking page list
      try {
        const saved = localStorage.getItem('my_grievances');
        const ids = saved ? JSON.parse(saved) : [];
        if (!ids.includes(result.complaint_id)) {
          ids.push(result.complaint_id);
          localStorage.setItem('my_grievances', JSON.stringify(ids));
        }
      } catch {
        // Fallback for storage restricted environments
      }

      setReceipt(result);
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't submit your grievance. Please check your network connection and try again."));
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
    setAddress('');
    setReceipt(null);
    setError(null);
    setLocationConfirmed(false);
    setCurrentStep(1);
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 4));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const canProceedFromStep1 = title.trim().length > 0 && description.trim().length > 0;
  const canProceedFromStep2 = locationConfirmed;

  /* ================================================================ */
  /*  RECEIPT VIEW                                                     */
  /* ================================================================ */
  if (receipt) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Success header */}
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Grievance registered</h2>
                <p className="text-sm text-slate-500">Your complaint has been logged in our system.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Tracking ID */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-slate-500 block">Grievance ID</span>
                <span className="font-mono text-base font-semibold text-slate-900">{receipt.complaint_id}</span>
              </div>
              <button onClick={copyComplaintId} className="civic-btn-secondary text-xs px-3 py-1.5">
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            {/* Classification & routing details */}
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded text-xs">
                  Submitted
                </span>
              </div>

              {receipt.created_at && (
                <div className="flex justify-between items-center py-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Submitted</span>
                  <span className="text-slate-800 font-medium">
                    {new Date(receipt.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}

              {receipt.department && (
                <div className="flex justify-between items-center py-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="text-slate-800 font-semibold">{receipt.department}</span>
                </div>
              )}

              {receipt.language && (
                <div className="flex justify-between items-center py-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Submission Language</span>
                  <span className="font-medium text-slate-700 uppercase">{receipt.language}</span>
                </div>
              )}
            </div>

            {/* Explanation of what happens next */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">What happens next?</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your grievance has been automatically reviewed and routed to the appropriate department.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button onClick={handleReset} className="civic-btn-secondary w-full sm:w-auto">
                File Another Grievance
              </button>
              <button
                onClick={() => onNavigateToTrack(receipt.complaint_id)}
                className="civic-btn-primary w-full sm:w-auto"
              >
                Track Grievance &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  FORM VIEW                                                        */
  /* ================================================================ */
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">File a Grievance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit a complaint to the relevant municipal department for resolution.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">

        {/* ============ STEP 1: Grievance Details ============ */}
        {currentStep === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-slate-800">Grievance Details</h2>
            <p className="text-sm font-medium text-slate-500 mb-5">What is the issue?</p>

            <div className="space-y-5 max-w-2xl">
              {/* Title */}
              <div>
                <label htmlFor="title" className="civic-label">
                  Grievance Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Deep pothole causing accidents near Metro Station"
                  maxLength={500}
                  className="civic-input"
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="civic-helper">Briefly describe the problem in one line.</span>
                  <span className="text-xs text-slate-400">{title.length}/500</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="civic-label">
                  Description <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-1.5">
                  Tell us what happened, where it happened, and how it is affecting people.
                </p>
                <textarea
                  id="description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="civic-textarea h-36"
                  maxLength={10000}
                  placeholder="Describe what happened, where it happened, and any safety or infrastructure concerns."
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-slate-400">{description.length}/10000</span>
                </div>
              </div>

              {/* Intake Language */}
              <div>
                <label htmlFor="language" className="civic-label">Intake Language</label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="civic-select"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Understated informational message */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-start gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-600">ⓘ</span>
                <span>Your grievance will be reviewed and automatically routed to the appropriate department.</span>
              </div>
            </div>

            {/* Step navigation */}
            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceedFromStep1}
                className="civic-btn-primary"
              >
                Continue to Location &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 2: Location ============ */}
        {currentStep === 2 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-5">Incident Location</h2>

            <div className="space-y-5">
              {/* Address (display only) */}
              <div>
                <label htmlFor="address" className="civic-label">Address / Landmark</label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Rajiv Chowk Metro Station, Gate 3"
                  className="civic-input"
                />
                <span className="civic-helper">Optional — helps officers locate the site.</span>
              </div>

              {/* Coordinates + detect */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="civic-btn-secondary w-full justify-center py-2.5"
                >
                  <Navigation className="h-4 w-4 text-blue-600 mr-1.5" />
                  Detect my location
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lat" className="civic-label">
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lat"
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => {
                        setLat(parseFloat(e.target.value));
                        setLocationConfirmed(true);
                      }}
                      className="civic-input font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="lng" className="civic-label">
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lng"
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => {
                        setLng(parseFloat(e.target.value));
                        setLocationConfirmed(true);
                      }}
                      className="civic-input font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Location status */}
              <div className="flex items-center gap-2">
                {locationConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Location confirmed — {lat.toFixed(4)}, {lng.toFixed(4)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Location not confirmed — click map or use GPS
                  </span>
                )}
              </div>

              {/* Map */}
              <div>
                <label className="civic-label">Pin location on map</label>
                <div className="border border-slate-300 rounded-lg overflow-hidden h-[240px] sm:h-[400px]">
                  <CivicMap
                    height="100%"
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

            {/* Step navigation */}
            <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
              <button type="button" onClick={goBack} className="civic-btn-secondary">
                &larr; Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceedFromStep2}
                className="civic-btn-primary"
              >
                Continue to Evidence &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: Evidence ============ */}
        {currentStep === 3 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Supporting Evidence</h2>
            <p className="text-sm text-slate-500 mb-5">
              Attach photos, videos, or documents to strengthen your grievance. This step is optional.
            </p>

            <div className="space-y-5">
              {/* Upload zone (visual placeholder) */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50/50">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Add a photo</p>
                <p className="text-xs text-slate-400 mt-1">Up to 5 photos · JPG, PNG, or WEBP</p>
                <p className="text-[11px] text-slate-400 mt-2 italic">Direct upload coming soon — use the URL input below</p>
              </div>

              {/* URL paste */}
              <div>
                <label htmlFor="imageUrl" className="civic-label">
                  <FileText className="h-4 w-4 inline mr-1 text-slate-500" />
                  Add a photo via URL link
                </label>
                <div className="flex gap-2">
                  <input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); } }}
                    placeholder="https://example.com/photo.jpg"
                    className="civic-input flex-1"
                    disabled={images.length >= 5}
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    disabled={!imageUrl.trim() || images.length >= 5}
                    className="civic-btn-secondary px-3"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                {images.length >= 5 && (
                  <span className="civic-helper text-amber-600">Maximum 5 files reached.</span>
                )}
              </div>

              {/* Added URLs */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">{images.length} file(s) attached</span>
                  <div className="grid grid-cols-1 gap-2">
                    {images.map((img, idx) => {
                      const isImage = img.match(/\.(jpeg|jpg|gif|png|webp)/i) !== null || img.includes('photo') || img.includes('image');
                      const extension = img.split('.').pop()?.split('?')[0]?.toUpperCase() || 'URL';
                      const cleanName = img.substring(img.lastIndexOf('/') + 1) || img;

                      return (
                        <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-slate-50 border border-slate-200 rounded-md">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Thumbnail */}
                            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {isImage ? (
                                <img src={img} alt="Evidence thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            {/* Meta info */}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate max-w-[250px]">{cleanName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{extension} link &bull; External</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            aria-label={`Remove file ${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step navigation */}
            <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
              <button type="button" onClick={goBack} className="civic-btn-secondary">
                &larr; Back
              </button>
              <button type="button" onClick={goNext} className="civic-btn-primary">
                Continue to Review &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 4: Review & Submit ============ */}
        {currentStep === 4 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-5">Review & Submit</h2>

            <div className="space-y-4">
              <ReviewSection
                title="Grievance Details"
                onEdit={() => setCurrentStep(1)}
              >
                <ReviewRow label="Title" value={title} />
                <ReviewRow label="Language" value={LANGUAGES.find(l => l.code === language)?.label || language} />
                <ReviewRow label="Description" value={description} isMultiline />
              </ReviewSection>

              {/* Location summary */}
              <ReviewSection
                title="Location"
                onEdit={() => setCurrentStep(2)}
              >
                {address && <ReviewRow label="Address" value={address} />}
                <ReviewRow label="Coordinates" value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`} mono />
                <ReviewRow label="Status" value={locationConfirmed ? 'Confirmed' : 'Not confirmed'} />
              </ReviewSection>

              {/* Evidence summary */}
              <ReviewSection
                title="Evidence"
                onEdit={() => setCurrentStep(3)}
              >
                {images.length > 0 ? (
                  <ReviewRow label="Attached files" value={`${images.length} URL(s)`} />
                ) : (
                  <ReviewRow label="Attached files" value="None" />
                )}
              </ReviewSection>

              {/* Privacy notice */}
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <ShieldCheck className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your information is secure. Grievance data is processed in accordance with
                  government data protection guidelines and used solely for complaint resolution.
                </p>
              </div>
            </div>

            {/* Submit navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 mt-6 border-t border-slate-100">
              <button type="button" onClick={goBack} className="civic-btn-secondary w-full sm:w-auto">
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="civic-btn-primary w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Submitting your grievance…
                  </>
                ) : (
                  'Submit Grievance'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky continue button (steps 1-3) */}
      {currentStep < 4 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 z-40">
          <button
            type="button"
            onClick={goNext}
            disabled={currentStep === 1 ? !canProceedFromStep1 : currentStep === 2 ? !canProceedFromStep2 : false}
            className="civic-btn-primary w-full"
          >
            {currentStep === 3 ? 'Continue to Review \u2192' : 'Continue \u2192'}
          </button>
        </div>
      )}
    </div>
  );
};


/* ------------------------------------------------------------------ */
/*  Helper sub-components                                              */
/* ------------------------------------------------------------------ */

const ReviewSection: React.FC<{
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}> = ({ title, onEdit, children }) => (
  <div className="border border-slate-200 rounded-md overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        <Edit2 className="h-3 w-3" />
        Edit
      </button>
    </div>
    <div className="px-4 py-3 space-y-2">
      {children}
    </div>
  </div>
);

const ReviewRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  isMultiline?: boolean;
}> = ({ label, value, mono, isMultiline }) => (
  <div className={isMultiline ? '' : 'flex justify-between items-start gap-4'}>
    <dt className="text-sm text-slate-500 flex-shrink-0">{label}</dt>
    <dd className={`text-sm text-slate-800 ${mono ? 'font-mono text-xs' : ''} ${isMultiline ? 'mt-1 whitespace-pre-wrap' : 'text-right'}`}>
      {value || '—'}
    </dd>
  </div>
);
