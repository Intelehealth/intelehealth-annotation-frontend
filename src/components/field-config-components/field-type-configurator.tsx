'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IMAGE_DELIMITERS, IMAGE_FORMATS } from '@/lib/image-source';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { GroupFieldEditor } from './group-field-editor';
import { captionInputs } from '@/components/new-column-components/caption-input';
import { LensPreview, LENS_RADIUS_RANGE, LENS_ZOOM_RANGE, lensOf } from '@/components/annotation-components/magnifier';

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

    case 'url':
      return (
        <div>
          <Label className="text-[10px] font-bold text-gray-500">Placeholder Text</Label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            placeholder="e.g. https://example.com"
            className="h-8 text-xs mt-1 bg-white"
            disabled={false}
          />
        </div>
      );

    case 'image':
    case 'audio':
    case 'video':
      return <MediaSourceConfig field={field} onChange={onChange} kind={type} />;

    default:
      return null;
  }
}

// How a media column stores its value. Getting this wrong is the usual reason
// images "don't show": the cell holds several URLs, or base64, not one link.
function MediaSourceConfig({
  field,
  onChange,
  kind,
}: {
  field: any;
  onChange: (updates: any) => void;
  kind: string;
}) {
  const format = field.imageFormat ?? 'url';
  const multiple = field.imageMultiple !== false;
  const delimiter = field.imageDelimiter ?? ',';
  const custom = !IMAGE_DELIMITERS.some((d) => d.value === delimiter);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px] font-bold uppercase text-gray-500">What the column holds</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {IMAGE_FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              title={f.hint}
              onClick={() => onChange({ imageFormat: f.value })}
              className={`rounded-md border px-2 py-1 text-xs ${format === f.value ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          {IMAGE_FORMATS.find((f) => f.value === format)?.hint}
        </p>
      </div>

      <div>
        <Label className="text-[10px] font-bold uppercase text-gray-500">How many per row</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ imageMultiple: false })}
            className={`rounded-md border px-2 py-1 text-xs ${!multiple ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => onChange({ imageMultiple: true })}
            className={`rounded-md border px-2 py-1 text-xs ${multiple ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Several
          </button>
        </div>
      </div>

      {multiple && (
        <div>
          <Label className="text-[10px] font-bold uppercase text-gray-500">Separator between them</Label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {IMAGE_DELIMITERS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => onChange({ imageDelimiter: d.value })}
                className={`rounded-md border px-2 py-1 text-xs ${!custom && delimiter === d.value ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {d.label}
              </button>
            ))}
            <Input
              value={custom ? delimiter : ''}
              onChange={(e) => onChange({ imageDelimiter: e.target.value })}
              placeholder="custom"
              aria-label="Custom separator"
              className="h-7 w-20 text-xs"
            />
          </div>
        </div>
      )}

      {format !== 'url' && (
        <div>
          <Label className="text-[10px] font-bold uppercase text-gray-500">Media type</Label>
          <Input
            value={field.imageMimeType || ''}
            onChange={(e) => onChange({ imageMimeType: e.target.value })}
            placeholder={kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/mpeg' : 'video/mp4'}
            className="mt-1 h-8 text-xs bg-white"
          />
          <p className="mt-1 text-[11px] text-gray-500">Only needed when the stored value has no data: prefix.</p>
        </div>
      )}

      {kind === 'image' && (
        <div className="rounded-md border border-gray-200 p-2.5">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={lensOf(field).enabled}
              onChange={(e) => onChange({ lensEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            Magnify under the cursor on the full-size image
          </label>
          {lensOf(field).enabled && (
            <div className="mt-2 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-bold uppercase text-gray-500">Zoom (%)</Label>
                  <Input
                    type="number"
                    min={LENS_ZOOM_RANGE.min * 100}
                    max={LENS_ZOOM_RANGE.max * 100}
                    step={10}
                    value={Math.round(lensOf(field).zoom * 100)}
                    onChange={(e) => onChange({ lensZoom: Number(e.target.value) / 100 })}
                    aria-label="Magnifier zoom percent"
                    className="mt-1 h-8 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase text-gray-500">Circle radius (px)</Label>
                  <Input
                    type="number"
                    min={LENS_RADIUS_RANGE.min}
                    max={LENS_RADIUS_RANGE.max}
                    step={10}
                    value={lensOf(field).radius}
                    onChange={(e) => onChange({ lensRadius: Number(e.target.value) })}
                    aria-label="Magnifier radius"
                    className="mt-1 h-8 text-xs bg-white"
                  />
                </div>
              </div>
              <LensPreview lens={lensOf(field)} />
            </div>
          )}
        </div>
      )}

      {kind === 'image' && (
        <div className="rounded-md border border-gray-200 p-2.5">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={!!field.captionEnabled}
              onChange={(e) => onChange({ captionEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            Annotators caption each image
          </label>

          {field.captionEnabled && (
            <div className="mt-2">
              <p className="mb-2 text-[11px] text-gray-500">
                Each image gets every input below. Mix a text box with a dropdown, add more with the button.
              </p>
              <GroupFieldEditor
                items={captionInputs(field)}
                onChange={(captionFields) => onChange({ captionFields })}
              />
            </div>
          )}
        </div>
      )}

      {format === 'url' && (
        <p className="rounded-md border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-600">
          Images load through the server, so private hosts work. Set the host&apos;s username and password in
          Settings → Image credentials if the images need a login.
        </p>
      )}
    </div>
  );
}
