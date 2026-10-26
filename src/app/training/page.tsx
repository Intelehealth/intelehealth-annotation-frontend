'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Flame, GraduationCap, Stethoscope, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Kpi } from '@/components/dashboard/kpi';
import { trainingAPI, type CaseListItem, type Progress } from '@/lib/api/training';
import { cn } from '@/lib/utils';
import { scoreTone } from '@/components/training/ui';

const DIFFICULTY: Record<string, string> = {
  Foundation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

const COMPETENCIES: { key: keyof Progress['competencies']; label: string }[] = [
  { key: 'diagnosis', label: 'Diagnostic accuracy' },
  { key: 'reasoning', label: 'Clinical reasoning' },
  { key: 'treatment', label: 'Treatment planning' },
  { key: 'safety', label: 'Patient safety' },
];

export default function TrainingHome() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseListItem[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([trainingAPI.listCases(), trainingAPI.progress()])
      .then(([c, p]) => { setCases(c); setProgress(p); })
      .catch((e) => setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load cases'));
  }, []);

  const xpInLevel = progress ? progress.xp % 150 : 0;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 px-6 py-7 text-white shadow-sm">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-teal-100">
              <GraduationCap className="h-4 w-4" /> Intelehealth Clinical Training
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {user?.firstName ? `Welcome back, ${user.firstName} ${user.lastName ?? ''}`.trim() : 'Clinical reasoning practice'}
            </h1>
            <p className="mt-1.5 text-sm text-teal-50/90">
              Real, de-identified teleconsultations from our rural network. Work each case the way a remote doctor
              does: commit to a diagnosis as the findings come in, write your plan, then get a case-by-case review
              of your reasoning from an AI clinical tutor.
            </p>
          </div>
          {progress && (
            <div className="flex items-center gap-5 rounded-xl bg-white/10 px-5 py-3 backdrop-blur">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-teal-100">Level</div>
                <div className="text-2xl font-semibold tabular-nums">{progress.level}</div>
              </div>
              <div className="w-40">
                <div className="flex justify-between text-[11px] text-teal-100"><span>{progress.xp} XP</span><span>{150 - xpInLevel} to next</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white" style={{ width: `${(100 * xpInLevel) / 150}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className={cn('h-5 w-5', progress.streakDays ? 'text-orange-300' : 'text-white/40')} />
                <span className="text-sm font-medium">{progress.streakDays} day streak</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {progress && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Cases completed" value={`${progress.casesCompleted}/${progress.totalCases}`} hint={`${progress.attempts} attempt${progress.attempts === 1 ? '' : 's'}`} />
            <Kpi label="Average score" value={progress.averageScore ?? '–'} hint="judged by the AI tutor" tone={progress.averageScore && progress.averageScore >= 75 ? 'good' : 'default'} />
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <div className="text-xs font-medium text-muted-foreground">Your competency profile</div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
              {COMPETENCIES.map((c) => {
                const v = progress.competencies[c.key];
                return (
                  <div key={c.key}>
                    <div className="flex justify-between text-xs"><span>{c.label}</span><span className="tabular-nums text-muted-foreground">{v == null ? '–' : `${v}%`}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-teal-500 transition-[width] duration-700" style={{ width: `${v ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold">Case library</h2>
            <p className="text-xs text-muted-foreground">From NAS teleconsultations · all patient identifiers removed</p>
          </div>
        </div>
        {!cases ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cases.map((c) => (
              <article key={c.slug} className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" data-testid={`case-card-${c.slug}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" />{c.specialty}</span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', DIFFICULTY[c.difficulty] ?? 'bg-muted')}>{c.difficulty}</span>
                </div>
                <h3 className="mt-3 font-semibold leading-snug">{c.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{c.teaser}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.estimatedMinutes} min</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.peerAttempts} peers · avg {c.peerAverage ?? '–'}</span>
                  {c.myBestScore != null && (
                    <span className={cn('inline-flex items-center gap-1 font-medium', scoreTone(c.myBestScore).text)}><Trophy className="h-3.5 w-3.5" />Best {c.myBestScore}</span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/training/${c.slug}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                  >
                    {c.myAttempts ? 'Try again' : 'Start case'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  {c.lastAttemptId && (
                    <Link href={`/training/attempts/${c.lastAttemptId}`} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Last review</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
