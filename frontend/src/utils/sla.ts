export interface SlaStatus {
  isOverdue: boolean;
  isWarning: boolean;
  remainingHours: number;
  text: string;
  badgeClass: string;
}

export function calculateSlaStatus(deadlineIso?: string): SlaStatus {
  if (!deadlineIso) {
    return {
      isOverdue: false,
      isWarning: false,
      remainingHours: 0,
      text: 'No SLA defined',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    };
  }

  const now = new Date();
  const deadline = new Date(deadlineIso);
  const diffMs = deadline.getTime() - now.getTime();
  const remainingHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMs <= 0) {
    const overdueHours = Math.abs(remainingHours);
    return {
      isOverdue: true,
      isWarning: false,
      remainingHours,
      text: `Overdue by ${overdueHours}h`,
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
    };
  }

  if (remainingHours <= 24) {
    return {
      isOverdue: false,
      isWarning: true,
      remainingHours,
      text: `${remainingHours}h remaining (Urgent)`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }

  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;
  return {
    isOverdue: false,
    isWarning: false,
    remainingHours,
    text: days > 0 ? `${days}d ${hours}h remaining` : `${remainingHours}h remaining`,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
}
