'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import { fieldSelectionAPI } from '@/lib/api/field-config';
import {
  ArrowLeft, Loader2, Scale, Download, RefreshCw, Check, RotateCcw,
  ChevronDown, ChevronRight, Layers, Search, X,
  ChevronLeft, ChevronsLeft, ChevronsRight, Save
} from 'lucide-react';

import { cn } from '@/lib/utils';

function formatDisplayValue(val: string | undefined): string {
  if (!val) return '';
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.join(', ');
    return val;
  } catch {
    return val;
  }
}

const STATUS_MAP: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  NOT_STARTED:     { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Not Started', icon: '○' },
  IN_PROGRESS:     { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'Pending', icon: '○' },
  COMPLETED:       { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600', label: 'Completed', icon: '✓' },
  PENDING_UPDATE:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', label: 'Pending Update', icon: '⚠' },
  AGREED:          { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600', label: 'Suggested Agreement', icon: '✓' },
  CONFLICT:        { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Conflict', icon: '✗' },
  PARTIAL:         { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-600', label: 'Partial', icon: '⚠' },
  OVERRIDDEN:      { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', label: 'Overridden', icon: '✔' },
  ADMIN_CONFIRMED: { bg: 'bg-green-50 border-green-200', text: 'text-green-600', label: 'Admin Confirmed', icon: '✔' },
};

function RatingPicker({ value, onChange, max = 5, allowHalf = false }: {
  value: string; onChange: (v: string) => void; max?: number; allowHalf?: boolean;
}) {
  const nums = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="flex gap-1.5 flex-wrap">
      {nums.map(n => (
        <button key={n} onClick={() => onChange(String(n))}
          className={cn(
            'w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all duration-150',
            value === String(n) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:shadow hover:-translate-y-0.5'
          )}>{n}</button>
      ))}
      {allowHalf && nums.slice(0, -1).map(n => {
        const hv = `${n + 0.5}`;
        return (
          <button key={hv} onClick={() => onChange(hv)}
            className={cn('w-10 h-10 rounded-xl text-xs font-bold border-2 transition-all', value === hv ? 'bg-indigo-400 text-white border-indigo-400 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-indigo-300')}>{n}.5</button>
        );
      })}
    </div>
  );
}

function RangePicker({ value, onChange, min = 1, max = 10, step = 1 }: {
  value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number;
}) {
  const nums: number[] = [];
  for (let i = min; i <= max; i += step) nums.push(i);
  return (
    <div className="flex gap-1.5 flex-wrap">
      {nums.map(n => (
        <button key={n} onClick={() => onChange(String(n))}
          className={cn('w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all', value === String(n) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:shadow')}>{n}</button>
      ))}
    </div>
  );
}

function MultiChipPicker({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next.join(', '));
  };
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button key={opt} onClick={() => toggle(opt)}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all', selected.includes(opt) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:shadow-sm')}>{opt}</button>
      ))}
    </div>
  );
}

function SelectCardPicker({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all', value === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:shadow-sm')}>{opt}</button>
      ))}
    </div>
  );
}

function BooleanPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {['True', 'False'].map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all min-w-[60px]', value === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300')}>{opt}</button>
      ))}
    </div>
  );
}

function getFieldIndent(fieldName: string): number {
  const parts = fieldName.split('.');
  return parts.length - 1;
}

function getFieldDisplayName(fieldName: string): string {
  const parts = fieldName.split('.');
  return parts[parts.length - 1];
}

function flattenFieldTrees(nodes: any[]): any[] {
  const out: any[] = [];
  for (const n of nodes) {
    if (n.isBranchInactive) continue;
    out.push(n);
    if (n.children?.length > 0) out.push(...flattenFieldTrees(n.children));
  }
  return out;
}

