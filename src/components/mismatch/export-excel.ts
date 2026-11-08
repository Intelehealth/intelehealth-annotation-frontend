import type { AiHeadline, DashboardData, TatRow } from '@/lib/api/mismatch';
import { doctorLabel, EQUIV_REASON_LABEL, RULE_LABEL } from '@/lib/api/mismatch';
import { doctorTable, planTable } from '@/lib/dashboard-tables';
import { adviceEnglish } from '@/lib/format-display';

type Cell = string | number | null;
type Col = { header: string; pct?: boolean; width?: number };

const share = (n: number, d: number) => (d ? n / d : null);

/**
 * Exports what the AI dashboard shows, with the same period / patient filters,
 * as an .xlsx with one sheet per dashboard tab. exceljs is loaded on click so
 * it stays out of the page bundle.
 */
export async function exportDashboardExcel(data: DashboardData, meta: { programme: string; period: string; patients: string; followUps?: string }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  // Writes a titled block of rows; returns the next free row.
  const block = (ws: import('exceljs').Worksheet, title: string, cols: Col[], rows: Cell[][], note?: string) => {
    const start = ws.rowCount ? ws.rowCount + 2 : 1;
    ws.getCell(start, 1).value = title;
    ws.getCell(start, 1).font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };
    let r = start + 1;
    if (note) {
      ws.getCell(r, 1).value = note;
      ws.getCell(r, 1).font = { italic: true, color: { argb: 'FF64748B' } };
      r++;
    }
    cols.forEach((c, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      const col = ws.getColumn(i + 1);
      col.width = Math.max(col.width ?? 10, c.width ?? Math.min(40, Math.max(12, c.header.length + 2)));
    });
    for (const row of rows) {
      r++;
      row.forEach((v, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = v;
        if (cols[i]?.pct && typeof v === 'number') cell.numFmt = '0.0%';
      });
    }
  };
  const sheet = (name: string) => wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 0 }] });

  const ai = data.ai;
  const { all, paediatric, adult } = ai.headline;

  // Overview
  const ov = sheet('Overview');
  block(ov, 'AI Use Dashboard', [{ header: 'Field', width: 34 }, { header: 'Value', width: 40 }], [
    ['Programme', meta.programme], ['Period', meta.period], ['Patients', meta.patients], ['Follow-up visits', meta.followUps ?? 'Follow-ups excluded'],
    ['Exported', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
    ['Follow-up visits not counted', ai.followUpVisitsExcluded],
  ], 'Follow-up visits only record medicine adherence and how the patient feels, so AI suggestions on them are not considered.');
  const head = (h: AiHeadline): Cell[][] => [
    ['Visits', h.visits, null],
    ['AI generated a Dx list', h.dxGenerated, share(h.dxGenerated, h.visits)],
    ['Doctor picked an AI Dx', h.dxPicked, share(h.dxPicked, h.dxScored)],
    ['Final Dx in AI top 5', h.top5, share(h.top5, h.dxScored)],
    ['…in AI top 3', h.top3, share(h.top3, h.dxScored)],
    ['…was the AI top 1', h.top1, share(h.top1, h.dxScored)],
    ['Doctor added a non-AI Dx', h.dxAddedNonAi, share(h.dxAddedNonAi, h.dxScored)],
    ['Doctor opened a rationale', 'Not logged by the app yet', null],
    ['AI generated a TTx list', h.ttxGenerated, share(h.ttxGenerated, h.visits)],
    ['AI medicines per case', h.ttxGenerated ? Number((h.aiMedicines / h.ttxGenerated).toFixed(2)) : null, null],
    ['Picked a medicine unchanged', h.casesUnchanged, share(h.casesUnchanged, h.ttxGenerated)],
    ['Picked a medicine with changes', h.casesChanged, share(h.casesChanged, h.ttxGenerated)],
    ['Did not pick an AI medicine', h.casesNotPicked, share(h.casesNotPicked, h.ttxGenerated)],
    ['Added a new medicine', h.casesAdded, share(h.casesAdded, h.ttxGenerated)],
  ];
  block(ov, 'Headline (all patients)', [{ header: 'Metric', width: 34 }, { header: 'Count' }, { header: '%', pct: true }], head(all),
    'Dx % are of visits with an AI list; TTx % are of visits with an AI treatment plan.');
  const pa = head(paediatric);
  const ad = head(adult);
  block(ov, `Paediatric (age ${ai.headline.paediatricMaxAge} or under) vs adult`,
    [{ header: 'Metric', width: 34 }, { header: 'Paediatric' }, { header: 'Paediatric %', pct: true }, { header: 'Adult' }, { header: 'Adult %', pct: true }],
    pa.map((r, i) => [r[0], r[1], r[2], ad[i][1], ad[i][2]]));

  // Diagnosis
  const dxCols: Col[] = [{ header: 'Visits' }, { header: 'Scored' }, { header: 'Picked AI Dx %', pct: true }, { header: 'Top 5 %', pct: true }, { header: 'Top 3 %', pct: true }, { header: 'Top 1 %', pct: true }, { header: 'Added non-AI Dx' }, { header: 'Equivalent, not picked (separate)' }];
  const dxCells = (r: { visits: number; scored: number; picked: number; top1: number; top3: number; top5: number; addedNonAi: number; equivalent?: number }): Cell[] =>
    [r.visits, r.scored, share(r.picked, r.scored), share(r.top5, r.scored), share(r.top3, r.scored), share(r.top1, r.scored), r.addedNonAi, r.equivalent ?? 0];
  const dx = sheet('Diagnosis');
  block(dx, 'Top 5 / 3 / 1 by day', [{ header: 'Date' }, ...dxCols], ai.byDay.map((r) => [r.name, ...dxCells(r)]));
  block(dx, 'By doctor and day', [{ header: 'Date' }, { header: 'Doctor' }, ...dxCols], ai.byDoctorDay.map((r) => [r.date, doctorLabel(r.doctor), ...dxCells(r)]));
  block(dx, "Report by doctor's final diagnosis", [{ header: 'Diagnosis', width: 40 }, ...dxCols], ai.byDx.map((r) => [r.name, ...dxCells(r)]));
  block(dx, 'AI confidence label calibration', [{ header: 'Label' }, { header: 'Suggestions' }, { header: 'Doctor picked it %', pct: true }, { header: 'Avg rank' }, { header: 'As AI #1' }, { header: '#1 picked %', pct: true }],
    data.confidence.map((r) => [r.name, r.suggestions, share(r.picked, r.suggestions), r.avgRank != null ? Number(r.avgRank.toFixed(2)) : null, r.asTop1, share(r.top1Picked, r.asTop1)]));
  block(dx, 'Agreement per AI #1 diagnosis', [{ header: "AI's #1 diagnosis", width: 40 }, { header: 'Visits' }, { header: 'In top 5 %', pct: true }, { header: 'Doctor picked #1 %', pct: true }, { header: 'MRR' }],
    data.aiTop1Agreement.map((r) => [r.name, r.visits, share(r.top5, r.visits), share(r.top1, r.visits), Number(r.mrr.toFixed(3))]));
  block(dx, 'Most common misses (AI #1 → doctor)', [{ header: 'Pair', width: 60 }, { header: 'Visits' }], data.mismatchPairs.missed.map((r) => [r.name, r.count]));
  block(dx, 'Right list, wrong order (AI #1 → doctor)', [{ header: 'Pair', width: 60 }, { header: 'Visits' }], data.mismatchPairs.rankedLower.map((r) => [r.name, r.count]));
  block(dx, 'By specialty', [{ header: 'Specialty' }, { header: 'Visits' }, { header: 'Top 5 %', pct: true }, { header: 'Top 1 %', pct: true }, { header: 'MRR' }],
    data.specialties.map((r) => [r.name, r.visits, share(r.top5, r.visits), share(r.top1, r.visits), Number(r.mrr.toFixed(3))]));

  // Treatment
  const tx = sheet('Treatment');
  block(tx, 'Type of change (AI medicines kept but changed)', [{ header: 'Change', width: 28 }, { header: 'Medicines' }],
    Object.entries(ai.changeTypes).map(([k, n]) => [k.replace(/_/g, ' '), n]));
  block(tx, 'Report by AI medicine', [{ header: 'Medicine', width: 50 }, { header: 'Suggested' }, { header: 'Unchanged %', pct: true }, { header: 'Changed %', pct: true }, { header: 'Not picked %', pct: true }, { header: 'Dose' }, { header: 'Frequency' }, { header: 'Duration' }, { header: 'Instructions' }, { header: 'Paediatric' }],
    ai.medicines.map((m) => [m.name, m.suggested, share(m.unchanged, m.suggested), share(m.changed, m.suggested), share(m.notPicked, m.suggested), m.changes.dose, m.changes.frequency, m.changes.duration, m.changes.instructions, m.paediatric]));
  const plan = planTable(data);
  if (plan.rows.length) block(tx, 'Treatment plan by type', plan.cols, plan.rows, '% of visits; kept / changed / not used / doctor added are % of visits where the AI suggested that type.');
  block(tx, 'Medicines the doctor added', [{ header: 'Medicine', width: 50 }, { header: 'Times added' }, { header: 'Paediatric' }, { header: 'Commonest dose', width: 24 }, { header: 'Commonest frequency', width: 24 }, { header: 'Commonest duration', width: 20 }],
    ai.addedMedicines.map((m) => [m.name, m.count, m.paediatric, m.dose, m.frequency, m.duration]));
  block(tx, 'Medicines added, by diagnosis', [{ header: 'Diagnosis → medicine', width: 70 }, { header: 'Times' }], data.addedForDiagnosis.map((r) => [r.name, r.count]));

  // D3: equivalent suggested but not picked (separate from the strict numbers)
  if (ai.equivalent) {
    const eqs = sheet('Equivalent not picked');
    block(eqs, 'Equivalent suggested, not picked', [{ header: 'Metric', width: 40 }, { header: 'Visits' }, { header: '% of visits with an AI list', pct: true }], [
      ['Strict: final Dx in AI top 5', all.top5, share(all.top5, all.dxScored)],
      ['Strict: final Dx in AI top 1', all.top1, share(all.top1, all.dxScored)],
      ['Equivalent suggested, not picked', all.dxEquivalentNotPicked, share(all.dxEquivalentNotPicked, all.dxScored)],
    ], 'Separate metric: an AI suggestion matching the doctor\'s own Dx by a named rule that the doctor did not pick. Strict numbers are unchanged.');
    block(eqs, 'Pairs', [{ header: 'AI suggestion', width: 40 }, { header: "Doctor's diagnosis", width: 40 }, { header: 'Rule', width: 26 }, { header: 'Avg AI rank' }, { header: 'Visits' }, { header: 'Reviewed' }, { header: 'Overruled' }],
      ai.equivalent.pairs.map((p) => [p.aiName, p.doctorName, RULE_LABEL[p.rule] ?? p.rule, p.avgRank, p.count, p.reviewed, p.overruled]));
    block(eqs, 'By rule', [{ header: 'Rule', width: 26 }, { header: 'Visits' }, { header: 'Reviewed' }, { header: 'Overruled' }],
      ai.equivalent.byRule.map((r) => [RULE_LABEL[r.rule] ?? r.rule, r.count, r.reviewed, r.overruled]));
    block(eqs, 'Why not picked (annotators)', [{ header: 'Reason', width: 50 }, { header: 'Visits' }],
      ai.equivalent.reasons.map((r) => [EQUIV_REASON_LABEL[r.name] ?? r.name, r.count]));
  }

  // Doctors
  const dr = sheet('Doctors');
  const doc = doctorTable(data);
  block(dr, 'By doctor', doc.cols, doc.rows, 'Pseudo id only. Blank = fewer than 5 visits. In the note = doctor opened the note -> prescription shared.');
  block(dr, 'Annotator verdicts by doctor', [{ header: 'Doctor' }, { header: 'Visits' }, { header: 'Mismatches' }, { header: 'Reviewed' }, { header: 'Dx: doctor right' }, { header: 'Dx: AI right' }, { header: 'TTx: doctor right' }, { header: 'TTx: AI right' }],
    (data.doctors ?? []).map((r) => [doctorLabel(r.doctor), r.visits, r.mismatches, r.annotated, r.ddxDoctorRight, r.ddxAiRight, r.ttxDoctorRight, r.ttxAiRight]));

  // Turnaround time (minutes; every visit, follow-ups included)
  if (data.tat) {
    const tt = sheet('Turnaround time');
    const tatCols: Col[] = [{ header: 'Visits' }, { header: 'Prescription shared' }, { header: 'Wait median (min)' }, { header: 'Wait p90 (min)' },
      { header: 'In the note median (min)' }, { header: 'In the note p90 (min)' }, { header: 'Total median (min)' }, { header: 'Total p90 (min)' },
      { header: 'Shared within 1 h %', pct: true }, { header: 'Over 24 h' }];
    const tatCells = (r: TatRow): Cell[] => [r.visits, r.shared, r.waitMedian, r.waitP90, r.consultMedian, r.consultP90, r.totalMedian, r.totalP90, share(r.sharedWithin1h, r.shared), r.over24h];
    const t = data.tat;
    block(tt, 'Turnaround time', [{ header: 'Patients', width: 16 }, ...tatCols], [t.all, t.paediatric, t.adult].map((r) => [r.name, ...tatCells(r)]),
      'Wait = visit started -> doctor opened the note; in the note = note opened -> prescription shared; total = visit started -> prescription shared.');
    const kind = (k: string) => (k === 'follow_up' ? 'Follow-up visit' : 'New visit');
    if (t.byKind) block(tt, 'New vs follow-up visits', [{ header: 'Visit type', width: 18 }, ...tatCols], t.byKind.map((r) => [kind(r.name), ...tatCells(r)]), 'Follow-up = the doctor\'s only diagnosis is "Follow-up visit".');
    if (t.byDoctorKind) block(tt, 'By doctor: new vs follow-up', [{ header: 'Doctor', width: 16 }, { header: 'Visit type', width: 18 }, ...tatCols], t.byDoctorKind.map((r) => [doctorLabel(r.doctor), kind(r.kind), ...tatCells(r)]));
    block(tt, 'By doctor', [{ header: 'Doctor', width: 16 }, ...tatCols], t.byDoctor.map((r) => [doctorLabel(r.name), ...tatCells(r)]));
    block(tt, 'By month', [{ header: 'Month', width: 16 }, ...tatCols], [...t.byMonth].reverse().map((r) => [r.name, ...tatCells(r)]));
    block(tt, 'By doctor and month', [{ header: 'Month', width: 12 }, { header: 'Doctor', width: 16 }, ...tatCols], t.byDoctorMonth.map((r) => [r.month, doctorLabel(r.doctor), ...tatCells(r)]));
    block(tt, 'By day', [{ header: 'Date', width: 14 }, ...tatCols], [...t.byDay].reverse().map((r) => [r.name, ...tatCells(r)]));
  }

  // Tests, advice & referrals
  const od = sheet('Tests, advice, referrals');
  block(od, 'Entered by the doctor (the AI does not suggest these yet)', [{ header: 'Metric', width: 30 }, { header: 'Visits' }, { header: '% of visits', pct: true }], [
    ['Investigations ordered', all.investigations, share(all.investigations, all.visits)],
    ['Advice given', all.advice, share(all.advice, all.visits)],
    ['Referred', all.referral, share(all.referral, all.visits)],
    ['Follow-up scheduled', all.followUp, share(all.followUp, all.visits)],
  ]);
  block(od, 'Investigations', [{ header: 'Test', width: 40 }, { header: 'Times' }], ai.orders.investigations.map((r) => [r.name, r.count]));
  block(od, 'Referred to', [{ header: 'Referral', width: 40 }, { header: 'Times' }], ai.orders.referrals.map((r) => [r.name, r.count]));
  block(od, 'Advice', [{ header: 'Advice', width: 70 }, { header: 'Times' }], ai.orders.advice.map((r) => [adviceEnglish(r.name), r.count]));

  // Annotation
  const s = data.summary;
  // Review status is over the mismatches in the workspace queue (follow-up-only visits are not in it).
  const queued = s.review.done + s.review.in_progress + s.review.pending;
  const an = sheet('Annotation');
  block(an, 'Review status', [{ header: 'Status', width: 28 }, { header: 'Mismatches' }, { header: '%', pct: true }], [
    ['Annotated', s.review.done, share(s.review.done, queued)],
    ['In review', s.review.in_progress, share(s.review.in_progress, queued)],
    ['To review', s.review.pending, share(s.review.pending, queued)],
    ['Discussed with clinical team', s.review.discussed ?? 0, share(s.review.discussed ?? 0, queued)],
  ]);
  block(an, 'Annotator progress (by annotation date)', [{ header: 'Annotator', width: 28 }, { header: 'Annotated' }, { header: 'Diagnosis' }, { header: 'Treatment' }, { header: 'Flagged' }, { header: 'Discussed with clinical team', width: 28 }, { header: 'Last active', width: 22 }],
    data.progress.reviewers.map((r) => [r.name, r.annotated, r.ddx, r.ttx, r.followUp, r.discussed ?? 0, r.lastActive]));
  block(an, 'Mismatch type', [{ header: 'Type', width: 28 }, { header: 'Visits' }], [
    ['Diagnosis only', s.mismatch.ddx], ['Treatment only', s.mismatch.ttx], ['Diagnosis and treatment', s.mismatch.both], ['No mismatch', s.mismatch.none],
  ]);
  block(an, 'Doctor rejected the AI (stated reason)', [{ header: 'Reason', width: 40 }, { header: 'Visits' }], (data.rejections ?? []).map((r) => [r.name, r.count]));

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI-dashboard_${meta.programme.replace(/\W+/g, '-')}_${meta.period.replace(/\W+/g, '-')}${meta.followUps === 'Follow-ups included' ? '_with-follow-ups' : ''}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
