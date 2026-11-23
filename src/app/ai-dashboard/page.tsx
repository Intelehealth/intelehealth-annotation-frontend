'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MismatchDashboard } from '@/components/mismatch/dashboard';
import { Shell } from '@/components/mismatch/shared';
import { apiMessage } from '@/lib/api/workspaces';
import { mismatchAPI, SOURCE_LABEL, type DashboardProgramme, type MismatchWorkspace } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';

const LAST_PROGRAM_KEY = 'ai-dashboard-program';

/** Standalone AI Use dashboard, one programme at a time (?program=NAS|TURN). */
function AiDashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  // #18: every signed-in user sees every programme; workspace access (links, export rights) only where a member.
  const [workspaces, setWorkspaces] = useState<DashboardProgramme[] | null>(null);
  const [memberOf, setMemberOf] = useState<MismatchWorkspace[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mismatchAPI.dashboardProgrammes().then(setWorkspaces).catch((e) => setError(apiMessage(e, 'Could not load programmes')));
    mismatchAPI.list().then(setMemberOf).catch(() => setMemberOf([]));
  }, []);

  // D10: ?program wins; otherwise the programme last opened here (this browser), then NAS, then the first.
  const remembered = (() => { try { return localStorage.getItem(LAST_PROGRAM_KEY); } catch { return null; } })();
  const current = workspaces?.find((w) => w.source === params.get('program'))
    ?? workspaces?.find((w) => w.source === remembered)
    ?? workspaces?.find((w) => w.source === 'NAS')
    ?? workspaces?.[0];
  useEffect(() => {
    if (!current) return;
    try { localStorage.setItem(LAST_PROGRAM_KEY, current.source); } catch { /* storage unavailable */ }
  }, [current]);

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-blue-950">AI Use Dashboard</h1>
        </div>
        {current?.member && (
          <Link href={`/workspaces/${current._id}/mismatch`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
            Open {SOURCE_LABEL[current.source]} mismatches <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {workspaces && workspaces.length === 0 && <p className="text-sm text-slate-500">No programme workspace</p>}

      {workspaces && workspaces.length > 1 && (
        <div className="inline-flex rounded-xl border bg-white p-1 shadow-sm" role="tablist" aria-label="Programme">
          {workspaces.map((w) => (
            <button key={w._id} role="tab" aria-selected={w._id === current?._id}
              onClick={() => router.replace(`/ai-dashboard?program=${w.source}`)}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-medium',
                w._id === current?._id ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-900')}>
              {SOURCE_LABEL[w.source]}
            </button>
          ))}
        </div>
      )}

      {!workspaces && !error && <div className="h-96 animate-pulse rounded-xl bg-slate-100" />}
      {current && <MismatchDashboard key={current._id} workspaceId={current._id} programme={SOURCE_LABEL[current.source]}
        // Members keep their role's export right; a dashboard viewer may export the same aggregates (#18).
        canExport={current.member ? !!memberOf.find((w) => w._id === current._id)?.access?.canExport : true} />}
    </Shell>
  );
}

export default function Page() {
  return <Suspense><AiDashboardPage /></Suspense>;
}
