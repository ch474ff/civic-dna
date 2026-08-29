import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatPercent, formatScore } from '../utils/formatters';
import { getErrorMessage } from '../utils/error';
import { 
  BarChart3, 
  Layers, 
  FileText, 
  TrendingUp, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getSummary();
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <LoadingSpinner message="Aggregating municipal analytics & department telemetry..." />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error || 'Failed to load analytics summary.'}</span>
          <button
            onClick={fetchSummary}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold text-xs transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const resolvedCount = (summary.clusters_by_status['resolved'] || 0) + (summary.clusters_by_status['closed'] || 0);
  const resolutionRate = summary.clusters_total > 0 ? (resolvedCount / summary.clusters_total) * 100 : 0;

  // Department distribution sorted
  const departmentEntries = Object.entries(summary.complaints_by_department || {}).sort(
    (a, b) => b[1] - a[1]
  );
  const maxDeptCount = Math.max(...departmentEntries.map(([, count]) => count), 1);

  // Status distribution
  const statusEntries = Object.entries(summary.clusters_by_status || {});

  const statusColors: Record<string, string> = {
    submitted: 'bg-sky-500',
    acknowledged: 'bg-amber-500',
    in_progress: 'bg-indigo-500',
    resolved: 'bg-emerald-500',
    closed: 'bg-slate-500',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-sky-600" />
            Civic Intelligence Analytics & Governance Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated metric telemetry consumed directly from <code className="font-mono text-sky-700">GET /api/analytics/summary</code>.
          </p>
        </div>

        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-300 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Grievances"
          value={summary.complaints_total}
          subtitle="Citizen intake complaints logged"
          icon={<FileText className="h-6 w-6" />}
          color="sky"
        />

        <StatCard
          title="Intelligence Clusters"
          value={summary.clusters_total}
          subtitle="Deduplicated incident groups"
          icon={<Layers className="h-6 w-6" />}
          color="indigo"
        />

        <StatCard
          title="Average Priority Score"
          value={formatScore(summary.average_priority_score)}
          subtitle="Multi-signal risk index (0.0 to 1.0)"
          icon={<TrendingUp className="h-6 w-6" />}
          color={summary.average_priority_score >= 0.7 ? 'red' : 'amber'}
        />

        <StatCard
          title="Cluster Resolution Rate"
          value={`${resolutionRate.toFixed(1)}%`}
          subtitle={`${resolvedCount} resolved of ${summary.clusters_total} clusters`}
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="emerald"
        />
      </div>

      {/* Charts / Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-600" />
              <h3 className="font-bold text-slate-800 text-base">Grievance Distribution by Department</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {departmentEntries.length} Active Departments
            </span>
          </div>

          {departmentEntries.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No department metrics recorded yet.</p>
          ) : (
            <div className="space-y-3.5">
              {departmentEntries.map(([dept, count]) => {
                const percentage = summary.complaints_total > 0 ? (count / summary.complaints_total) * 100 : 0;
                const barWidth = `${(count / maxDeptCount) * 100}%`;

                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{dept}</span>
                      <span className="text-slate-900 font-mono">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{ width: barWidth }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cluster Status Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">Clusters by Lifecycle Status</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {summary.clusters_total} Total Clusters
            </span>
          </div>

          {statusEntries.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No cluster statuses logged.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {statusEntries.map(([status, count]) => {
                  const percentage = summary.clusters_total > 0 ? (count / summary.clusters_total) * 100 : 0;
                  const colorBar = statusColors[status] || 'bg-slate-400';

                  return (
                    <div key={status} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${colorBar}`} />
                        <span className="text-xs uppercase font-bold text-slate-600 tracking-wider">
                          {status}
                        </span>
                      </div>
                      <div className="text-xl font-bold text-slate-900">{count}</div>
                      <div className="text-[11px] text-slate-400">{percentage.toFixed(1)}% of clusters</div>
                    </div>
                  );
                })}
              </div>

              {/* Stacked Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex border border-slate-200">
                {statusEntries.map(([status, count]) => {
                  const widthPct = summary.clusters_total > 0 ? (count / summary.clusters_total) * 100 : 0;
                  const color = statusColors[status] || 'bg-slate-400';
                  return (
                    <div
                      key={status}
                      className={`${color} h-full transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                      title={`${status}: ${count}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
