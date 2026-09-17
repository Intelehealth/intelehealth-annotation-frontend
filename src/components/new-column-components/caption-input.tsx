'use client';

import type { AnnotationField, GroupChildField } from '@/types/feature1';

// The inputs an annotator fills for each image. They have the same shape as
// the inputs of a group field, so the group editor and renderer are reused.
// A field configured before captions became a list still has the single
// caption* settings; those read as one input.
export function captionInputs(field: Pick<AnnotationField,
  'captionFields' | 'captionEnabled' | 'captionLabel' | 'captionType' | 'captionOptions' | 'captionRequired'>): GroupChildField[] {
  if (field.captionFields?.length) return field.captionFields;
  if (!field.captionEnabled) return [];
  return [{
    id: 'caption',
    fieldName: field.captionLabel || 'Caption',
    columnType: (field.captionType as GroupChildField['columnType']) || 'text',
    options: field.captionOptions || [],
    isRequired: !!field.captionRequired,
  }];
}
