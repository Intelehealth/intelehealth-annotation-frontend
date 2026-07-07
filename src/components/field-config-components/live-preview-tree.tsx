'use client';

import { cn } from '@/lib/utils';
import type { AnnotationField } from '@/types/feature1';

interface LivePreviewTreeProps {
  fields: AnnotationField[];
  depth?: number;
}

export function LivePreviewTree({ fields, depth = 0 }: LivePreviewTreeProps) {
  if (!fields || fields.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic p-4 text-center">
        No fields configured yet. Add a field to see the preview.
      </div>
    );
  }

  return (
    <div className="font-mono text-xs leading-relaxed">
      {fields.map((field, idx) => (
        <TreeNode key={field.fieldName || idx} field={field} depth={depth} isLast={idx === fields.length - 1} />
      ))}
    </div>
  );
}

function TreeNode({ field, depth, isLast }: { field: AnnotationField; depth: number; isLast: boolean }) {
  const type = field.columnType || field.fieldType;
  const isBranchable = ['radio', 'multiselect', 'select', 'rating', 'checkbox'].includes(type);
  const typeLabel = getTypeLabel(field);

  // Extract options structurally
  const options: { value: string; childFields?: AnnotationField[] }[] = [];
  if (isBranchable) {
    if (field.branching?.enabled && field.branching.options && field.branching.options.length > 0) {
      field.branching.options.forEach(opt => {
        options.push({
          value: opt.value,
          childFields: opt.childFields
        });
      });
    } else if (type === 'rating') {
      const maxRating = field.maxRating || 5;
      for (let i = 1; i <= maxRating; i++) {
        options.push({
          value: String(i),
          childFields: []
        });
      }
    } else if (type === 'checkbox') {
      options.push({ value: 'true', childFields: [] });
      options.push({ value: 'false', childFields: [] });
    } else {
      const rawOptions = field.options || [];
      rawOptions.forEach(optStr => {
        const colonIdx = optStr.indexOf(':');
        const baseVal = colonIdx === -1 ? optStr : optStr.slice(0, colonIdx);
        options.push({
          value: baseVal,
          childFields: []
        });
      });
    }
  }

  const hasOptions = options.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1.5 py-0.5">
        {/* Tree line */}
        {depth > 0 && (
          <span className="text-gray-300 select-none shrink-0">
            {isLast ? '└── ' : '├── '}
          </span>
        )}
        {/* Field name */}
        <span className={cn('font-semibold', depth === 0 ? 'text-gray-900' : 'text-gray-700')}>
          {field.fieldName || <span className="italic text-gray-300">unnamed</span>}
        </span>
        {/* Type badge */}
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {typeLabel} (type: {field.columnType || field.fieldType || 'none'}, branching_options: {field.branching?.options?.length || 0})
        </span>
        {/* Description icon */}
        {field.branching?.options?.some(o => o.requireDescription) && (
          <span className="text-[10px]" title="Has inline description">📝</span>
        )}
      </div>

      {/* Branching children */}
      {hasOptions && (
        <div className={cn(depth > 0 && 'ml-4')}>
          {options.map((opt, i) => (
            <div key={opt.value}>
              <div className="flex items-center gap-1.5 py-0.5 text-gray-500">
                <span className="text-gray-300 select-none shrink-0">
                  {i === options.length - 1 && !opt.childFields?.length ? '└── ' : '├── '}
                </span>
                <span>{type === 'rating' ? `★${opt.value}` : opt.value}</span>
              </div>

              {/* Child fields of this option */}
              {opt.childFields && opt.childFields.length > 0 && (
                <div className="ml-4">
                  {opt.childFields.map((child, ci) => (
                    <TreeNode
                      key={child.fieldName || ci}
                      field={child}
                      depth={depth + 2}
                      isLast={ci === opt.childFields!.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getTypeLabel(field: AnnotationField): string {
  const type = field.columnType || field.fieldType;
  const map: Record<string, string> = {
    text: 'Text',
    textarea: 'Long Text',
    number: 'Number',
    select: 'Select',
    radio: 'Radio',
    multiselect: 'Multi',
    checkbox: 'Checkbox',
    selectrange: 'Range',
    rating: `Rating 1-${field.maxRating || 5}`,
    date: 'Date',
    image: 'Image',
    audio: 'Audio',
    video: 'Video',
    'text-metadata': 'Metadata',
  };
  return map[type] || type;
}