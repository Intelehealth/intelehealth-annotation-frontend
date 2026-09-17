'use client';

import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Archive, Download, FileText, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { previewKindFor } from '@/lib/preview-kind';

interface ZipEntryInfo {
  name: string;
  isDir: boolean;
  size: number;
}

interface ZipPreviewProps {
  fileName?: string;
  size?: number;
  downloadUrl?: string;
  /** Original archive bytes (from the content endpoint) used for the real explorer. */
  buffer?: ArrayBuffer;
}

type ChildPreview =
  | { kind: 'image'; url: string }
  | { kind: 'pdf'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'other'; url: string };

export function ZipPreview({ fileName, size, downloadUrl, buffer }: ZipPreviewProps) {
  const [entries, setEntries] = useState<ZipEntryInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ZipEntryInfo | null>(null);
  const [child, setChild] = useState<ChildPreview | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!buffer) return;
    let on = true;
    setLoading(true);
    setError(null);
    setEntries([]);
    JSZip.loadAsync(buffer)
      .then(async (zip) => {
        const list: ZipEntryInfo[] = [];
        for (const entry of Object.values(zip.files)) {
          list.push({
            name: entry.name,
            isDir: entry.dir,
            size: entry.dir ? 0 : (((entry as any)._data?.uncompressedSize) as number) ?? 0,
          });
        }
        list.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
        if (on) setEntries(list);
      })
      .catch(() => {
        if (on) setError('Unable to read this archive.');
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, [buffer, reloadKey]);

  const openChild = async (entry: ZipEntryInfo) => {
    if (entry.isDir || !buffer) return;
    setActive(entry);
    setChild(null);
    const zip = await JSZip.loadAsync(buffer);
    const file = zip.file(entry.name);
    if (!file) return;
    const kind = previewKindFor('', entry.name);
    if (kind === 'image' || kind === 'svg') {
      const blob = await file.async('blob');
      setChild({ kind: 'image', url: URL.createObjectURL(blob) });
    } else if (kind === 'pdf') {
      const blob = await file.async('blob');
      setChild({ kind: 'pdf', url: URL.createObjectURL(blob) });
    } else {
      const text = await file.async('text').catch(() => '');
      setChild({ kind: 'text', text });
    }
  };

  const rows = useMemo(
    () =>
      entries.filter((e) => !active || e.name.startsWith(active.name)),
    [entries, active],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
        <Archive className="h-3.5 w-3.5 text-blue-600" />
        <span className="font-medium">{fileName || 'ZIP archive'}</span>
        {typeof size === 'number' && size > 0 && <span>· {(size / 1024).toFixed(1)} KB</span>}
        {downloadUrl && (
          <a href={downloadUrl} download={fileName} className="ml-auto inline-flex items-center gap-1 text-blue-700 hover:underline">
            <Download className="h-3.5 w-3.5" /> Download original archive
          </a>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading archive contents...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-gray-600">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-1 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No table data available for this document.</p>
        ) : (
          <div className="space-y-1">
            {active && (
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setChild(null);
                }}
                className="text-[11px] text-blue-700 hover:underline"
              >
                ← back to root
              </button>
            )}
            {rows.map((e) => (
              <button
                key={e.name}
                type="button"
                onClick={() => openChild(e)}
                disabled={e.isDir}
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs hover:bg-blue-50"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {!e.isDir && <span className="shrink-0 text-[10px] text-gray-400">{e.size}</span>}
                {e.isDir ? (
                  <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" />
                ) : (
                  <Download className="h-3 w-3 shrink-0 text-gray-300" />
                )}
              </button>
            ))}
          </div>
        )}

        {child && (
          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-2">
            <p className="mb-2 text-[10px] font-medium text-gray-500">{active?.name}</p>
            {child.kind === 'image' && (
              <img src={child.url} alt={active?.name} className="max-h-72 max-w-full object-contain bg-white" />
            )}
            {child.kind === 'pdf' && (
              <iframe title={active?.name} src={child.url} className="h-72 w-full rounded border border-gray-200 bg-white" />
            )}
            {child.kind === 'text' && (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-[11px] text-gray-700">{child.text}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}