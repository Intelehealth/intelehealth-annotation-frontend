import { describe, expect, it } from 'vitest';
import { previewKindFor } from '../preview-kind';

describe('previewKindFor', () => {
  it('detects CSV by mime type', () => {
    expect(previewKindFor('text/csv', 'invoice.csv')).toBe('csv');
    expect(previewKindFor('application/csv', 'invoice.csv')).toBe('csv');
  });

  it('detects CSV by extension even when MIME is unhelpful', () => {
    expect(previewKindFor('text/plain', 'invoice.csv')).toBe('csv');
    expect(previewKindFor('application/octet-stream', 'invoice.csv')).toBe('csv');
    expect(previewKindFor('', 'invoice.csv')).toBe('csv');
  });

  it('detects XLS', () => {
    expect(previewKindFor('application/vnd.ms-excel', 'invoice.xls')).toBe('xls');
    expect(previewKindFor('application/octet-stream', 'invoice.xls')).toBe('xls');
  });

  it('detects XLSX', () => {
    expect(
      previewKindFor(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'invoice.xlsx',
      ),
    ).toBe('xlsx');
    expect(previewKindFor('application/octet-stream', 'invoice.xlsx')).toBe('xlsx');
  });

  it('prefers the spreadsheet extension over the ambiguous vnd.ms-excel mime', () => {
    expect(previewKindFor('application/vnd.ms-excel', 'invoice.xlsx')).toBe('xlsx');
  });

  it('detects PDF', () => {
    expect(previewKindFor('application/pdf', 'invoice.pdf')).toBe('pdf');
    expect(previewKindFor('', 'invoice.pdf')).toBe('pdf');
  });

  it('detects images', () => {
    expect(previewKindFor('image/png', 'invoice.png')).toBe('image');
    expect(previewKindFor('image/jpeg', 'invoice.jpg')).toBe('image');
    expect(previewKindFor('', 'invoice.jpeg')).toBe('image');
    expect(previewKindFor('', 'photo.webp')).toBe('image');
  });

  it('detects SVG', () => {
    expect(previewKindFor('image/svg+xml', 'map.svg')).toBe('svg');
    expect(previewKindFor('', 'map.svg')).toBe('svg');
  });

  it('returns unknown for unsupported types', () => {
    expect(previewKindFor('application/zip', 'bundle.zip')).toBe('unknown');
    expect(previewKindFor('', 'notes.txt')).toBe('unknown');
    expect(previewKindFor(undefined, undefined as unknown as string)).toBe('unknown');
  });
});