'use client';

import { Input } from '@/components/ui/input';

// The caption an annotator writes for one image. The admin chooses the shape:
// free text for descriptions, a choice list for a fixed judgement such as
// relevant / not relevant, a number for a score.

export type CaptionType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'multiselect';

export function CaptionInput({
  type,
  options,
  value,
  onChange,
  disabled,
}: {
  type: CaptionType | string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  switch (type) {
    case 'radio':
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.length === 0 && <span className="text-xs text-gray-400">No choices configured.</span>}
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

    case 'textarea':
      return (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe what this image shows"
          rows={3}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-32 text-sm"
        />
      );

    default:
      return (
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Caption this image"
          className="h-8 text-sm"
        />
      );
  }
}
