'use client';

import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GroupChildField } from '@/types/feature1';

// The annotator's side of a group field: each configured input, one after the
// other, with an "add another" control on the repeatable ones.
//
// Answers are stored one key per input, `<field>.<input>`. A repeatable input
// keeps its answers as a JSON array under that single key, so the set of keys
// stays fixed no matter how many boxes the annotator adds — which is what
// consensus and export rely on.

export const groupKey = (fieldName: string, child: GroupChildField) => `${fieldName}.${child.fieldName}`;

export function readList(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [''];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length ? parsed.map((v) => String(v ?? '')) : [''];
  } catch {
    // A plain value written before this field became repeatable.
  }
  return [raw];
}

export function GroupFieldInput({
  fieldName,
  childrenFields,
  values,
  onChange,
  disabled,
}: {
  fieldName: string;
  childrenFields: GroupChildField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  if (childrenFields.length === 0) {
    return <p className="text-xs text-gray-500">This question has no inputs configured yet.</p>;
  }

  return (
    <div className="space-y-3">
      {childrenFields.map((child) => {
        const key = groupKey(fieldName, child);
        const raw = values[key] ?? '';

        if (child.repeatable) {
          const list = readList(raw);
          const atMax = child.maxInstances ? list.length >= child.maxInstances : false;
          // Store exactly what is on screen, empty boxes included: dropping them
          // here deleted the box the moment "add another" created it.
          const write = (next: string[]) => onChange(key, JSON.stringify(next));
          return (
            <div key={child.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <Label className="text-xs font-semibold text-gray-700">
                {child.fieldName || 'Untitled'}
                {child.isRequired && <span className="ml-1 text-red-500">*</span>}
                <span className="ml-2 font-normal text-[11px] text-gray-400">{list.length} entered</span>
              </Label>
              <div className="mt-2 space-y-2">
                {list.map((value, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-gray-400">{i + 1}.</span>
                    <ChildInput
                      child={child}
                      value={value}
                      disabled={disabled}
                      onChange={(v) => write(list.map((old, idx) => (idx === i ? v : old)))}
                    />
                    {list.length > 1 && !disabled && (
                      <button
                        type="button"
                        aria-label={`Remove ${child.fieldName} ${i + 1}`}
                        onClick={() => write(list.filter((_, idx) => idx !== i))}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!disabled && (
                <button
                  type="button"
                  disabled={atMax}
                  onClick={() => write([...list, ''])}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:border-teal-400 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {atMax ? `Maximum ${child.maxInstances}` : `Add another ${child.fieldName || 'entry'}`}
                </button>
              )}
            </div>
          );
        }

        return (
          <div key={child.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <Label className="text-xs font-semibold text-gray-700">
              {child.fieldName || 'Untitled'}
              {child.isRequired && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <div className="mt-2">
              <ChildInput child={child} value={raw} disabled={disabled} onChange={(v) => onChange(key, v)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChildInput({
  child,
  value,
  onChange,
  disabled,
}: {
  child: GroupChildField;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const options = child.options ?? [];

  switch (child.columnType) {
    case 'radio':
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              disabled={disabled}
              onClick={() => onChange(value === o ? '' : o)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                value === o
                  ? 'border-teal-400 bg-teal-50 font-medium text-teal-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o}
            </button>
          ))}
          {options.length === 0 && <span className="text-xs text-gray-400">No choices configured.</span>}
        </div>
      );

    case 'multiselect': {
      const picked = value ? value.split('|').filter(Boolean) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = picked.includes(o);
            return (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => onChange((on ? picked.filter((p) => p !== o) : [...picked, o]).join('|'))}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  on ? 'border-teal-400 bg-teal-50 font-medium text-teal-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
    }

    case 'select':
      return (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm"
        >
          <option value="">Choose…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={value === 'true'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="rounded border-gray-300"
          />
          Yes
        </label>
      );

    case 'textarea':
      return (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={child.placeholder}
          rows={3}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
      );

    case 'rating': {
      const current = Number(value) || 0;
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(current === n ? '' : String(n))}
              className={`h-7 w-7 rounded-md border text-xs ${
                current >= n ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-400'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      );
    }

    default:
      return (
        <Input
          type={child.columnType === 'number' ? 'number' : child.columnType === 'date' ? 'date' : 'text'}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={child.placeholder}
          className="h-8 flex-1 text-sm"
        />
      );
  }
}
