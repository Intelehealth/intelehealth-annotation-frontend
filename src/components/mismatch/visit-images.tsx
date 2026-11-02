'use client';

import { useEffect, useState } from 'react';
import { ImageOff, Loader2, RotateCcw, X } from 'lucide-react';
import { mismatchAPI } from '@/lib/api/mismatch';

/**
 * Visit images, fetched through our backend (which holds the OpenMRS account) as
 * blobs with the normal Bearer header, so the browser never needs an OpenMRS login
 * and the JWT never goes into a URL. Minimal and functional; styling comes later.
 */
export function VisitImages({ workspaceId, uuid, count }: { workspaceId: string; uuid: string; count: number }) {
  const [open, setOpen] = useState<{ url: string; index: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <ul className="flex flex-wrap gap-3 px-4 py-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <Thumb workspaceId={workspaceId} uuid={uuid} index={i} onOpen={(url) => setOpen({ url, index: i })} />
          </li>
        ))}
      </ul>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Image ${open.index + 1}`} onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/90 p-1.5 text-slate-900">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL of a blob, not optimisable */}
          <img src={open.url} alt={`Image ${open.index + 1}`} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-md object-contain" />
        </div>
      )}
    </>
  );
}

function Thumb({ workspaceId, uuid, index, onOpen }: { workspaceId: string; uuid: string; index: number; onOpen: (url: string) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; url?: string; failed?: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    let url: string | undefined;
    mismatchAPI
      .image(workspaceId, uuid, index)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (live) setResult({ attempt, url });
        else URL.revokeObjectURL(url);
      })
      .catch(() => live && setResult({ attempt, failed: true }));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [workspaceId, uuid, index, attempt]);

  const box = 'flex h-28 w-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-muted/40 text-xs text-muted-foreground';
  if (!result || result.attempt !== attempt) {
    return <div className={box} aria-busy="true"><Loader2 className="h-4 w-4 animate-spin" /> Image {index + 1}</div>;
  }
  if (result.failed || !result.url) {
    return (
      <div className={box}>
        <ImageOff className="h-4 w-4" />
        <span>Image unavailable</span>
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="inline-flex items-center gap-1 rounded border bg-white px-1.5 py-0.5 text-[11px] text-slate-700 hover:bg-accent">
          <RotateCcw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  const url = result.url;
  return (
    <button type="button" onClick={() => onOpen(url)} className={box} title={`Open image ${index + 1}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL of a blob, not optimisable */}
      <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
    </button>
  );
}
