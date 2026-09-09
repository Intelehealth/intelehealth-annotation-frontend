export function timeAgo(iso?: string | Date | null): string {
  if (!iso) return '—';
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function personName(p?: { firstName?: string; lastName?: string; email?: string } | string | null): string {
  if (!p) return 'Unknown';
  if (typeof p === 'string') return p;
  const n = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  return n || p.email || 'Unknown';
}

export function pct(n?: number | null, digits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

/** Bucket timestamps into the last `days` days (oldest first). */
export function perDay(timestamps: (string | undefined)[], days = 14): { day: string; count: number; date: Date }[] {
  const out: { day: string; count: number; date: Date }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    out.push({ day: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count: 0, date: d });
  }
  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts); d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - out[0].date.getTime()) / 86_400_000);
    if (idx >= 0 && idx < out.length) out[idx].count++;
  }
  return out;
}
