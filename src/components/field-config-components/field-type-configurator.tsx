'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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
              disabled={false}
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
              disabled={false}
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
              disabled={false}
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
              disabled={false}
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
              disabled={false}
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
              disabled={false}
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
              disabled={false}
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
              disabled={false}
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
          {Array.isArray(field.options) && field.options.length > 0 && (
            <div>
              <Label className="text-[10px] font-bold text-gray-500">Default Selected</Label>
              <select
                value={field.defaultValue || ''}
                onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
                className="w-full h-8 px-2 py-1 mt-1 border border-gray-300 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 animate-fade-in"
                disabled={false}
              >
                <option value="">-- None --</option>
                {field.options.map((opt: string, idx: number) => {
                  const colonIdx = opt.indexOf(':');
                  const label = colonIdx === -1 ? opt : opt.slice(0, colonIdx);
                  return (
                    <option key={`${opt}-${idx}`} value={opt}>
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
                disabled={false}
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
                disabled={false}
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
                disabled={false}
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
            disabled={false}
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
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Max Selections</Label>
            <Input
              type="number"
              value={field.maxSelections !== undefined ? field.maxSelections : ''}
              onChange={(e) => onChange({ maxSelections: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 3 (leave empty for unlimited)"
              className="h-8 text-xs mt-1 bg-white"
              disabled={false}
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
              disabled={false}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-500">Maximum Date</Label>
            <Input
              type="date"
              value={field.maxDate || ''}
              onChange={(e) => onChange({ maxDate: e.target.value || undefined })}
              className="h-8 text-xs mt-1 bg-white"
              disabled={false}
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
              disabled={false}
            />
          </div>
          <div className="flex items-center space-x-2 mt-5 select-none">
            <input
              type="checkbox"
              id={`chk-half-${field.id || field.fieldName}`}
              checked={Boolean(field.allowHalf)}
              onChange={(e) => onChange({ allowHalf: e.target.checked })}
              disabled={false}
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
