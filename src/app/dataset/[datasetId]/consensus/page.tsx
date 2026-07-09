'use client';

import { Fragment, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import { STATUS_DISPLAY } from '@/lib/consensus-constants';
import {
  ArrowLeft, Loader2, Search, RotateCcw, Scale, Download,
  ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  Layers, Info, Play, FileAudio
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  NOT_STARTED:     { dot: 'bg-gray-400',      bg: 'bg-gray-50 border-gray-200',      text: 'text-gray-500', label: 'Not Started' },
  IN_PROGRESS:     { dot: 'bg-blue-500',      bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-700', label: 'Pending' },
  COMPLETED:       { dot: 'bg-purple-500',    bg: 'bg-purple-50 border-purple-200',  text: 'text-purple-700', label: 'Completed' },
  PENDING_UPDATE:  { dot: 'bg-amber-500',     bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700', label: 'Pending Update' },
  AGREED:          { dot: 'bg-blue-500',      bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-700', label: 'Suggested' },
  CONFLICT:        { dot: 'bg-red-500',       bg: 'bg-red-50 border-red-200',        text: 'text-red-700', label: 'Conflict' },
  PARTIAL:         { dot: 'bg-yellow-500',    bg: 'bg-yellow-50 border-yellow-200',  text: 'text-yellow-700', label: 'Partial' },
  OVERRIDDEN:      { dot: 'bg-orange-500',    bg: 'bg-orange-50 border-orange-200',  text: 'text-orange-700', label: 'Override' },
  ADMIN_CONFIRMED: { dot: 'bg-green-500',     bg: 'bg-green-50 border-green-200',    text: 'text-green-700', label: 'Confirmed' },
};

const CELL_STATUS_BG: Record<string, string> = {
  CONFLICT: 'bg-red-50/20',
  OVERRIDDEN: 'bg-orange-50/30',
  ADMIN_CONFIRMED: 'bg-green-50/20',
};

function fmt(v: string | undefined): string {
  if (!v) return '';
  try { const p = JSON.parse(v); if (Array.isArray(p)) return p.join(', '); return v; } catch { return v; }
}

function CellValue({ value, fieldType, options, maxRating }: {
  value: string; fieldType?: string; options?: string[]; maxRating?: number;
}) {
  if (!value || value === '-') return <span className="text-gray-300">—</span>;

  const type = fieldType || 'text';

  switch (type) {
    case 'image': {
      const src = value.startsWith('http') || value.startsWith('/') ? value : `data:image/*;base64,${value}`;
      return (
        <div className="relative group w-9 h-9 shrink-0">
          <img src={src} alt=""
            className="w-9 h-9 object-cover rounded border border-gray-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      );
    }
    case 'video':
      return (
        <div className="w-9 h-9 bg-gray-200 rounded flex items-center justify-center border border-gray-200">
          <Play className="h-4 w-4 text-gray-500" />
        </div>
      );
    case 'audio':
      return (
        <button className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">
          <FileAudio className="h-3 w-3" />
          Play
        </button>
      );
    case 'rating': {
      const n = parseInt(value);
      if (isNaN(n)) return <span className="text-xs text-gray-600">{value}</span>;
      const mr = maxRating || 5;
      return (
        <span className="text-amber-400 text-xs whitespace-nowrap" title={`${n}/${mr}`}>
          {'★'.repeat(Math.min(n, mr))}{'☆'.repeat(Math.max(0, mr - n))}
        </span>
      );
    }
    case 'boolean':
    case 'checkbox': {
      const isTrue = value === 'true' || value === 'yes' || value === '1';
      return (
        <span className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border',
          isTrue ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
        )}>
          {isTrue ? 'Yes' : 'No'}
        </span>
      );
    }
    case 'select':
    case 'radio':
    case 'selectrange': {
      const chipClr = options?.includes(value)
        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : 'bg-gray-50 text-gray-600 border-gray-200';
      return (
        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border max-w-[100px] truncate', chipClr)}
          title={value}>
          {value}
        </span>
      );
    }
    case 'multiselect': {
      let items: string[] = [];
      try { const p = JSON.parse(value); if (Array.isArray(p)) items = p; else items = [value]; }
      catch { items = [value]; }
      return (
        <div className="flex flex-wrap gap-0.5 max-w-[100px]">
          {items.map((item, i) => (
            <span key={i}
              className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[50px]"
              title={item}>{item}</span>
          ))}
        </div>
      );
    }
    default: {
      const isLong = value.length > 25;
      return (
        <span className={cn('text-xs', isLong ? 'text-gray-600' : 'text-gray-800')}
          title={isLong ? value : undefined}>
          {isLong ? `${value.substring(0, 23)}...` : value}
        </span>
      );
    }
  }
}

function TreeLines({ depth }: { depth: number }) {
  if (depth === 0) return null;
  const step = 18;
  return (
    <svg width={depth * step} height="18" className="text-gray-300 shrink-0" style={{ minWidth: depth * step }}>
      {Array.from({ length: depth }).map((_, i) => {
        const cx = i * step + step / 2;
        return (
          <line key={i} x1={cx} y1={0} x2={cx} y2={18} stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        );
      })}
    </svg>
  );
}

export default function ReviewConsensusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const datasetId = params.datasetId as string;
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [annotationConfig, setAnnotationConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [sourceExpanded, setSourceExpanded] = useState<Record<number, boolean>>({});
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [currentRowIdx, setCurrentRowIdx] = useState(0);

  const handleExport = async (type: string) => {
    try {
      setExporting(true);
      await consensusAPI.exportCsv(datasetId, type);
      showToast({ title: 'Exported', description: 'File downloaded successfully', type: 'success' });
    } catch { /* ignore */ } finally { setExporting(false); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    (async () => {
      try {
        setLoading(true);
        const [rd, cd] = await Promise.all([
          consensusAPI.getReviews(datasetId).catch(() => []),
          fieldSelectionAPI.getDatasetFieldConfig(datasetId).catch(() => null),
        ]);
        if (rd?.length) setReviews(rd); else setReviews([]);
        setAnnotationConfig(cd);
      } catch { setReviews([]); } finally { setLoading(false); }
    })();
  }, [authLoading, isAuthenticated, user, datasetId]);

  // ─── Annotators across all reviews ──────────────────────────────────────
  const allAnnotators = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const r of reviews) for (const ta of r.taskAnnotations || []) {
      const has = ta.annotations && Object.values(ta.annotations).some(
        (v: any) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-'
      );
      if (has && ta.annotatorUserId) m.set(ta.annotatorUserId, { id: ta.annotatorUserId, name: ta.annotatorName || 'Annotator' });
    }
    return Array.from(m.values());
  }, [reviews]);

  // ─── Flat annotation fields (base + group instances) ────────────────────
  const allFields = useMemo(() => {
    if (!annotationConfig) return [];
    const roots = (annotationConfig.annotationFields || []).filter((f: any) => f.isNewColumn || f.isAnnotationField);
    const groups = annotationConfig.fieldGroups || [];
    const out = [...roots];
    for (const g of groups) {
      const rc = g.repeatCount || 0;
      for (let i = 1; i <= rc; i++) for (const ch of g.fields || []) {
        const crc = ch.repeatCount || 1;
        for (let j = 1; j <= crc; j++) {
          out.push({
            fieldName: crc > 1 ? `${g.groupName}_${ch.fieldName}_${j}_${i}` : `${g.groupName}_${ch.fieldName}_${i}`,
            columnType: ch.fieldType, options: ch.options || [], branching: ch.branching,
            isAnnotationField: true, isNewColumn: true, maxRating: ch.maxRating, allowHalf: ch.allowHalf,
          });
        }
      }
    }
    return out;
  }, [annotationConfig]);

  // ─── Expanded field list (with dotted paths) ────────────────────────────
  const flatExpanded = useMemo(() => {
    const out: any[] = [];
    const walk = (f: any, p: string) => {
      const c = p ? `${p}.${f.fieldName}` : f.fieldName;
      out.push({ ...f, fieldName: c });
      if (f.branching?.options) for (const o of f.branching.options) for (const ch of o.childFields || []) walk(ch, `${c}.${o.value}`);
    };
    for (const f of allFields) walk(f, '');
    return out;
  }, [allFields]);

  // ─── Field metadata lookup ──────────────────────────────────────────────
  const fieldMetaMap = useMemo(() => {
    const map = new Map<string, { type: string; options: string[]; maxRating?: number }>();
    for (const f of flatExpanded) {
      map.set(f.fieldName, { type: f.columnType, options: f.options || [], maxRating: f.maxRating });
    }
    return map;
  }, [flatExpanded]);

  // ─── Recursive tree with BRANCHES ───────────────────────────────────────
  function buildTree(fields: any[], pp: string): any[] {
    return fields.map(f => {
      const cur = pp ? `${pp}.${f.fieldName}` : f.fieldName;
      const n: any = { fieldName: cur, displayName: f.fieldName, depth: pp ? pp.split('.').length : 0, branches: null, children: [] };
      if (f.branching?.options?.length) {
        n.branches = f.branching.options.map((o: any) => ({
          value: o.value,
          children: (o.childFields || []).flatMap((ch: any) => buildTree([ch], `${cur}.${o.value}`)),
        }));
      }
      return n;
    });
  }
  const baseTree = useMemo(() => buildTree((annotationConfig?.annotationFields || []).filter((f: any) => f.isNewColumn || f.isAnnotationField), ''), [annotationConfig]);
  const groupTree = useMemo(() => {
    if (!annotationConfig?.fieldGroups) return [];
    const inst: any[] = [];
    for (const g of annotationConfig.fieldGroups) {
      const rc = g.repeatCount || 0;
      for (let i = 1; i <= rc; i++) {
        const fs = allFields.filter(f => {
          if (!f.fieldName?.includes('_')) return false;
          const parts = f.fieldName.split('_');
          if (String(parts[parts.length - 1]) !== String(i)) return false;
          return (g.fields || []).some((gf: any) => new RegExp(
            `${(g.groupName||'').replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')}_${(gf.fieldName||'').replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')}_(?:\\d+_)?${i}$`
          ).test(f.fieldName));
        });
        if (fs.length) inst.push({
          key: `${g.groupId}::${i}`,
          title: `${g.groupTitle || g.groupName || 'Group'} #${i}`,
          trees: buildTree(fs, ''),
        });
      }
    }
    return inst;
  }, [annotationConfig, allFields]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let t = 0, ns = 0, pe = 0, pu = 0, co = 0, sa = 0, cf = 0, ac = 0, ov = 0;
    for (const r of reviews) for (const fr of r.fieldReviews || []) {
      t++; const s = fr.status || 'NOT_STARTED';
      if (s === 'NOT_STARTED') ns++; else if (s === 'IN_PROGRESS' || s === 'PENDING') pe++;
      else if (s === 'PENDING_UPDATE') pu++; else if (s === 'COMPLETED') co++;
      else if (s === 'AGREED') sa++; else if (s === 'CONFLICT') cf++;
      else if (s === 'ADMIN_CONFIRMED') ac++; else if (s === 'OVERRIDDEN') ov++;
    }
    return { total: t, notStarted: ns, pending: pe, pendingUpdate: pu, completed: co, suggestedAgreement: sa, conflict: cf, adminConfirmed: ac, overridden: ov };
  }, [reviews]);

  const toggleRow = (i: number) => {
    if (expandedRows[i]) { setExpandedRows({}); return; }
    setExpandedRows({ [i]: true });
    setCurrentRowIdx(i);
  };

  const toggleBranch = (rowIdx: number, fieldName: string) => {
    const key = `${rowIdx}_${fieldName}`;
    setExpandedBranches(p => ({ ...p, [key]: !p[key] }));
  };

  useEffect(() => {
    if (reviews.length === 0) return;
    const target = currentRowIdx;
    setExpandedRows({ [target]: true });
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-review-idx="${target}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [currentRowIdx]);

  const gridTmpl = useMemo(() => {
    const n = allAnnotators.length;
    return `minmax(200px,1fr) 100px 72px repeat(${n}, minmax(100px,1fr)) 100px`;
  }, [allAnnotators.length]);

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-5">
          {/* ─── TOP NAV ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}`)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Scale className="h-4 w-4 text-indigo-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Review Consensus</h1>
            </div>
            <div className="flex items-center gap-2 relative">
              <Button size="sm" onClick={() => window.location.reload()} variant="outline" disabled={loading}>
                <RotateCcw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} /> Refresh
              </Button>
              <div className="relative">
                <Button size="sm" onClick={() => setShowExportMenu(p => !p)} disabled={exporting || !stats.total}
                  variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 font-medium">
                  <Download className="h-4 w-4 mr-1" /> Export <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 text-sm">
                    {[
                      { label: 'Final Dataset CSV', type: 'dataset' }, { label: 'Audit Trail CSV', type: 'audit' },
                      { label: 'JSON Format', type: 'json' }, { label: 'Excel Worksheet (.xlsx)', type: 'excel' },
                      { label: 'Conflict Report CSV', type: 'conflict' }, { label: 'Pending Report CSV', type: 'pending' },
                      { label: 'Agreement Metrics CSV', type: 'agreement' }, { label: 'Performance Analytics CSV', type: 'performance' },
                    ].map(o => (
                      <button key={o.type} onClick={() => { setShowExportMenu(false); handleExport(o.type); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 active:bg-gray-100 transition-colors font-medium border-b border-gray-100 last:border-b-0">{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => router.push(`/dataset/${datasetId}/generate-consensus`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm px-4">
                <Scale className="h-4 w-4 mr-1" /> Generate Consensus
              </Button>
            </div>
          </div>

          {/* ─── KPI ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-5 gap-4">
            <Kpi title="Total Fields" value={stats.total} clr="indigo" />
            <Kpi title="Suggested Agreement" value={stats.suggestedAgreement} clr="blue" />
            <Kpi title="Conflict" value={stats.conflict} clr="red" />
            <Kpi title="Confirmed" value={stats.adminConfirmed} clr="green" />
            <Kpi title="Overridden" value={stats.overridden} clr="orange" />
          </div>

          {/* ─── FILTERS ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input type="text" placeholder="Search fields..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm" />
            </div>
            {[
              ['all', 'ALL'], ['agreed', 'SUGGESTED'], ['conflict', 'CONFLICT'],
              ['pending_update', 'PENDING UPDATE'], ['overridden', 'OVERRIDDEN'], ['admin_confirmed', 'CONFIRMED'],
            ].map(([v, lbl]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={cn('px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors tracking-wide',
                  filter === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                )}>{lbl}</button>
            ))}
          </div>

          {loading && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 space-y-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-5 w-5 bg-gray-200 rounded" />
                    <div className="h-5 flex-1 bg-gray-200 rounded" />
                    <div className="h-5 w-20 bg-gray-200 rounded" />
                    <div className="h-5 w-24 bg-gray-200 rounded" />
                    <div className="h-5 w-24 bg-gray-200 rounded" />
                    <div className="h-5 w-24 bg-gray-200 rounded" />
                    <div className="h-5 w-20 bg-gray-200 rounded" />
                    <div className="h-5 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && annotationConfig && reviews.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center py-8">
              <Scale className="h-10 w-10 mx-auto mb-3 text-indigo-300" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Review consensus not yet generated</h3>
              <p className="text-sm text-gray-500">Generate consensus first.</p>
            </div>
          )}
          {!loading && !annotationConfig && reviews.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Scale className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Configure annotation fields to see consensus review</p>
            </div>
          )}

          {/* ─── REVIEW TABLE ── */}
          {!loading && reviews.length > 0 && (() => {
            const nAnn = allAnnotators.length;

            return (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid" style={{ gridTemplateColumns: gridTmpl }}>
                      {/* ===== HEADER ===== */}
                      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left"
                        style={{ gridColumn: 1 }}>Field</div>
                      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left"
                        style={{ gridColumn: 2 }}>Final</div>
                      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center"
                        style={{ gridColumn: 3 }}>Status</div>
                      {allAnnotators.map((a, i) => (
                        <div key={a.id}
                          className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center truncate"
                          style={{ gridColumn: 4 + i }} title={a.name}>
                          Ann {i + 1}
                        </div>
                      ))}
                      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left"
                        style={{ gridColumn: 4 + nAnn }}>Override</div>

                      {/* ===== REVIEW ROWS ===== */}
                      {reviews.map((review) => {
                        const open = expandedRows[review.rowIndex] !== false;
                        const rowTAs = (review.taskAnnotations || []).filter((ta: any) =>
                          ta.annotations && Object.values(ta.annotations).some(
                            (v: any) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-'
                          )
                        );

                        const rows: any[] = [];

                        const seenBranchNames = new Set<string>();
                        function markBranchChildren(nodes: any[]) {
                          for (const n of nodes) {
                            if (n.branches) {
                              for (const br of n.branches) {
                                for (const ch of br.children) {
                                  seenBranchNames.add(ch.displayName);
                                  markBranchChildren(ch.children);
                                }
                              }
                            }
                            markBranchChildren(n.children);
                          }
                        }
                        markBranchChildren(baseTree);
                        for (const gi of groupTree) markBranchChildren(gi.trees);

                        function collect(nodes: any[], parentBranchValue: string | null, out: any[]) {
                          for (const node of nodes) {
                            const fn = node.fieldName;
                            if (!node.branches && seenBranchNames.has(node.displayName)) continue;

                            const fr = (review.fieldReviews || []).find((f: any) => f.fieldName === fn) || { status: 'NOT_STARTED' };
                            const vals = allAnnotators.map(a => {
                              const ta = rowTAs.find((t: any) => t.annotatorUserId === a.id);
                              return ta?.annotations?.[fn] || '-';
                            });

                            let activeBranch: string | null = parentBranchValue;
                            if (node.branches && activeBranch === null) {
                              const nonDash = vals.filter(v => v !== '-' && v !== '');
                              const counts = new Map<string, number>();
                              for (const v of nonDash) counts.set(v, (counts.get(v) || 0) + 1);
                              let maxCount = 0;
                              counts.forEach((c, v) => { if (c > maxCount) { maxCount = c; activeBranch = v; } });
                            }

                            if (node.branches) {
                              out.push({
                                fieldName: fn, displayName: node.displayName, depth: node.depth,
                                status: fr.status || 'NOT_STARTED', finalDecision: fr.finalDecision,
                                annotatorValues: vals, children: [], isBranchInactive: false, isBranchParent: true,
                                branchChildrenCount: node.branches.reduce((s: number, br: any) => s + (br.children?.length || 0), 0),
                              });
                              for (const br of node.branches) {
                                const brActive = br.value === activeBranch;
                                for (const chNode of br.children) {
                                  const chFn = chNode.fieldName;
                                  const chFr = (review.fieldReviews || []).find((f: any) => f.fieldName === chFn) || { status: 'NOT_STARTED' };
                                  const chVals = allAnnotators.map(a => {
                                    const ta = rowTAs.find((t: any) => t.annotatorUserId === a.id);
                                    return ta?.annotations?.[chFn] || '-';
                                  });
                                  out.push({
                                    fieldName: chFn, displayName: chNode.displayName, depth: chNode.depth,
                                    status: chFr.status || 'NOT_STARTED', finalDecision: chFr.finalDecision,
                                    annotatorValues: chVals, children: [],
                                    isBranchInactive: !brActive,
                                    branchLabel: br.value,
                                    parentBranchField: fn,
                                  });
                                  collect(chNode.children, brActive ? br.value : null, out);
                                }
                              }
                            } else {
                              out.push({
                                fieldName: fn, displayName: node.displayName, depth: node.depth,
                                status: fr.status || 'NOT_STARTED', finalDecision: fr.finalDecision,
                                annotatorValues: vals, children: [], isBranchInactive: false,
                              });
                              collect(node.children, activeBranch, out);
                            }
                          }
                        }
                        collect(baseTree, null, rows);
                        for (const gi of groupTree) {
                          const gr: any[] = [];
                          collect(gi.trees, null, gr);
                          if (gr.length) rows.push({ isGroup: true, title: gi.title, children: gr });
                        }

                        const statusFilter = (s: string) => {
                          if (filter === 'agreed') return s === 'AGREED';
                          if (filter === 'conflict') return s === 'CONFLICT';
                          if (filter === 'pending_update') return s === 'PENDING_UPDATE';
                          if (filter === 'overridden') return s === 'OVERRIDDEN';
                          if (filter === 'admin_confirmed') return s === 'ADMIN_CONFIRMED';
                          return true;
                        };
                        let visible = rows.filter((r: any) => {
                          if (r.isGroup) return r.children.some((c: any) => statusFilter(c.status));
                          if (filter !== 'all' && !statusFilter(r.status)) return false;
                          if (search && !r.fieldName?.toLowerCase().includes(search.toLowerCase())) return false;
                          return true;
                        });
                        visible = visible.filter(r => {
                          if (r.parentBranchField) {
                            const key = `${review.rowIndex}_${r.parentBranchField}`;
                            return expandedBranches[key] === true;
                          }
                          return true;
                        });

                        const rowConflictCount = rows.filter((r: any) => r.status === 'CONFLICT').length;
                        const rowResolvedCount = rows.filter((r: any) => r.status === 'ADMIN_CONFIRMED' || r.status === 'OVERRIDDEN').length;
                        const rowTotalFields = rows.length;
                        const rowProgress = rowTotalFields > 0 ? Math.round((rowResolvedCount / rowTotalFields) * 100) : 0;

                        return (
                          <Fragment key={review.rowIndex}>
                            <div data-review-idx={review.rowIndex}
                              className={cn(
                                'border-b border-gray-200 cursor-pointer transition-colors group flex items-center gap-2 px-3 py-2.5',
                                currentRowIdx === review.rowIndex ? 'bg-indigo-50/60' : 'bg-gray-100/70 hover:bg-gray-100'
                              )}
                              style={{ gridColumn: '1 / -1' }}
                              onClick={() => toggleRow(review.rowIndex)}>
                              {open ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />}
                              <span className="font-bold text-gray-800 text-sm">Row {review.rowIndex + 1}</span>
                              <div className="flex items-center gap-2 ml-3 text-[11px]">
                                <span className="text-gray-500">{rowTotalFields} fields</span>
                                {rowConflictCount > 0 && <span className="text-red-600 font-semibold">{rowConflictCount} conflicts</span>}
                                <span className="text-gray-500">{rowResolvedCount} resolved</span>
                                <span className={cn(
                                  'font-semibold',
                                  rowProgress >= 100 ? 'text-green-600' : rowProgress > 0 ? 'text-indigo-600' : 'text-gray-400'
                                )}>{rowProgress}%</span>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all',
                                    rowProgress >= 100 ? 'bg-green-500' : rowProgress > 0 ? 'bg-indigo-500' : 'bg-gray-300')}
                                    style={{ width: `${rowProgress}%` }} />
                                </div>
                              </div>
                            </div>

                            {open && (
                              <>
                                <div className="mx-3 mt-1.5 mb-0.5" style={{ gridColumn: '1 / -1' }}>
                                  <button onClick={() => setSourceExpanded(p => ({ ...p, [review.rowIndex]: !p[review.rowIndex] }))}
                                    className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors">
                                    {sourceExpanded[review.rowIndex] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Source CSV
                                  </button>
                                  {sourceExpanded[review.rowIndex] && (
                                    <div className="mt-1.5 p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                                        {Object.entries(review.rowRawData || {}).slice(0, 12).map(([k, v]) => (
                                          <div key={k} className="flex items-center gap-1.5 truncate">
                                            <span className="font-semibold text-gray-500 shrink-0">{k}:</span>
                                            <span className="text-gray-800 truncate">{String(v)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="border-b border-gray-100 bg-gray-50/50 grid"
                                  style={{ gridColumn: '1 / -1', gridTemplateColumns: gridTmpl }}>
                                  <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider"
                                    style={{ gridColumn: 1 }}>Field</div>
                                  <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider"
                                    style={{ gridColumn: 2 }}>Final</div>
                                  <div className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center"
                                    style={{ gridColumn: 3 }}>Status</div>
                                  {allAnnotators.map((a, i) => (
                                    <div key={a.id}
                                      className="px-2 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center truncate"
                                      style={{ gridColumn: 4 + i }} title={a.name}>
                                      Ann {i + 1}
                                    </div>
                                  ))}
                                  <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider"
                                    style={{ gridColumn: 4 + nAnn }}>Override</div>
                                </div>

                                {visible.map((r: any, i: number) =>
                                  r.isGroup ? (
                                    <GroupGrid key={`g-${i}`} group={r} allAnnotators={allAnnotators}
                                      fieldMetaMap={fieldMetaMap} gridTmpl={gridTmpl}
                                      reviewRowIndex={review.rowIndex}
                                      expandedBranches={expandedBranches} toggleBranch={toggleBranch} />
                                  ) : (
                                    <DataGridRow key={`r-${i}`} row={r} allAnnotators={allAnnotators}
                                      fieldMetaMap={fieldMetaMap} gridTmpl={gridTmpl}
                                      index={i} reviewRowIndex={review.rowIndex}
                                      expandedBranches={expandedBranches} toggleBranch={toggleBranch} />
                                  )
                                )}
                                {visible.length === 0 && (
                                  <div className="px-4 py-8 text-center text-sm text-gray-400 italic"
                                    style={{ gridColumn: '1 / -1' }}>
                                    {rows.length === 0
                                      ? 'No annotation fields configured for this row'
                                      : 'No fields match the current filter'}
                                  </div>
                                )}
                              </>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ─── STICKY BOTTOM BAR ──────────────────────────────────── */}
          {reviews.length > 0 && (
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 rounded-b-2xl shadow-lg px-5 py-3 flex items-center justify-between z-10 -mx-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{reviews.length}</span>
                <span>rows</span>
                <span className="text-gray-300 mx-1">|</span>
                <span className="font-semibold text-gray-700">{stats.total}</span>
                <span>fields total</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={currentRowIdx === 0}
                  onClick={() => setCurrentRowIdx(0)} className="h-8 px-2" title="First row">
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" disabled={currentRowIdx === 0}
                  onClick={() => setCurrentRowIdx(p => Math.max(0, p - 1))} className="h-8 px-2" title="Previous row">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-gray-600 font-medium mx-1 min-w-[80px] text-center">
                  Row {currentRowIdx + 1} of {reviews.length}
                </span>
                <Button size="sm" variant="outline" disabled={currentRowIdx >= reviews.length - 1}
                  onClick={() => setCurrentRowIdx(p => Math.min(reviews.length - 1, p + 1))} className="h-8 px-2" title="Next row">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" disabled={currentRowIdx >= reviews.length - 1}
                  onClick={() => setCurrentRowIdx(reviews.length - 1)} className="h-8 px-2" title="Last row">
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const KPI_C: Record<string, { border: string; text: string; gradient: string }> = {
  indigo: { border: 'border-indigo-200', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-300' },
  blue:   { border: 'border-blue-200', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-300' },
  red:    { border: 'border-red-200', text: 'text-red-600', gradient: 'from-red-500 to-red-300' },
  green:  { border: 'border-green-200', text: 'text-green-600', gradient: 'from-green-500 to-green-300' },
  orange: { border: 'border-orange-200', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-300' },
};
function Kpi({ title, value, clr }: { title: string; value: number | string; clr: string }) {
  const c = KPI_C[clr] || KPI_C.indigo;
  return (
    <div className={cn('relative bg-white border-2 rounded-xl shadow-sm p-5 overflow-hidden', c.border)}>
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', c.gradient)} />
      <p className={cn('text-2xl font-bold', c.text)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{title}</p>
    </div>
  );
}

function GroupGrid({ group, allAnnotators, fieldMetaMap, gridTmpl, reviewRowIndex, expandedBranches, toggleBranch }: {
  group: any; allAnnotators: any[]; fieldMetaMap: Map<string, { type: string; options: string[]; maxRating?: number }>;
  gridTmpl: string; reviewRowIndex: number;
  expandedBranches: Record<string, boolean>; toggleBranch: (rowIdx: number, fieldName: string) => void;
}) {
  const nAnn = allAnnotators.length;
  return (
    <>
      <div className="border-b border-gray-100 bg-indigo-50/20 px-3 py-1.5 font-semibold text-indigo-700 text-xs flex items-center gap-1.5"
        style={{ gridColumn: '1 / -1' }}>
        <Layers className="h-3 w-3 text-indigo-500" />
        <span>{group.title}</span>
        <span className="text-xs text-gray-400 ml-1">({group.children?.length || 0} fields)</span>
      </div>
      {group.children.map((c: any, i: number) => (
        <DataGridRow key={`r-${i}`} row={c} allAnnotators={allAnnotators} fieldMetaMap={fieldMetaMap}
          gridTmpl={gridTmpl} index={i} reviewRowIndex={reviewRowIndex}
          expandedBranches={expandedBranches} toggleBranch={toggleBranch} />
      ))}
    </>
  );
}

function DataGridRow({ row, allAnnotators, fieldMetaMap, gridTmpl, index, reviewRowIndex, expandedBranches, toggleBranch }: {
  row: any; allAnnotators: any[]; fieldMetaMap: Map<string, { type: string; options: string[]; maxRating?: number }>;
  gridTmpl: string; index: number; reviewRowIndex: number;
  expandedBranches: Record<string, boolean>; toggleBranch: (rowIdx: number, fieldName: string) => void;
}) {
  const nAnn = allAnnotators.length;
  const inactive = row.isBranchInactive;
  const isParent = row.isBranchParent;
  const hasAnnotatorValues = (row.annotatorValues || []).some((v: string) => v && v !== '-');

  let finalVal: string | null = null;
  if (row.status === 'ADMIN_CONFIRMED' || row.status === 'OVERRIDDEN') finalVal = row.finalDecision || null;
  else if (row.status === 'AGREED') { const d = row.annotatorValues?.find((v: string) => v !== '-'); if (d) finalVal = d; }

  const branchKey = `${reviewRowIndex}_${row.fieldName}`;
  const branchExpanded = expandedBranches[branchKey] === true;

  const meta = fieldMetaMap.get(row.fieldName);
  const fieldType = meta?.type;
  const fieldOptions = meta?.options;
  const maxRating = meta?.maxRating;

  const rowCls = cn(
    'border-b border-gray-100 text-xs transition-colors',
    inactive && 'opacity-30',
    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
    CELL_STATUS_BG[row.status] || ''
  );

  return (
    <>
      {/* FIELD */}
      <div className={cn(rowCls, 'px-3 py-2 flex items-center')}
        style={{ gridColumn: 1, paddingLeft: `${12 + (row.depth || 0) * 18}px` }}>
        <div className="flex items-center gap-1 min-w-0">
          {isParent && (
            <button onClick={(e) => { e.stopPropagation(); toggleBranch(reviewRowIndex, row.fieldName); }}
              className="shrink-0 hover:bg-gray-200 rounded p-0.5 -ml-0.5 transition-colors">
              {branchExpanded ? <ChevronDown className="h-3 w-3 text-gray-500" /> : <ChevronRight className="h-3 w-3 text-gray-500" />}
            </button>
          )}
          {!isParent && <TreeLines depth={row.depth || 0} />}
          {inactive && (
            <span title="This field is conditional on the parent branch being active" className="shrink-0">
              <Info className="h-3 w-3 text-gray-300" />
            </span>
          )}
          {row.branchLabel && (
            <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded shrink-0 bg-indigo-100 text-indigo-700">
              {row.branchLabel}
            </span>
          )}
          <span className={cn(
            'font-medium truncate', (row.depth || 0) === 0 ? 'text-gray-800' : 'text-gray-700',
            row.status === 'OVERRIDDEN' && 'text-orange-800',
            inactive && 'text-gray-400'
          )} title={row.displayName}>
            {row.displayName}
          </span>
        </div>
      </div>

      {/* FINAL VALUE */}
      <div className={cn(rowCls, 'px-3 py-2 flex items-center')} style={{ gridColumn: 2 }}>
        {finalVal ? (
          <span className={cn('text-[11px] font-semibold', inactive ? 'text-gray-300' : 'text-gray-800')}>
            {fmt(finalVal)}
          </span>
        ) : null}
      </div>

      {/* STATUS */}
      <div className={cn(rowCls, 'px-1 py-2 flex items-center justify-center')} style={{ gridColumn: 3 }}>
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold border whitespace-nowrap',
          STATUS_BADGE[row.status]?.bg || STATUS_BADGE.NOT_STARTED.bg,
          STATUS_BADGE[row.status]?.text || STATUS_BADGE.NOT_STARTED.text
        )}>
          <span className={cn('w-1 h-1 rounded-full shrink-0',
            (STATUS_BADGE[row.status]?.dot || STATUS_BADGE.NOT_STARTED.dot))} />
          {STATUS_BADGE[row.status]?.label || STATUS_BADGE.NOT_STARTED.label}
        </span>
      </div>

      {/* ANNOTATOR 1..N */}
      {allAnnotators.map((a, i) => (
        <div key={a.id} className={cn(rowCls, 'px-2 py-2 flex items-center justify-center')}
          style={{ gridColumn: 4 + i }}>
          {hasAnnotatorValues && row.annotatorValues?.[i] && row.annotatorValues[i] !== '-' ? (
            <CellValue value={row.annotatorValues[i]} fieldType={fieldType}
              options={fieldOptions} maxRating={maxRating} />
          ) : null}
        </div>
      ))}

      {/* ADMIN OVERRIDE */}
      <div className={cn(rowCls, 'px-3 py-2 flex items-center')} style={{ gridColumn: 4 + nAnn }}>
        {row.status === 'OVERRIDDEN' && row.finalDecision ? (
          <span className="text-[11px] font-medium text-orange-700 truncate max-w-[100px]" title={row.finalDecision}>
            {fmt(row.finalDecision)}
          </span>
        ) : (
          <span className="text-gray-300 text-[11px]">—</span>
        )}
      </div>
    </>
  );
}
