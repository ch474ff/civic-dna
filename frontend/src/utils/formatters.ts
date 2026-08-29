export function formatDate(isoString?: string | null): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatPercent(value?: number): string {
  if (value === undefined || value === null) return '0%';
  return `${Math.round(value * 100)}%`;
}

export function formatScore(score?: number): string {
  if (score === undefined || score === null) return '0.00';
  return score.toFixed(2);
}
