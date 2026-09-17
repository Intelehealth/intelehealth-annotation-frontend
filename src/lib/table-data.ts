/**
 * Decides whether a parsed table has *no* data at all.
 *
 * A table with only empty cells (`rows = [["", ""]]`) is legitimate CSV data —
 * an empty cell is not proof of an empty table. Only a zero-length columns or
 * rows array means there is nothing to render.
 */
export function isTableEmpty(
  columns: string[],
  rows: string[][],
): boolean {
  if (!Array.isArray(columns) || columns.length === 0) return true;
  if (!Array.isArray(rows) || rows.length === 0) return true;
  return false;
}