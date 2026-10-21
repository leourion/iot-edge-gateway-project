export function ago(t: number | string): string {
  const ms = typeof t === 'string' ? new Date(t).getTime() : t;
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
