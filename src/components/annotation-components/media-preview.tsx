'use client';

import { useState, useMemo } from 'react';
import { Music, Film, RotateCcw, Loader2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  url: string;
  index?: number;
  onExpand?: () => void;
  className?: string;
}

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  url = url.replace(/^[\[\"']+/, '').replace(/[\]\"']+$/, '');
  if (/\s/.test(url) && !/%20/.test(url)) {
    try {
      const u = new URL(url);
      u.pathname = u.pathname.split('/').map(encodeURIComponent).join('/');
      url = u.toString();
    } catch {
      url = url.replace(/ /g, '%20');
    }
  }
  return url;
}

export function AudioPreview({ url: rawUrl, index, className }: MediaPreviewProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const url = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);

  if (!url) return null;

  return (
    <div className={cn('relative', className)}>
      {typeof index === 'number' && (
        <div className="absolute -top-2 -left-2 z-10 bg-black bg-opacity-70 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          {index + 1}
        </div>
      )}
      {status === 'error' ? (
        <div className="flex items-center gap-2 h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-600">
          <Music className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate flex-1">Preview unavailable</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setStatus('loading'); setAttempt((a) => a + 1); }}
            className="shrink-0 hover:text-gray-900"
            title="Retry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg h-10 pointer-events-none">
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            </div>
          )}
          <audio
            key={`${url}-${attempt}`}
            controls
            preload="metadata"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onLoadedMetadata={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className={cn('w-full h-10', status === 'loading' && 'opacity-0')}
            src={url}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}

export function VideoPreview({ url: rawUrl, index, onExpand, className }: MediaPreviewProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const url = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);

  if (!url) return null;

  return (
    <div className={cn('relative', className)}>
      {typeof index === 'number' && (
        <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          {index + 1}
        </div>
      )}
      {status === 'error' ? (
        <div className="flex flex-col items-center justify-center gap-2 h-32 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-600 p-3">
          <Film className="h-6 w-6 text-gray-400" />
          <span>Preview unavailable</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setStatus('loading'); setAttempt((a) => a + 1); }}
              className="flex items-center gap-1 hover:text-gray-900"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
            {onExpand && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="flex items-center gap-1 hover:text-gray-900"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Open overlay
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {status === 'loading' && (
            <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-gray-200 mb-1">
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          )}
          <video
            key={`${url}-${attempt}`}
            controls
            preload="metadata"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onLoadedMetadata={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className={cn('w-full max-h-56 rounded-lg bg-black', status === 'loading' && 'hidden')}
            src={url}
          >
            Your browser does not support the video element.
          </video>
        </>
      )}
      {onExpand && status === 'ready' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          className="absolute top-2 right-2 z-10 bg-white/90 border border-gray-200 rounded-full p-1 shadow-sm hover:bg-white"
          title="Open fullscreen"
        >
          <Maximize2 className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  );
}