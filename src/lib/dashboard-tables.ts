import type { DashboardData, TatRow } from '@/lib/api/mismatch';
import { doctorLabel, PLAN_TYPE_LABEL } from '@/lib/api/mismatch';

/**
 * Pure row builders shared by the Excel export, so the sheets carry the same
 * tables as the dashboard tabs. Rates are fractions (0-1) for a % number format.
 */
export type XCell = string | number | null;
export type XCol = { header: string; pct?: boolean; width?: number };

/** One rule for per-doctor rates (Doctors tab, Overview "By doctor", Excel): below this many visits, show a dash. */
export const MIN_DOCTOR_N = 5;
const MIN_N = MIN_DOCTOR_N;
const rate = (n: number, d: number): number | null => (d >= MIN_N ? n / d : null);
const frac = (n: number, d: number): number | null => (d ? n / d : null);

/** D6: one row per consulting doctor (pseudo id), as on the Doctors tab. */
export function doctorTable(data: DashboardData): { cols: XCol[]; rows: XCell[][] } {
  const medBy = new Map((data.plan?.find((x) => x.type === 'medicine')?.byDoctor ?? []).map((d) => [d.doctor, d]));
  const misBy = new Map((data.doctors ?? []).map((d) => [d.doctor, d]));
  const tatBy = (doc: string, kind: 'new' | 'follow_up') => data.tat?.byDoctorKind?.find((r) => r.doctor === doc && r.kind === kind);
  const tat = (r?: TatRow): XCell[] => (r && r.consultMedian !== null && r.visits >= MIN_N ? [r.consultMedian, r.consultP90] : [null, null]);
  const cols: XCol[] = [
    { header: 'Doctor', width: 16 }, { header: 'Scored' }, { header: 'Top 1 %', pct: true }, { header: 'Top 3 %', pct: true }, { header: 'Top 5 %', pct: true },
    { header: 'TTx cases' }, { header: 'Unchanged %', pct: true }, { header: 'Changed %', pct: true }, { header: 'Not used %', pct: true }, { header: 'Added meds %', pct: true },
    { header: 'Mismatches' }, { header: 'Reviewed' },
    { header: 'In note · new, median (min)' }, { header: 'In note · new, p90 (min)' },
    { header: 'In note · follow-up, median (min)' }, { header: 'In note · follow-up, p90 (min)' },
  ];
  const rows = data.ai.byDoctor.map((r): XCell[] => {
    const m = medBy.get(r.name);
    const x = misBy.get(r.name);
    return [
      doctorLabel(r.name), r.scored, rate(r.top1, r.scored), rate(r.top3, r.scored), rate(r.top5, r.scored),
      r.ttxGenerated, rate(r.casesUnchanged, r.ttxGenerated), rate(r.casesChanged, r.ttxGenerated),
      m ? rate(m.casesNotPicked, m.generated) : null, m ? rate(m.casesAdded, m.generated) : null,
      x ? x.mismatches : null, x ? x.annotated : null,
      ...tat(tatBy(r.name, 'new')), ...tat(tatBy(r.name, 'follow_up')),
    ];
  });
  return { cols, rows };
}

/** R2: the whole treatment plan by item type, as on the Treatment tab. */
export function planTable(data: DashboardData): { cols: XCol[]; rows: XCell[][] } {
  const cols: XCol[] = [
    { header: 'Type', width: 14 }, { header: 'AI suggested %', pct: true, width: 22 }, { header: 'Kept %', pct: true }, { header: 'Changed %', pct: true },
    { header: 'Not used %', pct: true }, { header: 'Doctor added %', pct: true }, { header: 'Doctor entered' }, { header: 'Doctor entered %', pct: true },
  ];
  const rows = (data.plan ?? []).map((p): XCell[] => [
    PLAN_TYPE_LABEL[p.type] ?? p.type,
    ...(p.aiAvailable
      ? [frac(p.generated, p.visits), frac(p.casesUnchanged, p.generated), frac(p.casesChanged, p.generated), frac(p.casesNotPicked, p.generated), frac(p.casesAdded, p.generated)]
      : ['AI not suggesting yet', null, null, null, null]),
    p.doctorEntered, frac(p.doctorEntered, p.visits),
  ]);
  return { cols, rows };
}
