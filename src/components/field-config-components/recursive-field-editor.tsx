'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationField, BranchOption } from '@/types/feature1';

interface RecursiveFieldEditorProps {
  field: AnnotationField;
  depth: number;
  onChange: (updated: AnnotationField) => void;
  onDelete?: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', group: 'Text Fields' },
  { value: 'textarea', label: 'Long Text', group: 'Text Fields' },
  { value: 'number', label: 'Numeric Input', group: 'Numeric Fields' },
  { value: 'select', label: 'Dropdown', group: 'Selection Fields' },
  { value: 'radio', label: 'Radio Options', group: 'Selection Fields' },
  { value: 'multiselect', label: 'Multiple Select', group: 'Selection Fields' },
  { value: 'checkbox', label: 'Checkbox Toggle', group: 'Selection Fields' },
  { value: 'selectrange', label: 'Numeric Range', group: 'Numeric Fields' },
  { value: 'rating', label: 'Star Rating', group: 'Numeric Fields' },
  { value: 'date', label: 'Date Picker', group: 'Date & Time' },
  { value: 'image', label: 'Image', group: 'Media Fields' },
  { value: 'audio', label: 'Audio', group: 'Media Fields' },
  { value: 'video', label: 'Video', group: 'Media Fields' },
];

const BRANCHABLE_TYPES = ['radio', 'multiselect', 'select', 'rating', 'checkbox'];
const MAX_DEPTH = 100;

export function RecursiveFieldEditor({ field, depth, onChange, onDelete }: RecursiveFieldEditorProps) {
  const effectiveType = field.columnType || field.fieldType;
  const isBranchable = BRANCHABLE_TYPES.includes(effectiveType);
  const isMaxDepth = false;

  // Determine options: for rating, auto-generate; for others, sync with field.options (fallback to branching.options if options is empty)
  const options: BranchOption[] = isBranchable
    ? effectiveType === 'rating'
      ? Array.from({ length: field.maxRating || 5 }, (_, i) => {
          const val = String(i + 1);
          const existing = field.branching?.options?.find(
            o => String(o.value).trim().toLowerCase() === val.trim().toLowerCase()
          );
          return existing || { value: val, requireDescription: false, childFields: [] };
        })
      : effectiveType === 'checkbox'
        ? ['True', 'False'].map(val => {
            const existing = field.branching?.options?.find(
              o => String(o.value).trim().toLowerCase() === val.trim().toLowerCase()
            );
            return existing || { value: val, requireDescription: false, childFields: [] };
          })
        : (field.options && field.options.length > 0)
        ? field.options.map(optStr => {
            const colonIdx = optStr.indexOf(':');
            const baseVal = colonIdx === -1 ? optStr : optStr.slice(0, colonIdx);
            const existing = field.branching?.options?.find(
              o => String(o.value).trim().toLowerCase() === baseVal.trim().toLowerCase()
            );
            return existing || { value: baseVal, requireDescription: false, childFields: [] };
          })
        : (field.branching?.options || [])
    : [];

  const hasBranching = options.some(o => (o.childFields?.length || 0) > 0 || o.requireDescription);

  const updateAll = (nextOptions: BranchOption[]) => {
    // Dual-sync: update both branching.options and legacy field.options
    const stringOpts = nextOptions.map(o => {
      const label = o.value;
      const desc = o.descriptionPlaceholder || '';
      return desc ? `${label}:${desc}` : label;
    });

    // Deep clone to avoid accidental mutation
    const clonedNextOptions = JSON.parse(JSON.stringify(nextOptions));
    
    onChange({ 
      ...field, 
      options: stringOpts,
      branching: { enabled: true, options: clonedNextOptions } 
    });
  };

  const updateOption = (idx: number, upd: Partial<BranchOption>) => {
    const next = [...options];
    next[idx] = { ...next[idx], ...upd };
    updateAll(next);
  };

  const addOption = () => {
    const next = [...options, { value: `Option ${options.length + 1}`, requireDescription: false, childFields: [] }];
    updateAll(next);
  };

  const deleteOption = (idx: number) => {
    const next = options.filter((_, i) => i !== idx);
    updateAll(next);
  };

  const moveOption = (idx: number, dir: 'up' | 'down') => {
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === options.length - 1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const next = [...options];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    updateAll(next);
  };

  const addChild = (optIdx: number) => {
    if (isMaxDepth) return;
    const next = [...options];
    const child: AnnotationField = { fieldName: '', fieldType: 'text', isRequired: false } as AnnotationField;
    next[optIdx] = { ...next[optIdx], childFields: [...(next[optIdx].childFields || []), child] };
    updateAll(next);
  };

  const updateChild = (optIdx: number, childIdx: number, updated: AnnotationField) => {
    const next = [...options];
    const children = [...(next[optIdx].childFields || [])];
    children[childIdx] = updated;
    next[optIdx] = { ...next[optIdx], childFields: children };
    updateAll(next);
  };

  const removeChild = (optIdx: number, childIdx: number) => {
    const next = [...options];
    next[optIdx] = {
      ...next[optIdx],
      childFields: next[optIdx].childFields?.filter((_, i) => i !== childIdx),
    };
    updateAll(next);
  };

  return (
    <div className={cn(depth > 0 && 'ml-5 pl-3 border-l-2 border-blue-100')}>
      {/* ── Field header card ── */}
      {depth > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Field Name</Label>
              <Input
                value={field.fieldName}
                onChange={e => onChange({ ...field, fieldName: e.target.value })}
                placeholder="Child question..."
                className="h-8 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Type</Label>
              <select
                value={effectiveType || 'text'}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'image') {
                    onChange({ ...field, fieldType: 'image' });
                  } else if (val === 'audio') {
                    onChange({ ...field, fieldType: 'audio' });
                  } else if (val === 'video') {
                    onChange({ ...field, fieldType: 'video' });
                  } else {
                    onChange({ ...field, fieldType: 'text', columnType: val as any });
                  }
                }}
                className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 mt-0.5 outline-none focus:border-blue-500 bg-white"
              >
                {FIELD_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={field.isRequired}
              onChange={e => onChange({ ...field, isRequired: e.target.checked })}
              className="rounded text-blue-600"
            />
            Required field
          </label>

          {/* Rating config */}
          {effectiveType === 'rating' && (
            <div>
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Max Rating</Label>
              <select
                value={field.maxRating || 5}
                onChange={e => onChange({ ...field, maxRating: Number(e.target.value) })}
                className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 mt-0.5 outline-none bg-white"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Stars</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Option rows with per-option child injection ── */}
      {isBranchable && (
        <div className={cn('space-y-2', depth > 0 && 'mt-2')}>
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {effectiveType === 'rating' ? 'Rating Options & Nested Questions' : 'Decision Options & Nested Questions'}
            </div>
            {effectiveType !== 'rating' && (
              <span className="text-[10px] text-gray-400 font-medium">
                {options.length} options
              </span>
            )}
          </div>
          
          {options.length > 0 ? (
            options.map((opt, optIdx) => (
              <OptionBranch
                key={`opt-${optIdx}`}
                option={opt}
                optIdx={optIdx}
                totalOptions={options.length}
                fieldType={effectiveType}
                depth={depth}
                hasChildren={(opt.childFields?.length || 0) > 0}
                isMaxDepth={isMaxDepth}
                onUpdate={(upd) => updateOption(optIdx, upd)}
                onAddChild={() => addChild(optIdx)}
                onUpdateChild={(childIdx, updated) => updateChild(optIdx, childIdx, updated)}
                onRemoveChild={(childIdx) => removeChild(optIdx, childIdx)}
                onDelete={() => deleteOption(optIdx)}
                onMoveUp={() => moveOption(optIdx, 'up')}
                onMoveDown={() => moveOption(optIdx, 'down')}
              />
            ))
          ) : (
            <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
              <p className="text-xs text-gray-500">No options configured yet.</p>
            </div>
          )}

          {effectiveType !== 'rating' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="w-full h-8 text-xs font-semibold border-dashed border-gray-300 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/30 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Option Card
            </Button>
          )}
        </div>
      )}

      {isMaxDepth && (
        <div className="p-2 bg-gray-100 rounded-lg text-[10px] text-gray-500 text-center mt-2">
          Max depth reached ({MAX_DEPTH} levels)
        </div>
      )}

      {/* Delete button for nested fields */}
      {depth > 0 && onDelete && (
        <button
          onClick={onDelete}
          className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3 w-3" /> Remove this child field
        </button>
      )}
    </div>
  );
}



