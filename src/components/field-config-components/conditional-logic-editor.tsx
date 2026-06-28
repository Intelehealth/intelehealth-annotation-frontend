'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GitBranch } from 'lucide-react';
import type { VisibilityRule } from '@/types/feature1';

/** Candidate trigger question this field can depend on. */
export interface TriggerCandidate {
  fieldName: string;
  label: string;
  columnType?: string;
  options?: string[];
}

const OPERATORS: { value: VisibilityRule['operator']; label: string; needsValue: boolean }[] = [
  { value: 'equals',     label: 'is equal to',     needsValue: true },
  { value: 'not_equals', label: 'is not equal to', needsValue: true },
  { value: 'contains',   label: 'contains',        needsValue: true },
  { value: 'not_empty',  label: 'is answered',     needsValue: false },
  { value: 'empty',      label: 'is blank',        needsValue: false },
];

const CHOICE_TYPES = ['select', 'radio', 'multiselect'];

/** Strip the "label:description" encoding used by option rows to just the label. */
function optionLabel(raw: string): string {
  const s = String(raw);
  const i = s.indexOf(':');
  return i === -1 ? s : s.slice(0, i);
}

/**
 * Admin-side editor for a field's conditional visibility rule.
 *
 * Lets an author turn a question into a conditional sub-question: "only show
 * this question when <another question> <operator> <value>". Value input is
 * option-aware (dropdown for select/radio/multiselect triggers). Passing the
 * resulting rule (or null) up is the caller's responsibility — this component
 * is controlled and stateless.
 */
export function ConditionalLogicEditor({
  rule,
  candidates,
  onChange,
  isLocked = false,
}: {
  rule?: VisibilityRule | null;
  candidates: TriggerCandidate[];
  onChange: (rule: VisibilityRule | null) => void;
  isLocked?: boolean;
}) {
  const enabled = !!rule?.dependsOn;
  const trigger = candidates.find((c) => c.fieldName === rule?.dependsOn);
  const op = OPERATORS.find((o) => o.value === rule?.operator) ?? OPERATORS[0];
  const triggerIsChoice = !!trigger && CHOICE_TYPES.includes(trigger.columnType || '');
  const triggerOptions = (trigger?.options ?? []).map(optionLabel);

  const update = (patch: Partial<VisibilityRule>) => {
    const base: VisibilityRule = {
      dependsOn: rule?.dependsOn ?? candidates[0]?.fieldName ?? '',
      operator: rule?.operator ?? 'equals',
      value: rule?.value ?? '',
    };
    onChange({ ...base, ...patch });
  };

  const toggle = (on: boolean) => {
    if (on) {
      const first = candidates[0];
      if (!first) return;
      onChange({ dependsOn: first.fieldName, operator: 'equals', value: '' });
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-teal-600" />
          Conditional Logic
        </Label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            disabled={isLocked || candidates.length === 0}
            onChange={(e) => toggle(e.target.checked)}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer disabled:opacity-40"
          />
          <span className="text-xs text-gray-600">Only show this question when…</span>
        </label>
      </div>

      {candidates.length === 0 && !enabled && (
        <p className="text-[11px] text-gray-400 italic">
          Add at least one other annotation question to use as a trigger.
        </p>
      )}

      {enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white border border-teal-100 rounded-lg p-3">
          {/* Trigger question */}
          <div>
            <Label className="text-[10px] font-bold text-gray-500">When question</Label>
            <select
              value={rule?.dependsOn || ''}
              onChange={(e) => update({ dependsOn: e.target.value })}
              disabled={isLocked}
              className="w-full h-8 px-2 mt-1 border border-gray-300 bg-white rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              {candidates.map((c) => (
                <option key={c.fieldName} value={c.fieldName}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Condition</Label>
            <select
              value={op.value}
              onChange={(e) => update({ operator: e.target.value as VisibilityRule['operator'] })}
              disabled={isLocked}
              className="w-full h-8 px-2 mt-1 border border-gray-300 bg-white rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              {OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value (option-aware; hidden for empty/not_empty) */}
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Value</Label>
            {!op.needsValue ? (
              <div className="h-8 mt-1 flex items-center text-[11px] text-gray-400 italic">
                — not needed —
              </div>
            ) : triggerIsChoice && triggerOptions.length > 0 ? (
              <select
                value={rule?.value || ''}
                onChange={(e) => update({ value: e.target.value })}
                disabled={isLocked}
                className="w-full h-8 px-2 mt-1 border border-gray-300 bg-white rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">-- choose --</option>
                {triggerOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={rule?.value || ''}
                onChange={(e) => update({ value: e.target.value })}
                placeholder="e.g. Yes"
                disabled={isLocked}
                className="h-8 text-xs mt-1 bg-white"
              />
            )}
          </div>

          <p className="sm:col-span-3 text-[10px] text-gray-400">
            This question will be hidden for annotators until the condition is met.
            Nested conditions cascade — if the trigger question is itself hidden, this one is too.
          </p>
        </div>
      )}
    </div>
  );
}
