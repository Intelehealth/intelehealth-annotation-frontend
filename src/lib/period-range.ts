/**
 * AI dashboard period presets on the IST calendar (B2). Pure: the range depends only on
 * the preset key and "now", never on which preset was picked before.
 *
 * "Last 7 days" = the same weekday last week -> today (from = today - 7, to = today), and
 * "Last 30 days" = today - 30 -> today, per the user's definition (8 / 31 calendar dates).
 */
export type Range = [string | undefined, string | undefined];

const IST = 5.5 * 3600_000;
const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * DAY);

export function presetRange(key: string, now: Date = new Date()): Range {
  const n = new Date(now.getTime() + IST); // IST wall clock, read with getUTC*
  const y = n.getUTCFullYear();
  const m = n.getUTCMonth();
  const today = ymd(n);
  switch (key) {
    case 'today': return [today, today];
    case 'yesterday': return [ymd(shift(n, -1)), ymd(shift(n, -1))];
    case 'week': return [ymd(shift(n, -((n.getUTCDay() + 6) % 7))), today]; // Monday -> today
    case 'month': return [ymd(new Date(Date.UTC(y, m, 1))), today];
    case 'quarter': return [ymd(new Date(Date.UTC(y, m - (m % 3), 1))), today];
    case 'year': return [ymd(new Date(Date.UTC(y, 0, 1))), today];
    case '7': return [ymd(shift(n, -7)), today];
    case '30': return [ymd(shift(n, -30)), today];
    default: return [undefined, undefined]; // 'all'
  }
}

/** The previous window of the same length, ending the day before `from` (Overview deltas). */
export function previousRange(from?: string, to?: string): { from: string; to: string } | null {
  if (!from || !to) return null;
  const f = Date.parse(`${from}T00:00:00Z`);
  const len = Math.round((Date.parse(`${to}T00:00:00Z`) - f) / DAY) + 1;
  return { from: ymd(new Date(f - len * DAY)), to: ymd(new Date(f - DAY)) };
}

/**
 * B1: one x-axis slot per day (or per Monday-started week) from `from` to `to`, so a day
 * with no visits is a visible gap instead of a skipped point.
 */
export function timeSlots(from: string, to: string, weekly: boolean): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!(start <= end)) return [];
  const monday = (t: number) => t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
  const out: string[] = [];
  for (let t = weekly ? monday(start) : start; t <= end; t += (weekly ? 7 : 1) * DAY) out.push(ymd(new Date(t)));
  return out;
}
