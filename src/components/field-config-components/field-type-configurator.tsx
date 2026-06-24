'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface OptionRow {
  id: string;
  label: string;
  description: string;
}

export function OptionRowEditor({
  options,
  onChange,
  isLocked = false,
}: {
  options: string[] | undefined;
  onChange: (opts: string[]) => void;
  isLocked?: boolean;
}) {
  const [rows, setRows] = useState<OptionRow[]>([]);

  // Parse external options prop
  useEffect(() => {
    const parsed = Array.isArray(options) ? options.map((opt, idx) => {
      const s = String(opt);
      const colonIdx = s.indexOf(':');
      const label = colonIdx === -1 ? s : s.slice(0, colonIdx);
      const description = colonIdx === -1 ? '' : s.slice(colonIdx + 1);

      // Reuse existing ID if available to keep focus and cursor stable during editing
      const existingId = rows[idx]?.id;
      return {
        id: existingId || `row-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label,
        description,
      };
    }) : [];

    // Only set if structurally different to prevent resetting caret position on typing
    const currentSerialized = rows.map(r => r.description ? `${r.label}:${r.description}` : r.label);
    const incomingSerialized = parsed.map(r => r.description ? `${r.label}:${r.description}` : r.label);
    const isSame = currentSerialized.length === incomingSerialized.length &&
      currentSerialized.every((val, idx) => val === incomingSerialized[idx]);

    if (!isSame) {
      setRows(parsed);
    }
  }, [options]);

  const updateParent = (newRows: OptionRow[]) => {
    const serialized = newRows.map(r => {
      const lbl = r.label;
      const desc = r.description;
      return desc ? `${lbl}:${desc}` : lbl;
    });
    onChange(serialized);
  };

  const handleRowChange = (id: string, field: 'label' | 'description', value: string) => {
    const updated = rows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setRows(updated);
    updateParent(updated);
  };

  const addRow = () => {
    const newRow: OptionRow = {
      id: `row-new-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: '',
      description: '',
    };
    const updated = [...rows, newRow];
    setRows(updated);
    updateParent(updated);
  };

  const deleteRow = (id: string) => {
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    updateParent(updated);
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rows.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...rows];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    setRows(updated);
    updateParent(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          Decision Options & Descriptions
        </Label>
        <span className="text-[10px] text-gray-400 font-medium">
          {rows.length} options
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-3xs"
            >
              {/* Reordering */}
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLocked || index === 0}
                  onClick={() => moveRow(index, 'up')}
                  className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLocked || index === rows.length - 1}
                  onClick={() => moveRow(index, 'down')}
                  className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Label Input */}
              <div className="flex-1 min-w-[120px]">
                <Input
                  value={row.label}
                  onChange={(e) => handleRowChange(row.id, 'label', e.target.value)}
                  placeholder="Option label (e.g. YES)"
                  className="h-8 text-xs bg-white border-gray-300 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  disabled={isLocked}
                />
              </div>

              {/* Description Input */}
              <div className="flex-[2] min-w-[200px]">
                <Input
                  value={row.description}
                  onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                  placeholder="Secondary description (optional)"
                  className="h-8 text-xs bg-white border-gray-300 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  disabled={isLocked}
                />
              </div>

              {/* Delete button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLocked}
                onClick={() => deleteRow(row.id)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
          <p className="text-xs text-gray-500">No options configured yet.</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLocked}
        onClick={addRow}
        className="w-full h-8 text-xs font-semibold border-dashed border-gray-300 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/30 flex items-center justify-center gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Option Card
      </Button>
    </div>
  );
}

interface FieldTypeConfiguratorProps {
  type: string;
  field: any;
  onChange: (updates: any) => void;
  isLocked?: boolean;
}

export function FieldTypeConfigurator({
  type,
  field,
  onChange,
  isLocked = false,
}: {
  type: string;
  field: any;
  onChange: (updates: any) => void;
  isLocked?: boolean;
}) {
  // Live range preview helper for selectrange
  const renderRangePreview = () => {
    const start = field.rangeStart !== undefined ? Number(field.rangeStart) : 1;
    const end = field.rangeEnd !== undefined ? Number(field.rangeEnd) : 10;
    const step = field.rangeStep !== undefined ? Number(field.rangeStep) : 1;

    if (isNaN(start) || isNaN(end) || isNaN(step) || step <= 0 || start > end) {
      return (
        <span className="text-[10px] text-red-500 italic">
          Invalid range settings. Ensure Start &le; End and Step &gt; 0.
        </span>
      );
    }

    const previewOpts: string[] = [];
    for (let val = start; val <= end; val += step) {
      previewOpts.push(String(val));
      if (previewOpts.length >= 20) {
        previewOpts.push('...');
        break;
      }
    }

    return (
      <div className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1 font-mono">
        Preview: {previewOpts.join(', ')}
      </div>
    );
  };

  switch (type) {
    case 'text':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Placeholder Text</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder="e.g. Enter name"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Max Length (Characters)</Label>
            <Input
              type="number"
              value={field.maxLength !== undefined ? field.maxLength : ''}
              onChange={(e) => onChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 255"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
        </div>
      );

    case 'textarea':
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label className="text-[10px] font-bold text-gray-500">Placeholder Text</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder="e.g. Write review"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Rows (Default Height)</Label>
            <Input
              type="number"
              value={field.rows !== undefined ? field.rows : 4}
              onChange={(e) => onChange({ rows: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 4"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Max Length (Characters)</Label>
            <Input
              type="number"
              value={field.maxLength !== undefined ? field.maxLength : ''}
              onChange={(e) => onChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 1000"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
        </div>
      );

    case 'number':
      return (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Minimum Value</Label>
            <Input
              type="number"
              value={field.min !== undefined ? field.min : ''}
              onChange={(e) => onChange({ min: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 0"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Maximum Value</Label>
            <Input
              type="number"
              value={field.max !== undefined ? field.max : ''}
              onChange={(e) => onChange({ max: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 100"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Step Value</Label>
            <Input
              type="number"
              value={field.step !== undefined ? field.step : 1}
              onChange={(e) => onChange({ step: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 1"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          {field.min !== undefined && field.max !== undefined && field.min > field.max && (
            <p className="col-span-3 text-[10px] text-red-500 font-semibold mt-1">
              Warning: Minimum value cannot be greater than Maximum value.
            </p>
          )}
        </div>
      );

    case 'select':
    case 'radio':
      return (
        <div className="space-y-3">
          <OptionRowEditor
            options={field.options}
            onChange={(opts) => onChange({ options: opts })}
            isLocked={isLocked}
          />
          {Array.isArray(field.options) && field.options.length > 0 && (
            <div>
              <Label className="text-[10px] font-bold text-gray-500">Default Selected</Label>
              <select
                value={field.defaultValue || ''}
                onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
                className="w-full h-8 px-2 py-1 mt-1 border border-gray-300 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 animate-fade-in"
                disabled={isLocked}
              >
                <option value="">-- None --</option>
                {field.options.map((opt: string) => {
                  const colonIdx = opt.indexOf(':');
                  const label = colonIdx === -1 ? opt : opt.slice(0, colonIdx);
                  return (
                    <option key={opt} value={opt}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      );

    case 'selectrange':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px] font-bold text-gray-500">Range Start</Label>
              <Input
                type="number"
                value={field.rangeStart !== undefined ? field.rangeStart : 1}
                onChange={(e) => onChange({ rangeStart: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 1"
                className="h-8 text-xs mt-1 bg-white"
                disabled={isLocked}
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-gray-500">Range End</Label>
              <Input
                type="number"
                value={field.rangeEnd !== undefined ? field.rangeEnd : 10}
                onChange={(e) => onChange({ rangeEnd: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 10"
                className="h-8 text-xs mt-1 bg-white"
                disabled={isLocked}
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-gray-500">Range Step</Label>
              <Input
                type="number"
                value={field.rangeStep !== undefined ? field.rangeStep : 1}
                onChange={(e) => onChange({ rangeStep: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 1"
                className="h-8 text-xs mt-1 bg-white"
                disabled={isLocked}
              />
            </div>
          </div>
          {renderRangePreview()}
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2 py-1 select-none">
          <input
            type="checkbox"
            id={`chk-def-${field.id || field.fieldName}`}
            checked={field.defaultValue === 'true' || field.defaultValue === true}
            onChange={(e) => onChange({ defaultValue: e.target.checked ? 'true' : 'false' })}
            disabled={isLocked}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
          />
          <Label
            htmlFor={`chk-def-${field.id || field.fieldName}`}
            className="text-xs text-gray-600 cursor-pointer"
          >
            Default Checked
          </Label>
        </div>
      );

    case 'multiselect':
      return (
        <div className="space-y-3">
          <OptionRowEditor
            options={field.options}
            onChange={(opts) => onChange({ options: opts })}
            isLocked={isLocked}
          />
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Max Selections</Label>
            <Input
              type="number"
              value={field.maxSelections !== undefined ? field.maxSelections : ''}
              onChange={(e) => onChange({ maxSelections: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 3 (leave empty for unlimited)"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          {field.maxSelections !== undefined &&
            field.maxSelections > (Array.isArray(field.options) ? field.options.length : 0) && (
              <p className="text-[10px] text-red-500 font-semibold mt-1">
                Warning: Max selections ({field.maxSelections}) cannot exceed options count (
                {Array.isArray(field.options) ? field.options.length : 0}).
              </p>
            )}
        </div>
      );

    case 'date':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Minimum Date</Label>
            <Input
              type="date"
              value={field.minDate || ''}
              onChange={(e) => onChange({ minDate: e.target.value || undefined })}
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Maximum Date</Label>
            <Input
              type="date"
              value={field.maxDate || ''}
              onChange={(e) => onChange({ maxDate: e.target.value || undefined })}
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
        </div>
      );

    case 'rating':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Stars (Max Rating 1-10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={field.maxRating !== undefined ? field.maxRating : 5}
              onChange={(e) => onChange({ maxRating: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 5"
              className="h-8 text-xs mt-1 bg-white"
              disabled={isLocked}
            />
          </div>
          <div className="flex items-center space-x-2 mt-5 select-none">
            <input
              type="checkbox"
              id={`chk-half-${field.id || field.fieldName}`}
              checked={Boolean(field.allowHalf)}
              onChange={(e) => onChange({ allowHalf: e.target.checked })}
              disabled={isLocked}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
            <Label
              htmlFor={`chk-half-${field.id || field.fieldName}`}
              className="text-xs text-gray-600 cursor-pointer"
            >
              Allow Half Stars
            </Label>
          </div>
        </div>
      );

    default:
      return null;
  }
}
