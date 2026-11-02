'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Loader2, RotateCcw, X } from 'lucide-react';
import { mismatchAPI } from '@/lib/api/mismatch';
import { cn } from '@/lib/utils';

/**
 * Visit images, fetched through our backend (which holds the OpenMRS account) as
 * blobs with the normal Bearer header, so the browser never needs an OpenMRS login
 * and the JWT never goes into a URL (T5). Wave 2 (V5): a thumbnail strip under the
 * vitals and a lightbox with ←/→ between images, scroll or +/− to zoom, Esc to
 * close. `openSignal` (a counter) opens the lightbox from the page's "I" key.
 * A failed image never blocks the verdict.
 */
export function VisitImages({ workspaceId, uuid, count, openSignal = 0, sources = [] }: { workspaceId: string; uuid: string; count: number; openSignal?: number; sources?: string[] }) {
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [lastSignal, setLastSignal] = useState(openSignal);

  // The "I" key bumps openSignal: open the first loaded image (adjusting state during render, no effect).
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal);
    const first = Object.keys(urls).map(Number).sort((a, b) => a - b)[0];
    if (first !== undefined) { setOpen(first); setZoom(1); }
  }

  const loaded = Object.keys(urls).map(Number).sort((a, b) => a - b);
  const step = (dir: 1 | -1) => {
    if (open === null || !loaded.length) return;
    const i = loaded.indexOf(open);
    setOpen(loaded[(i + dir + loaded.length) % loaded.length]);
    setZoom(1);
  };

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(null); }
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5));
      else if (e.key === '-') setZoom((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return (
    <>
      <ul className="flex flex-wrap gap-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <Thumb workspaceId={workspaceId} uuid={uuid} index={i} source={sources[i]}
              onUrl={(u) => setUrls((m) => { const n = { ...m }; if (u) n[i] = u; else delete n[i]; return n; })}
              onOpen={() => { setOpen(i); setZoom(1); }} />
          </li>
        ))}
      </ul>
      {open !== null && urls[open] && (
        <div role="dialog" aria-modal="true" aria-label={`Image ${open + 1} of ${count}`} onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6">
          <div className="absolute left-4 top-4 rounded bg-white/90 px-2 py-0.5 text-xs text-slate-900">Image {open + 1} of {count} · ←/→ · scroll or +/− to zoom · Esc closes</div>
          <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/90 p-1.5 text-slate-900"><X className="h-5 w-5" /></button>
          {loaded.length > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-900"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" aria-label="Next image" onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-900"><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
          <div className="max-h-full max-w-full overflow-auto" onClick={(e) => e.stopPropagation()}
            onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z + (e.deltaY < 0 ? 0.25 : -0.25))))}>
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL of a blob, not optimisable */}
            <img src={urls[open]} alt={`Image ${open + 1}`} onClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              className={cn('max-h-[85vh] max-w-[90vw] rounded-md object-contain transition-transform', zoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in')} />
          </div>
        </div>
      )}
    </>
  );
}

// The proxy's error code in plain words (T5 codes); the raw code stays in the tooltip.
const REASON: Record<string, string> = {
  OPENMRS_NOT_CONFIGURED: 'OpenMRS account not set up', IMAGE_HOST_NOT_ALLOWED: 'OpenMRS account not set up',
  OPENMRS_AUTH_FAILED: 'OpenMRS refused the image account', OPENMRS_IMAGE_NOT_FOUND: 'Image not found',
  OPENMRS_UNREACHABLE: 'OpenMRS unreachable', OPENMRS_TIMEOUT: 'OpenMRS unreachable', OPENMRS_UPSTREAM_ERROR: 'OpenMRS unreachable',
  OPENMRS_NOT_AN_IMAGE: 'Not an image', IMAGE_URL_INVALID: 'Image link is broken',
};
async function failure(e: unknown): Promise<{ code: string; text: string }> {
  const r = (e as { response?: { status?: number; data?: unknown } })?.response;
  if (!r) return { code: 'NETWORK', text: 'Could not reach the server' };
  let code = '';
  try { code = JSON.parse(await (r.data as Blob).text()).error ?? ''; } catch { /* not JSON */ }
  if (r.status === 404 && !code) return { code: 'NOT_FOUND', text: 'Image not found' };
  return { code, text: REASON[code] ?? 'Image unavailable' };
}
// The stored OpenMRS link, opened in a new tab (needs an OpenMRS login there); http upgraded to https.
const openmrsLink = (s?: string) => (s ? s.replace(/^http:\/\//i, 'https://') : undefined);

function Thumb({ workspaceId, uuid, index, source, onOpen, onUrl }: { workspaceId: string; uuid: string; index: number; source?: string; onOpen: () => void; onUrl: (url: string | null) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; url?: string; failed?: boolean; reason?: { code: string; text: string } } | null>(null);

  useEffect(() => {
    let live = true;
    let url: string | undefined;
    mismatchAPI
      .image(workspaceId, uuid, index)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (live) { setResult({ attempt, url }); onUrl(url); } else URL.revokeObjectURL(url);
      })
      .catch(async (e) => { const reason = await failure(e); if (live) setResult({ attempt, failed: true, reason }); });
    return () => {
      live = false;
      if (url) { URL.revokeObjectURL(url); onUrl(null); }
    };
    // onUrl is a fresh closure each render; the fetch depends only on the image identity and retry count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, uuid, index, attempt]);

  const box = 'flex h-[126px] w-[168px] flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-border bg-raised p-2 text-center text-xs text-muted-foreground';
  if (!result || result.attempt !== attempt) {
    return <div className={box} aria-busy="true"><Loader2 className="h-4 w-4 animate-spin" /> Image {index + 1}</div>;
  }
  if (result.failed || !result.url) {
    return (
      <div className={box} title={result.reason?.code || undefined}>
        <ImageOff className="h-4 w-4" />
        <span>Image {index + 1} unavailable</span>
        <span className="text-faint">{result.reason?.text ?? 'Image unavailable'}</span>
        <span className="flex gap-1.5">
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className="inline-flex h-[26px] items-center gap-1 rounded-md border border-control bg-surface px-2 text-xs text-foreground hover:bg-raised">
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
          {openmrsLink(source) && (
            <a href={openmrsLink(source)} target="_blank" rel="noopener noreferrer" className="inline-flex h-[26px] items-center rounded-md border border-control bg-surface px-2 text-xs text-foreground hover:bg-raised">Open in OpenMRS</a>
          )}
        </span>
      </div>
    );
  }
  const url = result.url;
  return (
    <button type="button" onClick={onOpen} className={cn(box, 'p-0')} title={`Open image ${index + 1}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL of a blob, not optimisable */}
      <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
    </button>
  );
}
