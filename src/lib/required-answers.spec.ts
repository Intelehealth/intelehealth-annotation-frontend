import { describe, it, expect } from 'vitest';
import type { AnnotationField } from '@/types/feature1';
import { cleanOptionValue, selectedLabels, rowCompletedBy, missingRequiredAnswers } from './required-answers';

const INADEQUATE_RAW = 'Inadequate:The record contains only superficial data that cannot support a diagnosis.';

const completeness: AnnotationField = {
  csvColumnName: '',
  fieldName: 'Completeness',
  fieldType: 'text',
  columnType: 'select',
  isRequired: false,
  isAnnotationField: true,
  options: ['Complete:desc', 'Incomplete:desc', INADEQUATE_RAW],
  branching: {
    enabled: true,
    options: [
      { value: 'Complete', childFields: [] },
      { value: 'Incomplete', childFields: [{ fieldName: 'Further questions', fieldType: 'text', isRequired: true, csvColumnName: '' } as AnnotationField] },
      { value: 'Inadequate', completesRow: true, childFields: [] },
    ],
  },
} as AnnotationField;

const image: AnnotationField = {
  csvColumnName: 'Image',
  fieldName: 'Image',
  fieldType: 'image',
  isRequired: false,
  isAnnotationField: true,
  captionFields: [{ id: 'c1', fieldName: 'Relevancy', columnType: 'select', isRequired: true, options: ['Yes', 'No'] }],
} as AnnotationField;

const remarks: AnnotationField = {
  csvColumnName: '',
  fieldName: 'Remarks',
  fieldType: 'text',
  isRequired: true,
  isAnnotationField: true,
} as AnnotationField;

const fields = [completeness, image, remarks];
const rowData = { Image: 'a.png' };

describe('cleanOptionValue', () => {
  it('strips the description after the first colon and trims', () => {
    expect(cleanOptionValue(' Inadequate : desc: more ')).toBe('Inadequate');
    expect(cleanOptionValue('Yes')).toBe('Yes');
    expect(cleanOptionValue(null)).toBe('');
  });
});

describe('selectedLabels', () => {
  it('reads a scalar, a JSON array and a comma list', () => {
    expect(selectedLabels(INADEQUATE_RAW)).toEqual(['Inadequate']);
    expect(selectedLabels(JSON.stringify(['A:x', 'B:y']))).toEqual(['A', 'B']);
    expect(selectedLabels('A, B')).toEqual(['A', 'B']);
    expect(selectedLabels(['A:x'])).toEqual(['A']);
    expect(selectedLabels('')).toEqual([]);
    expect(selectedLabels(undefined)).toEqual([]);
  });
});

describe('rowCompletedBy', () => {
  it('finds the top-level question whose chosen option completes the row', () => {
    const hit = rowCompletedBy(fields, { Completeness: INADEQUATE_RAW });
    expect(hit?.field.fieldName).toBe('Completeness');
    expect(hit?.option).toBe('Inadequate');
  });
  it('matches case-insensitively on the clean label', () => {
    expect(rowCompletedBy(fields, { Completeness: 'inadequate' })).not.toBeNull();
    expect(rowCompletedBy(fields, { Completeness: '  INADEQUATE : x' })).not.toBeNull();
  });
  it('matches any selected value of a multiselect', () => {
    expect(rowCompletedBy(fields, { Completeness: JSON.stringify(['Complete:desc', INADEQUATE_RAW]) })).not.toBeNull();
  });
  it('returns null for other options, blanks and non-annotation fields', () => {
    expect(rowCompletedBy(fields, { Completeness: 'Incomplete:desc' })).toBeNull();
    expect(rowCompletedBy(fields, {})).toBeNull();
    expect(rowCompletedBy([{ ...completeness, isAnnotationField: false }], { Completeness: INADEQUATE_RAW })).toBeNull();
  });
  it('ignores completesRow on nested child options', () => {
    const nested: AnnotationField = {
      ...completeness,
      branching: {
        enabled: true,
        options: [{
          value: 'Incomplete',
          childFields: [{
            ...completeness,
            fieldName: 'Child',
            branching: { enabled: true, options: [{ value: 'Stop', completesRow: true, childFields: [] }] },
          }],
        }],
      },
    } as AnnotationField;
    expect(rowCompletedBy([nested], { Completeness: 'Incomplete', Child: 'Stop' })).toBeNull();
  });
});

describe('missingRequiredAnswers', () => {
  it('reports unfilled required captions and fields when no completing option is chosen', () => {
    const missing = missingRequiredAnswers(fields, { Completeness: 'Incomplete:desc' }, rowData);
    expect(missing.map((m) => m.key)).toEqual(['Image.captions.Relevancy', 'Remarks']);
  });
  it('reports nothing once a completing option is chosen', () => {
    expect(missingRequiredAnswers(fields, { Completeness: INADEQUATE_RAW }, rowData)).toEqual([]);
  });
  it('still enforces requirements when the completing option is not chosen', () => {
    expect(missingRequiredAnswers(fields, { Completeness: 'Complete:desc' }, rowData)).toHaveLength(2);
  });
});

describe('missingRequiredAnswers — repeatable group (whole set of inputs repeats)', () => {
  const plan: AnnotationField = {
    csvColumnName: '',
    fieldName: 'Treatment Plan 1',
    fieldType: 'text',
    columnType: 'group',
    isRequired: false,
    isAnnotationField: true,
    groupRepeatable: true,
    groupEntryLabel: 'Medication',
    groupChildren: [
      { id: 'a', fieldName: 'Drug', columnType: 'select', isRequired: true, options: ['A', 'B'] },
      { id: 'b', fieldName: 'Dose', columnType: 'select', isRequired: false, options: ['1', '2'] },
    ],
  } as AnnotationField;

  it('is satisfied when any entry has the required input filled', () => {
    expect(missingRequiredAnswers([plan], { 'Treatment Plan 1.Drug': JSON.stringify(['', 'B']) })).toEqual([]);
  });
  it('reports the input when every entry is blank or nothing was entered', () => {
    expect(missingRequiredAnswers([plan], { 'Treatment Plan 1.Drug': JSON.stringify(['', '']) }).map((m) => m.key)).toEqual(['Treatment Plan 1.Drug']);
    expect(missingRequiredAnswers([plan], {}).map((m) => m.key)).toEqual(['Treatment Plan 1.Drug']);
  });
  it('keeps the plain-value rule for a non-repeatable group', () => {
    const plain = { ...plan, groupRepeatable: false } as AnnotationField;
    expect(missingRequiredAnswers([plain], { 'Treatment Plan 1.Drug': 'A' })).toEqual([]);
    expect(missingRequiredAnswers([plain], { 'Treatment Plan 1.Drug': '' })).toHaveLength(1);
  });
});
