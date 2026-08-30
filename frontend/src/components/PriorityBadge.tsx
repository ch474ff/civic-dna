import React from 'react';

interface PriorityBadgeProps {
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function getPriorityTier(score: number = 0): {
  label: string;
  colorClass: string;
  dotClass: string;
} {
  if (score >= 0.8) {
    return {
      label: 'Critical',
      colorClass: 'bg-red-100 text-red-800 border-red-300',
      dotClass: 'bg-red-500 animate-pulse',
    };
  } else if (score >= 0.6) {
    return {
      label: 'High',
      colorClass: 'bg-rose-100 text-rose-800 border-rose-300',
      dotClass: 'bg-rose-500',
    };
  } else if (score >= 0.4) {
    return {
      label: 'Medium',
      colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
      dotClass: 'bg-amber-500',
    };
  } else {
    return {
      label: 'Low',
      colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotClass: 'bg-emerald-500',
    };
  }
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ score = 0, size = 'md' }) => {
  const { label, colorClass, dotClass } = getPriorityTier(score);

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${colorClass} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </span>
  );
};
