'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, GraduationCap } from 'lucide-react';
import { Kpi, Section } from '@/components/dashboard/kpi';
import { trainingAPI, type Cohort } from '@/lib/api/training';
import { cn } from '@/lib/utils';

const LABEL: Record<string, string> = {
  diagnosis: 'Diagnostic accuracy',
  reasoning: 'Clinical reasoning',
  treatment: 'Treatment planning',
  safety: 'Patient safety',
};

function cellClass(score?: number) {
  if (score == null) return 'bg-muted/40 text-muted-foreground';
  if (score >= 80) return 'bg-emerald-500 text-white';
  if (score >= 65) return 'bg-teal-400 text-white';
  if (score >= 50) return 'bg-amber-300 text-amber-950';
  return 'bg-red-400 text-white';
}

export default function CohortDashboard() {
  const [data, setData] = useState<Cohort | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trainingAPI.cohort().then(setData).catch((e) => setError(e?.response?.data?.message ?? 'Could not load the cohort'));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  const caseTitle = (slug: string) => data.cases.find((c) => c.slug === slug)?.title ?? slug;
  const weakest = [...data.competencies].sort((a, b) => a.percent - b.percent)[0];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-teal-700"><GraduationCap className="h-4 w-4" /> Faculty view</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Batch performance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Every attempt is reviewed by the AI tutor against the same rubric, so you can see where the whole batch struggles, not just who.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Trainees" value={data.totals.trainees} />
        <Kpi label="Case attempts" value={data.totals.attempts} />
        <Kpi label="Average score" value={data.totals.averageScore ?? '–'} hint="out of 100" />
        <Kpi label="Safety flags raised" value={data.totals.safetyFlags} tone={data.totals.safetyFlags ? 'warn' : 'default'} hint="unsafe dose or missed red flag" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Trainee × case" description="Best score per trainee on each case">
          <div className="overflow-x-auto p-4" data-testid="heatmap">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground">Trainee</th>
                  {data.cases.map((c) => <th key={c.slug} className="px-1 text-center text-[11px] font-medium leading-tight text-muted-foreground">{c.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.trainees.map((t) => (
                  <tr key={t.userId}>
                    <td className="whitespace-nowrap pr-3 font-medium">{t.name}</td>
                    {data.cases.map((c) => (
                      <td key={c.slug} className={cn('h-9 min-w-16 rounded-md text-center text-xs font-semibold tabular-nums', cellClass(t.scores[c.slug]))}>
                        {t.scores[c.slug] ?? '–'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="space-y-5">
          <Section title="Batch competency profile" description={weakest ? `Weakest area: ${LABEL[weakest.key]}` : undefined}>
            <div className="space-y-3 p-4">
              {data.competencies.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-xs"><span className="font-medium">{LABEL[c.key]}</span><span className="tabular-nums text-muted-foreground">{c.percent}%</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', c.key === weakest?.key ? 'bg-amber-500' : 'bg-teal-500')} style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Most-missed diagnoses" description="Across the batch">
            <ul className="divide-y" data-testid="cohort-missed">
              {data.missed.map((m) => (
                <li key={m.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{m.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.cases.map(caseTitle).join(' · ')}</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800">{m.count}×</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <Section title="Recent submissions">
        <ul className="divide-y">
          {data.recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className={cn('w-10 rounded-md py-0.5 text-center text-xs font-semibold tabular-nums', cellClass(r.score))}>{r.score}</span>
              <span className="font-medium">{r.userName}</span>
              <span className="text-muted-foreground">{caseTitle(r.caseSlug)}</span>
              <span className="truncate text-xs text-muted-foreground">→ {r.diagnoses.join(', ')}</span>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              {!r.seeded && (
                <Link href={`/training/attempts/${r.id}`} className="inline-flex items-center gap-0.5 text-xs font-medium text-teal-700 hover:underline">Open review <ArrowUpRight className="h-3 w-3" /></Link>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
