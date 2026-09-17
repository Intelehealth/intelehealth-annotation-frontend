export interface ParseCsvResult {
  columns: string[];
  rows: string[][];
}

const BOM_RE = /^\uFEFF/;

/**
 * Deterministic RFC 4180-style CSV parser built as a character state machine,
 * so it handles quoted cells containing commas, quotes (`""`) and newlines.
 *
 * Rules (kept explicit and deterministic):
 * - A field that starts with `"` is a quoted field; a `""` inside it is one literal quote.
 * - `,` terminates a field, `\n` or `\r\n` (or a lone `\r`) terminates a record.
 * - The first record is the header (columns); subsequent records are data rows.
 * - Blank lines (a record with a single empty field and no `,`) are skipped.
 * - Rows with differing field counts are preserved exactly as parsed — nothing is
 *   padded or invented. Missing trailing fields simply stay absent.
 * - A trailing newline does not produce an extra record.
 * - An empty/whitespace-only input yields `{ columns: [], rows: [] }`.
 */
export function parseCsv(input: string): ParseCsvResult {
  const text = typeof input === 'string' ? input : '';
  const src = text.replace(BOM_RE, '');

  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let seenNonNewline = false;

  const endField = () => {
    record.push(field);
    field = '';
  };

  const endRecord = () => {
    // Skip blank lines: zero fields, or a single empty field with no comma on the line.
    const isBlank =
      record.length === 0 ||
      (record.length === 1 && record[0] === '' && !seenNonNewline);
    if (!isBlank) records.push(record);
    record = [];
    field = '';
    seenNonNewline = false;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch !== '\r' && ch !== '\n') seenNonNewline = true;
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (field === '') {
        inQuotes = true;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === ',') {
      endField();
      continue;
    }

    if (ch === '\n') {
      endField();
      endRecord();
      continue;
    }

    if (ch === '\r') {
      endField();
      if (src[i + 1] === '\n') i++;
      endRecord();
      continue;
    }

    field += ch;
    seenNonNewline = true;
  }

  // Final field/record if any.
  if (field !== '' || record.length > 0) {
    endField();
    endRecord();
  }

  if (records.length === 0) return { columns: [], rows: [] };

  const [header, ...rows] = records;
  return {
    columns: header.map((c) => String(c)),
    rows: rows.map((r) => r.map((c) => String(c))),
  };
}