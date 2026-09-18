'use client';

import { useEffect, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GroupChildField } from '@/types/feature1';

// One question made of several inputs answered together. A child marked
// "annotator can add more" starts as one box and grows on demand — the shape
// you need for differentials, medications, findings, and so on.

const CHILD_TYPES: { value: GroupChildField['columnType']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'radio', label: 'Radio' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'rating', label: 'Rating' },
  { value: 'url', label: 'URL' },
];

const NEEDS_OPTIONS: GroupChildField['columnType'][] = ['radio', 'select', 'multiselect'];

const newChild = (): GroupChildField => ({
  id: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  fieldName: '',
  columnType: 'text',
  isRequired: false,
  repeatable: false,
});

/** Whether the whole set of inputs repeats (e.g. one set per medication), and how. */
export function GroupRepeatSettings({
  repeatable,
  maxEntries,
  entryLabel,
  onChange,
}: {
  repeatable?: boolean;
  maxEntries?: number;
  entryLabel?: string;
  onChange: (patch: { groupRepeatable?: boolean; groupMaxEntries?: number; groupEntryLabel?: string }) => void;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-2.5 space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
        <input
          type="checkbox"
          checked={!!repeatable}
          onChange={(e) => onChange({ groupRepeatable: e.target.checked })}
          className="rounded border-gray-300"
        />
        Annotators can add more sets of these inputs
      </label>
      {repeatable && (
        <div className="grid grid-cols-2 gap-2 pl-6">
          <label className="text-[11px] text-gray-600">
            Name of one set
            <input
              type="text"
              value={entryLabel ?? ''}
              placeholder="e.g. Medication"
              onChange={(e) => onChange({ groupEntryLabel: e.target.value || undefined })}
              className="mt-1 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs"
            />
          </label>
          <label className="text-[11px] text-gray-600">
            Maximum sets (blank = no limit)
            <input
              type="number"
              min={1}
              value={maxEntries ?? ''}
              onChange={(e) => onChange({ groupMaxEntries: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function GroupFieldEditor({
  items,
  onChange,
}: {
  items: GroupChildField[];
  onChange: (next: GroupChildField[]) => void;
}) {
  const update = (i: number, patch: Partial<GroupChildField>) =>
    onChange(items.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Inputs in this question
        </div>
        <span className="text-[10px] font-medium text-gray-400">{items.length}</span>
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-4 text-center text-xs text-gray-500">
          No inputs yet. Add the first one below.
        </p>
      )}

      {items.map((child, i) => (
        <div key={child.id} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-col pt-1.5 text-gray-300">
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            <div className="min-w-[160px] flex-1">
              <Label className="text-[10px] font-bold uppercase text-gray-500">Name</Label>
              <Input
                value={child.fieldName}
                onChange={(e) => update(i, { fieldName: e.target.value })}
                placeholder="e.g. Differential"
                aria-label={`Input ${i + 1} name`}
                className="mt-1 h-8 text-sm"
              />
            </div>

            <div className="w-[130px]">
              <Label className="text-[10px] font-bold uppercase text-gray-500">Type</Label>
              <select
                value={child.columnType}
                onChange={(e) => update(i, { columnType: e.target.value as GroupChildField['columnType'] })}
                aria-label={`Input ${i + 1} type`}
                className="mt-1 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm"
              >
                {CHILD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 pt-5">
              <button
                type="button"
                aria-label={`Move input ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:text-gray-300"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move input ${i + 1} down`}
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:text-gray-300"
              >
                ↓
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove input ${i + 1}`}
                onClick={() => remove(i)}
                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {NEEDS_OPTIONS.includes(child.columnType) && (
            <div className="mt-2">
              <Label className="text-[10px] font-bold uppercase text-gray-500">Choices (one per line)</Label>
              <ChoicesBox
                options={child.options ?? []}
                label={`Input ${i + 1} choices`}
                onChange={(options) => update(i, { options })}
              />
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={!!child.isRequired}
                onChange={(e) => update(i, { isRequired: e.target.checked })}
                className="rounded border-gray-300"
              />
              Required
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={!!child.repeatable}
                onChange={(e) => update(i, { repeatable: e.target.checked })}
                className="rounded border-gray-300"
              />
              Annotator can add more
            </label>
            {child.repeatable && (
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                Max
                <Input
                  type="number"
                  min={1}
                  value={child.maxInstances ?? ''}
                  onChange={(e) => update(i, { maxInstances: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="∞"
                  aria-label={`Input ${i + 1} maximum`}
                  className="h-7 w-16 text-xs"
                />
              </label>
            )}
          </div>

          {child.repeatable && (
            <p className="mt-1.5 text-[11px] text-gray-500">
              Starts with one box; the annotator adds more as needed. The answers are kept as a list.
            </p>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, newChild()])}
        className="flex h-8 w-full items-center justify-center gap-1.5 border-dashed border-gray-300 text-xs font-semibold hover:border-teal-500 hover:bg-teal-50/30 hover:text-teal-600"
      >
        <Plus className="h-3.5 w-3.5" />
        Add an input
      </Button>
    </div>
  );
}

/**
 * The choices of a radio or dropdown, one per line.
 *
 * It keeps the text you typed rather than re-deriving it from the saved list:
 * deriving it removed the blank line the instant you pressed Enter, so a second
 * choice could never be started. Blank lines are dropped on the way out only.
 */
function ChoicesBox({
  options,
  label,
  onChange,
}: {
  options: string[];
  label: string;
  onChange: (options: string[]) => void;
}) {
  const NL = String.fromCharCode(10);
  const [text, setText] = useState(options.join(NL));

  // Follow changes made elsewhere, but never fight what is being typed here.
  useEffect(() => {
    const saved = options.join(NL);
    const typed = text.split(NL).map((o) => o.trim()).filter(Boolean).join(NL);
    if (saved !== typed) setText(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.join('|')]);

  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(NL).map((o) => o.trim()).filter(Boolean));
      }}
      placeholder={['Confirmed', 'Provisional', 'Ruled out'].join(NL)}
      aria-label={label}
      rows={3}
      className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
    />
  );
}