export default function GenerateConsensusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const datasetId = params.datasetId as string;

  const [reviews, setReviews] = useState<any[]>([]);
  const [annotationConfig, setAnnotationConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const filterOptions = [
    { value: 'all', label: 'All Conflicts' },
    { value: 'unresolved', label: 'Unresolved' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'high_conflict', label: 'High Conflict' },
    { value: 'agreement', label: 'Suggested Agreement' },
  ];

  const sortOptions = [
    { value: 'row', label: 'Row Number' },
    { value: 'severity', label: 'Conflict Severity' },
    { value: 'status', label: 'Status' },
  ];

  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('row');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    load();
  }, [authLoading, isAuthenticated, user, datasetId]);

  const load = async () => {
    try {
      setLoading(true);
      const [reviewsData, configData] = await Promise.all([
        consensusAPI.getReviews(datasetId).catch(() => []),
        fieldSelectionAPI.getDatasetFieldConfig(datasetId).catch(() => null),
      ]);
      if (reviewsData && reviewsData.length > 0) {
        setReviews(reviewsData);
      } else if (configData) {
        const mergedRows = await fetch(`/api/datasets/${datasetId}/merged-rows`).catch(() => null);
        setReviews(reviewsData || []);
      } else {
        setReviews([]);
      }
      setAnnotationConfig(configData);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const r = await consensusAPI.generate(datasetId);
      showToast({ title: 'Success', description: `${r.reviewsCreated} rows processed.`, type: 'success' });
      await load();
    } catch (e: any) {
      showToast({ title: 'Error', description: e?.response?.data?.message || e?.message || 'Failed', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      setExporting(true);
      await consensusAPI.exportCsv(datasetId, type);
      showToast({ title: 'Exported', description: 'File downloaded successfully', type: 'success' });
    } catch (e: any) {
      showToast({ title: 'Error', description: e?.message || 'Export failed', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const saveDecision = useCallback(async (reviewId: string, fieldName: string, value: string, source: string) => {
    if (!user || !value.trim()) return;
    const key = `${reviewId}_${fieldName}`;
    try {
      setSaving(p => ({ ...p, [key]: true }));
      await consensusAPI.resolveField(datasetId, reviewId, fieldName, value.trim(), user._id);
      setReviews(prev => prev.map(r => {
        if (r._id !== reviewId) return r;
        const fieldReviews = [...(r.fieldReviews || [])];
        const idx = fieldReviews.findIndex(fr => fr.fieldName === fieldName);
        if (idx >= 0) {
          fieldReviews[idx] = { ...fieldReviews[idx], finalDecision: value.trim(), status: 'OVERRIDDEN' };
        } else {
          fieldReviews.push({ fieldName, finalDecision: value.trim(), status: 'OVERRIDDEN', isAgreement: false, values: [] });
        }
        return { ...r, fieldReviews };
      }));
      showToast({ title: 'Decision Saved', description: `Resolved ${fieldName} successfully.`, type: 'success' });
    } catch (e: any) {
      showToast({ title: 'Error', description: e?.response?.data?.message || 'Failed', type: 'error' });
    } finally {
      setSaving(p => ({ ...p, [key]: false }));
    }
  }, [datasetId, user, showToast]);

  const clearDecision = async (reviewId: string, fieldName: string) => {
    const key = `${reviewId}_${fieldName}`;
    try {
      setSaving(p => ({ ...p, [key]: true }));
      await consensusAPI.resolveField(datasetId, reviewId, fieldName, ' ', user?._id || '');
      setReviews(prev => prev.map(r => {
        if (r._id !== reviewId) return r;
        const fieldReviews = [...(r.fieldReviews || [])];
        const idx = fieldReviews.findIndex(fr => fr.fieldName === fieldName);
        if (idx >= 0) {
          fieldReviews[idx] = { ...fieldReviews[idx], finalDecision: undefined, status: 'NOT_STARTED' };
        }
        return { ...r, fieldReviews };
      }));
      showToast({ title: 'Reset Complete', description: 'Field status reset.', type: 'success' });
    } catch (e: any) {
      showToast({ title: 'Error', description: e?.response?.data?.message || 'Reset failed', type: 'error' });
    } finally {
      setSaving(p => ({ ...p, [key]: false }));
    }
  };

  const annotationFields = useMemo(() => {
    if (!annotationConfig) return [];
    const baseFields = annotationConfig.annotationFields?.filter((f: any) => f.isNewColumn || f.isAnnotationField) || [];
    const fieldGroups = annotationConfig.fieldGroups || [];
    const expanded = [...baseFields];

    for (const group of fieldGroups) {
      const repeatCount = group.repeatCount || 0;
      const childFields = group.fields || [];

      for (let i = 1; i <= repeatCount; i++) {
        for (const child of childFields) {
          const childRepeatCount = child.repeatCount || 1;
          for (let j = 1; j <= childRepeatCount; j++) {
            const suffixedName = childRepeatCount > 1
              ? `${group.groupName}_${child.fieldName}_${j}_${i}`
              : `${group.groupName}_${child.fieldName}_${i}`;

            let options = child.options || [];
            expanded.push({
              id: childRepeatCount > 1
                ? `${group.groupId}_${child.fieldName}_${j}_${i}`
                : `${group.groupId}_${child.fieldName}_${i}`,
              fieldName: suffixedName,
              fieldType: 'text',
              columnType: child.fieldType,
              options: options,
              isAnnotationField: true,
              isNewColumn: true,
              placeholder: child.placeholder || '',
              defaultValue: child.defaultValue,
              questionTitle: child.questionTitle || child.fieldName,
              questionDescription: child.questionDescription || '',
              helpText: child.helpText || '',
              visibilityRule: child.visibilityRule,
              branching: child.branching,
              maxRating: child.maxRating,
              allowHalf: child.allowHalf,
              rangeStart: child.rangeStart,
              rangeEnd: child.rangeEnd,
              rangeStep: child.rangeStep,
            });
          }
        }
      }
    }

    return expanded;
  }, [annotationConfig]);

  const groupInstances = useMemo(() => {
    if (!annotationConfig?.fieldGroups) return [];
    const escapeRegExp = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const instances: any[] = [];
    for (const group of annotationConfig.fieldGroups) {
      const repeatCount = group.repeatCount || 0;
      for (let i = 1; i <= repeatCount; i++) {
        const instanceFields = annotationFields.filter((f: any) => {
          if (!f.fieldName || !f.fieldName.includes('_')) return false;
          const parts = f.fieldName.split('_');
          const suffix = parts[parts.length - 1];
          if (String(suffix) !== String(i)) return false;

          return (group.fields || []).some((gf: any) => {
            const groupName = group.groupName || '';
            const gfFieldName = gf.fieldName || '';
            const escapedGroupName = escapeRegExp(groupName);
            const escapedGfFieldName = escapeRegExp(gfFieldName);
            const pattern = new RegExp(`^${escapedGroupName}_${escapedGfFieldName}_(?:\\d+_)?${i}$`);
            return pattern.test(f.fieldName);
          });
        });

        if (instanceFields.length > 0) {
          instances.push({
            key: `${group.groupId}::${i}`,
            groupId: group.groupId,
            instanceIndex: i,
            title: `${group.groupTitle || group.groupName || 'Group'} #${i}`,
            fields: instanceFields,
          });
        }
      }
    }
    return instances;
  }, [annotationConfig, annotationFields]);

  const groupFieldNames = useMemo(() => {
    return new Set(groupInstances.flatMap(gi => (gi.fields || []).map((f: any) => f.fieldName)));
  }, [groupInstances]);

  const baseFields = useMemo(() => {
    return annotationFields.filter((f: any) => !groupFieldNames.has(f.fieldName));
  }, [annotationFields, groupFieldNames]);

  const expandedFieldsList = useCallback((config: any) => {
    if (!config) return [];
    const expanded: any[] = [];
    const traverse = (f: any, parentPath: string) => {
      const currentPath = parentPath ? `${parentPath}.${f.fieldName}` : f.fieldName;

      const fieldWithCorrectName = {
        ...f,
        fieldName: currentPath
      };

      expanded.push(fieldWithCorrectName);

      if (f.branching?.options) {
        f.branching.options.forEach((opt: any) => {
          const optionPath = `${currentPath}.${opt.value}`;
          if (opt.childFields) {
            opt.childFields.forEach((child: any) => {
              traverse(child, optionPath);
            });
          }
        });
      }
    };

    annotationFields.forEach((f: any) => {
      traverse(f, '');
    });
    return expanded;
  }, [annotationFields]);

  const getNestedFieldsForParent = useCallback((parentFieldName: string) => {
    if (!annotationConfig) return [];
    const allExpandedFields = [
      ...expandedFieldsList(annotationConfig)
    ];
    return allExpandedFields.filter((f: any) => f.fieldName.startsWith(`${parentFieldName}.`));
  }, [annotationConfig, expandedFieldsList]);

  const stats = useMemo(() => {
    let totalFields = 0;
    let notStarted = 0;
    let pending = 0;
    let pendingUpdate = 0;
    let completed = 0;
    let suggestedAgreement = 0;
    let conflict = 0;
    let adminConfirmed = 0;
    let overridden = 0;

    for (const r of reviews) {
      for (const fr of r.fieldReviews || []) {
        totalFields++;
        const s = fr.status || 'NOT_STARTED';
        if (s === 'NOT_STARTED') notStarted++;
        else if (s === 'IN_PROGRESS' || s === 'PENDING') pending++;
        else if (s === 'PENDING_UPDATE') pendingUpdate++;
        else if (s === 'COMPLETED') completed++;
        else if (s === 'AGREED') suggestedAgreement++;
        else if (s === 'CONFLICT') conflict++;
        else if (s === 'ADMIN_CONFIRMED') adminConfirmed++;
        else if (s === 'OVERRIDDEN') overridden++;
      }
    }

    return {
      total: totalFields,
      notStarted,
      pending,
      pendingUpdate,
      completed,
      suggestedAgreement,
      conflict,
      adminConfirmed,
      overridden,
      resolved: adminConfirmed + overridden,
    };
  }, [reviews]);

  const toggleRow = (idx: number) => setExpandedRows(p => ({ ...p, [idx]: !p[idx] }));

  // ─── Recursive field tree builder ────────────────────────────────────
  // Build tree from annotationConfig.annotationFields (base) + fieldGroups (groups w/ instances)
  // Each node represents a field, with children being branching child fields.
  // fieldName is the dotted path used to look up annotator responses.
  const baseFieldTree = useMemo(() => {
    if (!annotationConfig?.annotationFields) return [];
    const configFields = annotationConfig.annotationFields.filter((f: any) => f.isNewColumn || f.isAnnotationField);

    function buildTree(fields: any[], parentPath: string): any[] {
      return fields.map(f => {
        const currentPath = parentPath ? `${parentPath}.${f.fieldName}` : f.fieldName;
        const node: any = {
          fieldName: currentPath,
          displayName: f.fieldName,
          breadcrumb: parentPath,
          depth: parentPath ? parentPath.split('.').length : 0,
          columnType: f.columnType || f.fieldType || 'text',
          meta: {
            options: f.options || [],
            maxRating: f.maxRating || 5,
            allowHalf: f.allowHalf || false,
            rangeStart: f.rangeStart ?? 1,
            rangeEnd: f.rangeEnd ?? 10,
            rangeStep: f.rangeStep ?? 1,
          },
          children: [],
        };
        if (f.branching?.options) {
          for (const opt of f.branching.options) {
            for (const child of opt.childFields || []) {
              node.children.push(...buildTree([child], `${currentPath}.${opt.value}`));
            }
          }
        }
        return node;
      });
    }

    return buildTree(configFields, '');
  }, [annotationConfig]);

  // Build tree for each group instance (handles repeatable groups with nested branching)
  const groupInstanceTrees = useMemo(() => {
    if (!annotationConfig?.fieldGroups) return [];

    function buildTree(fields: any[], parentPath: string): any[] {
      return fields.map(f => {
        const currentPath = parentPath ? `${parentPath}.${f.fieldName}` : f.fieldName;
        const node: any = {
          fieldName: currentPath,
          displayName: f.fieldName,
          breadcrumb: parentPath,
          depth: parentPath ? parentPath.split('.').length : 0,
          columnType: f.columnType || f.fieldType || 'text',
          meta: {
            options: f.options || [],
            maxRating: f.maxRating || 5,
            allowHalf: f.allowHalf || false,
            rangeStart: f.rangeStart ?? 1,
            rangeEnd: f.rangeEnd ?? 10,
            rangeStep: f.rangeStep ?? 1,
          },
          children: [],
        };
        if (f.branching?.options) {
          for (const opt of f.branching.options) {
            for (const child of opt.childFields || []) {
              const childParentPath = `${currentPath}.${opt.value}`;
              node.children.push(...buildTree([child], childParentPath));
            }
          }
        }
        return node;
      });
    }

    // Reuse groupInstances logic to get per-instance fields with correct suffixed names
    const instances: any[] = [];
    const fieldGroups = annotationConfig.fieldGroups || [];
    const allAnnotationFields = annotationFields;

    for (const group of fieldGroups) {
      const repeatCount = group.repeatCount || 0;
      for (let i = 1; i <= repeatCount; i++) {
        const instanceFields = allAnnotationFields.filter((f: any) => {
          if (!f.fieldName || !f.fieldName.includes('_')) return false;
          const parts = f.fieldName.split('_');
          const suffix = parts[parts.length - 1];
          if (String(suffix) !== String(i)) return false;
          return (group.fields || []).some((gf: any) => {
            const escapedGroupName = group.groupName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const escapedGfFieldName = gf.fieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const pattern = new RegExp(`^${escapedGroupName}_${escapedGfFieldName}_(?:\\d+_)?${i}$`);
            return pattern.test(f.fieldName);
          });
        });

        if (instanceFields.length > 0) {
          instances.push({
            key: `${group.groupId}::${i}`,
            groupId: group.groupId,
            instanceIndex: i,
            title: `${group.groupTitle || group.groupName || 'Group'} #${i}`,
            trees: buildTree(instanceFields, ''),
          });
        }
      }
    }
    return instances;
  }, [annotationConfig, annotationFields]);

  // Build conflict items with field review details
  const conflictItems = useMemo(() => {
    const items: any[] = [];

    for (const review of reviews) {
      const activeAnnotators = (review.taskAnnotations || []).filter((ta: any) => {
        return ta.annotations && Object.values(ta.annotations).some(
          (val) => val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-'
        );
      });

      const fields = [...baseFields];
      for (const gi of groupInstances) {
        for (const f of gi.fields) {
          fields.push(f);
        }
      }

      for (const bf of fields) {
        const fieldName = bf.fieldName;
        const fr = (review.fieldReviews || []).find((f: any) => f.fieldName === fieldName) || {
          fieldName,
          isAgreement: false,
          finalDecision: undefined,
          status: 'NOT_STARTED',
          values: []
        };

        const annotatorValues = activeAnnotators.map((ta: any) => {
          return ta.annotations?.[fieldName] || '-';
        });

        const key = `${review._id}_${fieldName}`;
        const isDecided = fr.status === 'ADMIN_CONFIRMED' || fr.status === 'OVERRIDDEN';

        const fieldConfig = expandedFieldsList(annotationConfig).find((f: any) => f.fieldName === fieldName) || {};
        const meta = {
          columnType: fieldConfig.columnType || fieldConfig.fieldType || 'text',
          options: fieldConfig.options || [],
          maxRating: fieldConfig.maxRating || 5,
          allowHalf: fieldConfig.allowHalf || false,
          rangeStart: fieldConfig.rangeStart ?? 1,
          rangeEnd: fieldConfig.rangeEnd ?? 10,
          rangeStep: fieldConfig.rangeStep ?? 1,
        };

        items.push({
          reviewId: review._id,
          rowIndex: review.rowIndex,
          fieldName,
          displayName: getFieldDisplayName(fieldName),
          indent: getFieldIndent(fieldName),
          status: fr.status || 'NOT_STARTED',
          isDecided,
          finalDecision: fr.finalDecision,
          annotatorValues,
          key,
          meta,
          activeAnnotators,
          rowRawData: review.rowRawData,
          rowStatus: review.rowStatus,
          taskAnnotations: review.taskAnnotations,
          hasData: annotatorValues.some((v: string) => v !== '-'),
        });
      }
    }

    return items;
  }, [reviews, baseFields, groupInstances, annotationConfig, expandedFieldsList]);

  function getMajorityValue(values: string[]): string | null {
    const nonEmpty = values.filter(v => v !== '-');
    if (nonEmpty.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const v of nonEmpty) counts[v] = (counts[v] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  // Helper: recursively attach conflict data to field tree nodes for a specific review
  function attachReviewDataToTree(
    nodes: any[], review: any, activeAnnotators: any[],
    conflictItemMap: Record<string, any>,
    parentBranchInactive: boolean = false,
    expectedBranchBreadcrumb?: string
  ): any[] {
    const items: any[] = [];
    for (const node of nodes) {
      const fieldName = node.fieldName;
      const fr = (review.fieldReviews || []).find((f: any) => f.fieldName === fieldName) || {
        fieldName, isAgreement: false, finalDecision: undefined, status: 'NOT_STARTED', values: []
      };
      const annotatorValues = activeAnnotators.map((ta: any) => ta.annotations?.[fieldName] || '-');
      const key = `${review._id}_${fieldName}`;
      const isDecided = fr.status === 'ADMIN_CONFIRMED' || fr.status === 'OVERRIDDEN';

      // Determine if this field is in an inactive branch
      let isBranchInactive = parentBranchInactive;
      if (!isBranchInactive && expectedBranchBreadcrumb !== undefined) {
        isBranchInactive = node.breadcrumb !== expectedBranchBreadcrumb;
      }

      // Compute active branch for children
      let childExpectedBreadcrumb: string | undefined;
      let childBranchInactive = isBranchInactive;
      if (node.children?.length > 0 && !isBranchInactive) {
        const majority = getMajorityValue(annotatorValues);
        if (majority) {
          childExpectedBreadcrumb = `${fieldName}.${majority}`;
        }
      }

      const item = {
        fieldName,
        displayName: node.displayName,
        breadcrumb: node.breadcrumb,
        depth: node.depth,
        reviewId: review._id,
        rowIndex: review.rowIndex,
        status: fr.status || 'NOT_STARTED',
        isDecided,
        isBranchInactive,
        finalDecision: fr.finalDecision,
        annotatorValues,
        key,
        meta: node.meta,
        columnType: node.columnType,
        activeAnnotators,
        rowRawData: review.rowRawData,
        rowStatus: review.rowStatus,
        taskAnnotations: review.taskAnnotations,
        hasData: annotatorValues.some((v: string) => v !== '-'),
        children: attachReviewDataToTree(node.children, review, activeAnnotators, conflictItemMap, childBranchInactive, childExpectedBreadcrumb),
      };
      conflictItemMap[key] = item;
      items.push(item);
    }
    return items;
  }

  // Filter and sort
  const filteredItems = useMemo(() => {
    let items = [...conflictItems];

    // Search by row ID
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item =>
        String(item.rowIndex + 1).includes(q) ||
        item.fieldName.toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter === 'unresolved') {
      items = items.filter(i => !i.isDecided && i.status !== 'AGREED');
    } else if (filter === 'resolved') {
      items = items.filter(i => i.isDecided);
    } else if (filter === 'high_conflict') {
      items = items.filter(i => i.status === 'CONFLICT');
    } else if (filter === 'agreement') {
      items = items.filter(i => i.status === 'AGREED');
    }

    // Sort
    if (sortBy === 'row') {
      items.sort((a, b) => a.rowIndex - b.rowIndex);
    } else if (sortBy === 'severity') {
      const severity = (s: string) => s === 'CONFLICT' ? 0 : s === 'PENDING_UPDATE' ? 1 : s === 'AGREED' ? 2 : 3;
      items.sort((a, b) => severity(a.status) - severity(b.status));
    } else if (sortBy === 'status') {
      items.sort((a, b) => a.status.localeCompare(b.status));
    }

    return items;
  }, [conflictItems, search, filter, sortBy]);

  // Group by row for card display - with recursive field trees
  const rowCards = useMemo(() => {
    // Build a flat items map for filtering
    const flatMap = new Map<number, any[]>();
    for (const item of filteredItems) {
      const arr = flatMap.get(item.rowIndex) || [];
      arr.push(item);
      flatMap.set(item.rowIndex, arr);
    }

    // Build per-row conflict item map
    const rowConflictItemMap: Record<string, any> = {};

    return Array.from(flatMap.entries())
      .map(([rowIndex, flatFields]) => {
        // Find the review for this row
        const review = reviews.find(r => r.rowIndex === rowIndex);
        const activeAnnotators = (review?.taskAnnotations || []).filter((ta: any) => {
          return ta.annotations && Object.values(ta.annotations).some(
            (val: any) => val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-'
          );
        });

        // Build recursive field trees for this review using base + group instance trees
        const rowFieldTrees: any[] = [];
        for (const root of baseFieldTree) {
          rowFieldTrees.push(...attachReviewDataToTree([root], review, activeAnnotators, rowConflictItemMap));
        }
        for (const gi of groupInstanceTrees) {
          const giNode: any = {
            isGroup: true,
            title: gi.title,
            key: gi.key,
            instanceIndex: gi.instanceIndex,
            children: attachReviewDataToTree(gi.trees, review, activeAnnotators, rowConflictItemMap),
          };
          rowFieldTrees.push(giNode);
        }

        return {
          rowIndex,
          fields: flatFields,
          fieldTrees: rowFieldTrees,
          conflictCount: flatFields.filter((f: any) => f.status === 'CONFLICT').length,
          resolvedCount: flatFields.filter((f: any) => f.isDecided).length,
          totalCount: flatFields.length,
          rowStatus: flatFields[0]?.rowStatus,
          taskAnnotations: review?.taskAnnotations,
          rowRawData: review?.rowRawData,
        };
      })
      .sort((a, b) => a.rowIndex - b.rowIndex);
  }, [filteredItems, baseFieldTree, groupInstanceTrees, reviews]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Set initial focus on first row
  useEffect(() => {
    if (rowCards.length > 0 && focusedRowIndex === null) {
      setFocusedRowIndex(rowCards[0].rowIndex);
    }
  }, [rowCards, focusedRowIndex]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIndex !== null && rowRefs.current[focusedRowIndex]) {
      rowRefs.current[focusedRowIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusedRowIndex]);

  const currentFocusIdx = focusedRowIndex !== null
    ? rowCards.findIndex(c => c.rowIndex === focusedRowIndex)
    : -1;

  const goToRow = (idx: number) => {
    if (idx >= 0 && idx < rowCards.length) {
      const next = rowCards[idx];
      setFocusedRowIndex(next.rowIndex);
      if (expandedRows[next.rowIndex] === false) toggleRow(next.rowIndex);
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!isAuthenticated || user?.role?.toUpperCase() !== 'ADMIN') return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="hidden lg:flex" />
      <main className="flex-1 flex flex-col min-w-0">
        {/* STICKY TOP */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-3 md:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <MobileNav />
            <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}`)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Scale className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            <h1 className="text-base md:text-xl font-bold text-gray-950 truncate">Generate Consensus</h1>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{stats.total} fields</span>
          </div>
          <div className="flex items-center gap-2 relative flex-wrap">
            <Button size="sm" variant="outline" onClick={() => router.push(`/dataset/${datasetId}/consensus`)}><Scale className="h-4 w-4 mr-1" /> Review</Button>
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className={cn('h-4 w-4 mr-1', generating && 'animate-spin')} /> Generate
            </Button>
            <div className="relative">
              <Button size="sm" onClick={() => setShowExportMenu(p => !p)} disabled={exporting || !stats.total} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 font-medium">
                <Download className="h-4 w-4 mr-1" /> Export <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 text-sm">
                  {[
                    { label: 'Final Dataset CSV', type: 'dataset' },
                    { label: 'Audit Trail CSV', type: 'audit' },
                    { label: 'JSON Format', type: 'json' },
                    { label: 'Excel Worksheet (.xlsx)', type: 'excel' },
                    { label: 'Conflict Report CSV', type: 'conflict' },
                    { label: 'Pending Report CSV', type: 'pending' },
                    { label: 'Agreement Metrics CSV', type: 'agreement' },
                    { label: 'Performance Analytics CSV', type: 'performance' },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExport(opt.type);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 active:bg-gray-100 transition-colors font-medium border-b border-gray-100 last:border-b-0"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {loading && <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />}

            {!loading && reviews.length === 0 && !annotationConfig && (
              <div className="text-center py-20 text-gray-400">
                <Scale className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No consensus data</h3>
                <p className="text-sm mb-6">Configure fields and annotate before generating consensus.</p>
                <Button onClick={handleGenerate} disabled={generating} className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm">
                  <RefreshCw className={cn('h-4 w-4 mr-1', generating && 'animate-spin')} /> Generate Now
                </Button>
              </div>
            )}

            {!loading && stats.total === 0 && annotationConfig && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm"><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500 mt-1">Total</p></div>
                  <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 shadow-sm"><p className="text-2xl font-bold text-indigo-600">{stats.suggestedAgreement || 0}</p><p className="text-xs text-indigo-600 mt-1">Suggested Agreement</p></div>
                  <div className="p-4 rounded-xl bg-red-50/40 border border-red-100 shadow-sm"><p className="text-2xl font-bold text-red-600">{stats.conflict || 0}</p><p className="text-xs text-red-600 mt-1">Conflict</p></div>
                  <div className="p-4 rounded-xl bg-yellow-50/40 border border-yellow-100 shadow-sm"><p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p><p className="text-xs text-yellow-600 mt-1">Pending</p></div>
                  <div className="p-4 rounded-xl bg-green-50/40 border border-green-100 shadow-sm"><p className="text-2xl font-bold text-green-600">{stats.resolved || 0}</p><p className="text-xs text-green-600 mt-1">Resolved</p></div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 shadow-sm"><p className="text-2xl font-bold text-gray-400">{stats.notStarted || 0}</p><p className="text-xs text-gray-400 mt-1">Not Started</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <div className="text-center py-10">
                    <Scale className="h-12 w-12 mx-auto mb-4 text-indigo-300" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Consensus not yet generated</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Click Generate to create consensus from annotator responses.
                    </p>
                    <Button onClick={handleGenerate} disabled={generating} className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm px-6 py-3">
                      <RefreshCw className={cn('h-4 w-4 mr-2', generating && 'animate-spin')} /> Generate Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!loading && stats.total > 0 && reviews.length > 0 && (
              <>
                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard title="Total Records" value={reviews.length} color="gray" />
                  <StatCard title="Total Conflicts" value={stats.conflict} color="red" />
                  <StatCard title="Resolved" value={stats.resolved} color="green" />
                  <StatCard title="Pending" value={stats.notStarted + stats.pending} color="yellow" />
                  <StatCard
                    title="Consensus Progress"
                    value={`${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`}
                    color="indigo"
                  />
                </div>

                {/* PROGRESS BAR */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                      <span className="text-indigo-600 font-bold">{stats.resolved}</span> / {stats.total} resolved
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%`,
                          background: 'linear-gradient(90deg, #6366f1, #22c55e)'
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {stats.conflict} conflicts · {stats.suggestedAgreement} agreements
                    </span>
                  </div>
                </div>

                {/* FILTERS & SEARCH */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by Row ID or field..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-8 h-9 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {filterOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFilter(opt.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap',
                          filter === opt.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="h-9 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white text-gray-700"
                  >
                    {sortOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* CONFLICT LIST - Card-based */}
                <div className="space-y-3" ref={scrollContainerRef}>
                  {rowCards.map(card => (
                    <div key={card.rowIndex} ref={el => { rowRefs.current[card.rowIndex] = el; }}>
                      <ConflictRowCard
                        card={card}
                        isOpen={expandedRows[card.rowIndex] !== false}
                        onToggle={() => toggleRow(card.rowIndex)}
                        onSave={saveDecision}
                        onClear={clearDecision}
                        saving={saving}
                      />
                    </div>
                  ))}
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="sticky bottom-0 z-20 bg-white shadow-lg rounded-t-2xl px-6 py-4 flex items-center justify-between"
                  style={{ boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.04), 0 -2px 4px -1px rgba(0,0,0,0.02)' }}>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => goToRow(0)} disabled={currentFocusIdx < 0}>
                      <ChevronsLeft className="h-4 w-4 mr-1" /> First
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => goToRow(currentFocusIdx - 1)} disabled={currentFocusIdx <= 0}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-gray-500 mx-2">
                      {rowCards.length} rows · {filteredItems.length} fields
                    </span>
                    <Button variant="outline" size="sm" onClick={() => goToRow(currentFocusIdx + 1)} disabled={currentFocusIdx < 0 || currentFocusIdx >= rowCards.length - 1}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => goToRow(rowCards.length - 1)} disabled={currentFocusIdx < 0}>
                      Last <ChevronsRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-1.5">
                      <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                        <Save className="h-4 w-4 mr-1" /> Save Draft
                      </Button>
                      <span className="w-px h-6 bg-gray-200" />
                      <Button onClick={handleGenerate} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 font-semibold rounded-lg shadow-sm">
                        <RefreshCw className={cn('h-4 w-4 mr-1.5', generating && 'animate-spin')} /> Generate Consensus
                      </Button>
                      <span className="w-px h-6 bg-gray-200" />
                      <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                        <Check className="h-4 w-4 mr-1" /> Mark Resolved
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ title, value, color }: { title: string; value: number | string; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    gray: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-900' },
    red: { bg: 'bg-red-50/40 border-red-100', text: 'text-red-600' },
    green: { bg: 'bg-green-50/40 border-green-100', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-50/40 border-yellow-100', text: 'text-yellow-600' },
    indigo: { bg: 'bg-indigo-50/40 border-indigo-100', text: 'text-indigo-600' },
  };
  const c = colors[color] || colors.gray;
  return (
    <div className={cn('p-4 rounded-xl border shadow-sm', c.bg)}>
      <p className={cn('text-2xl font-bold', c.text)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{title}</p>
    </div>
  );
}

// ─── Conflict Row Card ─────────────────────────────────────────────────────
function ConflictRowCard({
  card, isOpen, onToggle,
  onSave, onClear, saving
}: {
  card: any; isOpen: boolean; onToggle: () => void;
  onSave: (reviewId: string, fieldName: string, value: string, source: string) => void;
  onClear: (reviewId: string, fieldName: string) => void;
  saving: Record<string, boolean>;
}) {
  const flatFields = useMemo(() => {
    const result: any[] = [];
    for (const node of card.fieldTrees) {
      if (node.isGroup) {
        result.push({ isGroup: true, title: node.title, key: node.key });
        for (const child of flattenFieldTrees(node.children)) {
          result.push({ ...child, indent: (child.depth || 0) + 1 });
        }
      } else {
        for (const child of flattenFieldTrees([node])) {
          result.push({ ...child, indent: child.depth || 0 });
        }
      }
    }
    return result;
  }, [card.fieldTrees]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 cursor-pointer hover:bg-gray-50/60 transition-colors flex items-center justify-between"
        onClick={onToggle}>
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />}
          <span className="font-bold text-gray-800 text-sm">Row {card.rowIndex + 1}</span>
          {card.conflictCount > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {card.conflictCount} conflict{card.conflictCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-gray-400">{card.totalCount} fields · {card.resolvedCount} resolved</span>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100">
          {card.rowRawData && (
            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Source Data</div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {Object.entries(card.rowRawData).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 truncate">
                    <span className="font-semibold text-gray-500 shrink-0">{k}:</span>
                    <span className="text-gray-800 truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {flatFields.map((item: any) =>
              item.isGroup ? (
                <div key={item.key} className="px-4 py-2 bg-indigo-50/30 border-b border-indigo-100 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="font-semibold text-xs text-indigo-700">{item.title}</span>
                </div>
              ) : (
                <div key={item.key} className="px-4 py-3" style={{ paddingLeft: `${16 + (item.indent || 0) * 20}px` }}>
                  <FieldPanel item={item} onSave={onSave} onClear={onClear} saving={saving} />
                </div>
              )
            )}
            {flatFields.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400 italic">No fields match the current filter</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field Panel ────────────────────────────────────────────────────────────
function FieldPanel({ item, onSave, onClear, saving }: {
  item: any;
  onSave: (reviewId: string, fieldName: string, value: string, source: string) => void;
  onClear: (reviewId: string, fieldName: string) => void;
  saving: Record<string, boolean>;
}) {
  const st = STATUS_MAP[item.status] || STATUS_MAP.NOT_STARTED;
  const isSaving = saving[item.key];
  const colType = item.columnType || item.meta?.columnType || 'text';
  const uniqueAnnotationValues = useMemo(
    () => [...new Set((item.annotatorValues || []).filter((v: string) => v !== '-'))],
    [item.annotatorValues]
  );
  const suggested = useMemo(() => {
    const nonEmpty = (item.annotatorValues || []).filter((v: string) => v !== '-');
    if (!nonEmpty.length) return null;
    const counts: Record<string, number> = {};
    for (const v of nonEmpty) counts[v] = (counts[v] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [item.annotatorValues]);

  const fieldOptions = item.meta?.options || [];
  const allOptions = [...new Set([...fieldOptions, ...uniqueAnnotationValues])];

  const [selectedVal, setSelectedVal] = useState(item.finalDecision || suggested || '');
  const [isCustom, setIsCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');

  useEffect(() => {
    setSelectedVal(item.finalDecision || suggested || '');
    setIsCustom(false);
    setCustomVal('');
  }, [item.key, item.finalDecision, suggested]);

  const handleConfirm = () => {
    const val = isCustom ? customVal.trim() : selectedVal;
    if (val && !isSaving) onSave(item.reviewId, item.fieldName, val, isCustom ? 'Custom Override' : 'Selection');
  };

  const isChoiceType = ['select', 'radio', 'dropdown', 'boolean'].includes(colType);
  const isMultiType = ['multiselect', 'checkbox'].includes(colType);
  const isRangeType = ['rating', 'selectrange', 'range'].includes(colType);
  const isTextType = ['longtext', 'textarea'].includes(colType);

  const renderAnnotatorResponses = () => {
    const annotators = item.activeAnnotators || [];
    if (!annotators.length) return <div className="text-xs text-gray-400 italic">No responses yet</div>;
    return (
      <div className="space-y-0.5">
        {annotators.map((ta: any, i: number) => {
          const val = item.annotatorValues?.[i] || '-';
          if (val === '-') return null;
          const label = ta.annotatorName?.split(' ')[0] || `A${i + 1}`;
          if (isTextType || colType === 'image' || colType === 'audio' || colType === 'video') {
            return (
              <div key={ta.annotatorUserId} className="border border-gray-200 rounded-lg p-2 bg-white mb-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{label}</div>
                {renderPreview(colType, val, item.isDecided, item.finalDecision)}
              </div>
            );
          }
          if (isMultiType) {
            const selected = val.split(',').map((s: string) => s.trim()).filter(Boolean);
            return (
              <div key={ta.annotatorUserId} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-500 w-6 shrink-0">{label}</span>
                <div className="flex gap-1 flex-wrap">
                  {selected.map((s: string) => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700">{s}</span>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <div key={ta.annotatorUserId} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-500 w-6 shrink-0">{label}</span>
              <span className="text-gray-800 font-medium">{formatDisplayValue(val)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAdminControls = () => {
    if (isChoiceType) {
      return (
        <div className="space-y-1">
          {allOptions.map(opt => (
            <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-0.5 rounded transition-colors">
              <input type="radio" name={`admin-${item.key}`} checked={!isCustom && selectedVal === opt}
                onChange={() => { setSelectedVal(opt); setIsCustom(false); }}
                className="accent-indigo-600" />
              <span className="font-medium">{opt}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-0.5 rounded transition-colors">
            <input type="radio" name={`admin-${item.key}`} checked={isCustom}
              onChange={() => { setIsCustom(true); setSelectedVal(''); }}
              className="accent-indigo-600" />
            <span className="font-medium">Custom</span>
          </label>
          {isCustom && (
            colType === 'boolean' ? (
              <div className="ml-6 mt-1">
                <BooleanPicker value={customVal} onChange={setCustomVal} />
              </div>
            ) : (
              <input type="text" value={customVal} onChange={e => setCustomVal(e.target.value)}
                placeholder="Enter custom value..." autoFocus
                className="ml-6 mt-1 w-full max-w-xs text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 bg-white" />
            )
          )}
        </div>
      );
    }

    if (isMultiType) {
      return (
        <div>
          <MultiChipPicker value={isCustom ? customVal : selectedVal} onChange={v => { setSelectedVal(v); setIsCustom(false); }} options={item.meta?.options || []} />
          {suggested && (
            <button onClick={() => { setSelectedVal(suggested); setIsCustom(false); }}
              className="mt-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
              Select suggested: {formatDisplayValue(suggested)}
            </button>
          )}
        </div>
      );
    }

    if (isRangeType) {
      return (
        <div>
          {colType === 'rating' ? (
            <RatingPicker value={isCustom ? customVal : selectedVal} onChange={v => { setSelectedVal(v); setIsCustom(false); }}
              max={item.meta?.maxRating || 5} allowHalf={item.meta?.allowHalf} />
          ) : (
            <RangePicker value={isCustom ? customVal : selectedVal} onChange={v => { setSelectedVal(v); setIsCustom(false); }}
              min={item.meta?.rangeStart ?? 1} max={item.meta?.rangeEnd ?? 10} step={item.meta?.rangeStep ?? 1} />
          )}
        </div>
      );
    }

    if (isTextType) {
      return (
        <div>
          {suggested && (
            <button onClick={() => { setSelectedVal(suggested); setIsCustom(false); }}
              className={cn(
                'mb-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                !isCustom && selectedVal === suggested
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              )}>
              Select Suggested
            </button>
          )}
          <textarea value={isCustom ? customVal : (selectedVal !== suggested ? selectedVal : '')}
            onChange={e => { setIsCustom(true); setCustomVal(e.target.value); }}
            placeholder="Type custom value..." rows={2}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 bg-white resize-y" />
        </div>
      );
    }

    return (
      <div>
        <input type="text" value={isCustom ? customVal : selectedVal}
          onChange={e => { setIsCustom(true); setCustomVal(e.target.value); }}
          placeholder="Enter value..." autoFocus
          className="w-full max-w-xs text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 bg-white" />
        {suggested && (
          <button onClick={() => { setSelectedVal(suggested); setIsCustom(false); }}
            className="ml-2 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700">
            Use suggested
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={cn(item.isBranchInactive && 'opacity-30 pointer-events-none')}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border', st.bg, st.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', st.text.replace('text-', 'bg-'))} />
          {st.label}
        </span>
        <span className="font-semibold text-sm text-gray-800">{item.displayName}</span>
        <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{colType}</span>
        {item.isDecided && (
          <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
            ✓ {formatDisplayValue(item.finalDecision)}
          </span>
        )}
      </div>

      {renderAnnotatorResponses()}

      {(suggested || item.isDecided) && <div className="border-t border-gray-100 my-2" />}

      {!item.isDecided && suggested && (
        <div className="flex items-center gap-2 text-xs mb-1.5">
          <span className="font-semibold text-gray-500">Suggested</span>
          <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">{formatDisplayValue(suggested)}</span>
        </div>
      )}

      {item.isBranchInactive && (
        <div className="text-[10px] text-gray-400 italic">Conditional branch inactive</div>
      )}

      {!item.isBranchInactive && (
        <>
          {!item.isDecided && suggested && <div className="border-t border-gray-100 my-2" />}
          <div className="text-[10px] font-semibold text-gray-500 mb-1.5">Admin Decision</div>
          {item.isDecided ? (
            <div className="flex items-center gap-2">
              <button onClick={() => onClear(item.reviewId, item.fieldName)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 transition-all">
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {renderAdminControls()}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleConfirm} disabled={isSaving || (!isCustom && !selectedVal) || (isCustom && !customVal.trim())}
                  className="px-3 py-1 text-[11px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                  {isSaving ? 'Saving...' : 'Confirm'}
                </button>
                {item.status === 'CONFLICT' && (
                  <span className="text-[10px] text-red-500 font-medium">
                    {item.annotatorValues.filter((v: string) => v !== '-').length} annotators disagree
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderPreview(colType: string, val: string, isDecided: boolean, finalDecision?: string) {
  const urls = val.split(/[,;\n]/).map((u: string) => u.trim()).filter(Boolean);
  switch (colType) {
    case 'image':
      return (
        <div className="flex gap-1">
          {urls.slice(0, 3).map(url => (
            <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="w-10 h-10 object-cover rounded border border-gray-200" /></a>
          ))}
          {urls.length > 3 && <span className="text-xs text-gray-400 self-center">+{urls.length - 3}</span>}
        </div>
      );
    case 'audio':
      return urls.slice(0, 2).map(url => <audio key={url} controls src={url} className="w-full h-7 mt-0.5" />);
    case 'video':
      return urls.slice(0, 2).map(url => <video key={url} controls src={url} className="w-full max-w-[160px] rounded mt-0.5" />);
    default:
      return <div className="text-xs text-gray-800 whitespace-pre-wrap">{formatDisplayValue(val)}</div>;
  }
}