// ─── Single option row with child injection zone ──────────────────────────
function OptionBranch({ 
  option, optIdx, totalOptions, fieldType, depth, hasChildren, isMaxDepth, 
  onUpdate, onAddChild, onUpdateChild, onRemoveChild, onDelete, onMoveUp, onMoveDown 
}: {
  option: BranchOption;
  optIdx: number;
  totalOptions: number;
  fieldType: string;
  depth: number;
  hasChildren: boolean;
  isMaxDepth: boolean;
  onUpdate: (upd: Partial<BranchOption>) => void;
  onAddChild: () => void;
  onUpdateChild: (idx: number, field: AnnotationField) => void;
  onRemoveChild: (idx: number) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const showDropZone = hasChildren || false;
  const isRating = fieldType === 'rating';

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-3xs">
      {/* Option header row */}
      <div className="flex items-center gap-2 px-2 py-2 bg-gray-50/50 border-b border-gray-100">
        
        {/* Reordering */}
        {!isRating && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={optIdx === 0}
              onClick={onMoveUp}
              className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ArrowUp className="h-2 w-2" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={optIdx === totalOptions - 1}
              onClick={onMoveDown}
              className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ArrowDown className="h-2 w-2" />
            </Button>
          </div>
        )}

        {/* Label & Description Inputs */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isRating ? (
            <span className="text-sm font-semibold text-gray-700 pl-1 w-16">
              ★ {option.value}
            </span>
          ) : (
            <>
              <Input
                value={option.value}
                onChange={e => onUpdate({ value: e.target.value.replace(/\./g, '') })} // Phase 3: sanitize dots
                placeholder="Option label (e.g. YES)"
                className="h-8 text-xs bg-white border-gray-300 focus:ring-1 focus:ring-teal-500 flex-1 max-w-[150px]"
              />
              <Input
                value={option.descriptionPlaceholder || ''}
                onChange={e => onUpdate({ descriptionPlaceholder: e.target.value })}
                placeholder="Secondary description (optional)"
                className="h-8 text-xs bg-white border-gray-300 focus:ring-1 focus:ring-teal-500 flex-[2]"
              />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Add child question */}
          {!isMaxDepth && (
            <button
              onClick={onAddChild}
              className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors border border-blue-100 bg-white"
            >
              <Plus className="h-3 w-3" /> Nest
            </button>
          )}

          {!isRating && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md ml-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Child injection zone */}
      {showDropZone && (
        <div className="px-3 py-3 space-y-3 bg-white">
          {(option.childFields || []).map((child, childIdx) => (
            <div key={childIdx} className="relative group">
              <RecursiveFieldEditor
                field={child}
                depth={depth + 1}
                onChange={(updated) => onUpdateChild(childIdx, updated)}
                onDelete={() => onRemoveChild(childIdx)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
