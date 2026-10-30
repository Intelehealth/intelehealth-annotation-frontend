'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MismatchDashboard } from '@/components/mismatch/dashboard';
import { Shell } from '@/components/mismatch/shared';
import { apiMessage } from '@/lib/api/workspaces';
import { mismatchAPI, SOURCE_LABEL, type MismatchWorkspace } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';

/** Standalone AI Use dashboard, one programme at a time (?program=NAS|TURN). */
function AiDashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [workspaces, setWorkspaces] = useState<MismatchWorkspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mismatchAPI.list().then(setWorkspaces).catch((e) => setError(apiMessage(e, 'Could not load programmes')));
  }, []);

  const current = workspaces?.find((w) => w.source === params.get('program')) ?? workspaces?.[0];

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-blue-950">AI Use Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">How doctors use the AI diagnosis and treatment suggestions, synced from OpenMRS.</p>
        </div>
        {current && (
          <Link href={`/workspaces/${current._id}/mismatch`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
            Open {SOURCE_LABEL[current.source]} mismatches <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {workspaces && workspaces.length === 0 && <p className="text-sm text-slate-500">You are not a member of any programme workspace yet.</p>}

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
      {current && <MismatchDashboard key={current._id} workspaceId={current._id} programme={SOURCE_LABEL[current.source]} />}
    </Shell>
  );
}

export default function Page() {
  return <Suspense><AiDashboardPage /></Suspense>;
}
