export type PreviewKind =
  | 'csv'
  | 'xls'
  | 'xlsx'
  | 'pdf'
  | 'image'
  | 'svg'
  | 'unknown';

export const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.webp',
];

/**
 * Single source of truth for document preview kind detection.
 * Uses file extension AND MIME type so an unreliable/missing MIME value
 * (e.g. `text/plain` for a `.csv`, or `application/octet-stream`) never
 * misroutes a real uploaded file.
 *
 * Detection order (strongest signal first, deterministic):
 * CSV → XLSX → XLS → PDF → SVG → IMAGE → unknown
 * The distinctive spreadsheet extensions win over ambiguous MIME values such as
 * `application/vnd.ms-excel`, which is sometimes sent for `.xlsx` files too.
 */
export function previewKindFor(
  mimeType: string | undefined,
  fileName: string,
): PreviewKind {
  const m = (mimeType || '').toLowerCase();
  const f = (fileName || '').toLowerCase();
  const dot = f.lastIndexOf('.');
  const ext = dot >= 0 ? f.slice(dot) : '';

  if (m.includes('csv') || ext === '.csv') return 'csv';

  if (
    ext === '.xlsx' ||
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'xlsx';
  }

  if (ext === '.xls' || m === 'application/vnd.ms-excel') return 'xls';

  if (m === 'application/pdf' || ext === '.pdf') return 'pdf';

  if (m === 'image/svg+xml' || ext === '.svg') return 'svg';

  if (m.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image';

  return 'unknown';
}