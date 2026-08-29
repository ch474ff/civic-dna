import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'sky' | 'indigo' | 'emerald' | 'amber' | 'red';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'sky',
}) => {
  const colorMap = {
    sky: 'bg-sky-500/10 text-sky-600 border-sky-200',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-200',
    red: 'bg-red-500/10 text-red-600 border-red-200',
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>{icon}</div>
      </div>
      {trend && <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">{trend}</div>}
    </div>
  );
};
