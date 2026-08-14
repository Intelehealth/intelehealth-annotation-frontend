import { describe, expect, it } from 'vitest';
import { documentTypeFor } from './document-view-context';

describe('documentTypeFor (Phase 4 real source-type detection)', () => {
  it('maps by real file extension', () => {
    expect(documentTypeFor({ id: '1', fileName: 'invoice.pdf' } as any)).toBe('pdf');
    expect(documentTypeFor({ id: '1', fileName: 'logo.svg' } as any)).toBe('svg');
    expect(documentTypeFor({ id: '1', fileName: 'data.csv' } as any)).toBe('csv');
    expect(documentTypeFor({ id: '1', fileName: 'old.xls' } as any)).toBe('xls');
    expect(documentTypeFor({ id: '1', fileName: 'book.xlsx' } as any)).toBe('xlsx');
    expect(documentTypeFor({ id: '1', fileName: 'bundle.zip' } as any)).toBe('zip');
    expect(documentTypeFor({ id: '1', fileName: 'shot.png' } as any)).toBe('image');
    expect(documentTypeFor({ id: '1', fileName: 'shot.jpg' } as any)).toBe('image');
    expect(documentTypeFor({ id: '1', fileName: 'shot.webp' } as any)).toBe('image');
  });

  it('falls back to mime for images and other types', () => {
    expect(
      documentTypeFor({ id: '1', fileName: 'noext', mimeType: 'image/png' } as any),
    ).toBe('image');
    expect(
      documentTypeFor({ id: '1', fileName: 'notes.txt' } as any),
    ).toBe('other');
    expect(documentTypeFor(null)).toBe('other');
  });
});