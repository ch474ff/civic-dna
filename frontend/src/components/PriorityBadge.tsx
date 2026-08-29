import React from 'react';

interface PriorityBadgeProps {
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ score = 0, size = 'md' }) => {
  let label = 'Low';
  let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let dotClass = 'bg-emerald-500';

  if (score >= 0.7) {
    label = 'Critical / High';
    colorClass = 'bg-red-100 text-red-800 border-red-300';
    dotClass = 'bg-red-500 animate-pulse';
  } else if (score >= 0.4) {
    label = 'Medium';
    colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
    dotClass = 'bg-amber-500';
  }

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
      <span className="opacity-75 font-mono text-[10px]">({score.toFixed(2)})</span>
    </span>
  );
};
