import type { AnnotationField, GroupChildField } from '@/types/feature1';
import { splitImageValue } from '@/lib/image-source';
import { captionInputs } from '@/components/new-column-components/caption-input';

// Which required questions on a row have no answer yet. Mirrors the server's
// check on "mark complete" (expandQuestions + assertRequiredAnswered), so the
// annotator is told before the request is refused.
//
// A group input is required on its own; a repeatable one needs at least one
// non-blank entry. A required caption must be filled for every image in the
// row. A plain field just needs a value.
//
// An option flagged `completesRow` finishes the case on its own: once it is
// chosen, nothing else on the row is required (server: rowCompletedBy).

export type MissingAnswer = { key: string; label: string };

const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

function list(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x ?? ''));
  } catch {
    // a plain value written before the input became repeatable
  }
  return [raw];
}

/** Option label without its ":description" suffix, trimmed. */
export function cleanOptionValue(val: unknown): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  const colonIdx = s.indexOf(':');
  return colonIdx === -1 ? s : s.slice(0, colonIdx).trim();
}

/** Labels chosen in a stored answer: a JSON array, a comma list, or one value. */
export function selectedLabels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(cleanOptionValue).filter(Boolean);
  if (blank(raw)) return [];
  const s = String(raw);
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map(cleanOptionValue).filter(Boolean);
  } catch {
    // not JSON
  }
  const one = cleanOptionValue(s);
  if (one.includes(',')) return s.split(',').map(cleanOptionValue).filter(Boolean);
  return one ? [one] : [];
}

/**
 * The top-level question whose chosen option completes the row, or null.
 * Only top-level fields are considered; nested child options never complete a row.
 */
export function rowCompletedBy(
  fields: AnnotationField[],
  answers: Record<string, unknown>,
): { field: AnnotationField; option: string } | null {
  for (const f of fields) {
    if (!f.isAnnotationField || !f.branching?.enabled) continue;
    const completing = (f.branching.options || []).filter((o) => o.completesRow);
    if (completing.length === 0) continue;
    const chosen = selectedLabels(answers[f.fieldName]).map((v) => v.toLowerCase());
    if (chosen.length === 0) continue;
    const hit = completing.find((o) => chosen.includes(cleanOptionValue(o.value).toLowerCase()));
    if (hit) return { field: f, option: cleanOptionValue(hit.value) };
  }
  return null;
}

export function missingRequiredAnswers(
  fields: AnnotationField[],
  answers: Record<string, unknown>,
  rowData: Record<string, unknown> = {},
): MissingAnswer[] {
  if (rowCompletedBy(fields, answers)) return [];

  const out: MissingAnswer[] = [];
  const title = (f: AnnotationField) => f.questionTitle || f.fieldName;

  for (const f of fields) {
    if (!f.isAnnotationField) continue;

    if (f.columnType === 'group' && f.groupChildren?.length) {
      for (const c of f.groupChildren as GroupChildField[]) {
        if (!c.isRequired) continue;
        const key = `${f.fieldName}.${c.fieldName}`;
        const ok = c.repeatable ? list(answers[key]).some((v) => !blank(v)) : !blank(answers[key]);
        if (!ok) out.push({ key, label: `${title(f)} · ${c.fieldName}` });
      }
      continue;
    }

    if (f.fieldType === 'image') {
      const caps = captionInputs(f).filter((c) => c.isRequired);
      if (caps.length === 0) continue;
      const images = splitImageValue(rowData[f.csvColumnName] ?? rowData[f.fieldName], {
        imageFormat: f.imageFormat, imageMultiple: f.imageMultiple, imageDelimiter: f.imageDelimiter,
      });
      for (const c of caps) {
        const key = `${f.fieldName}.captions.${c.fieldName}`;
        const got = list(answers[key]);
        const filled = images.length > 0 && images.every((_, i) => !blank(got[i]));
        if (!filled) out.push({ key, label: `${title(f)} · ${c.fieldName} (every image)` });
      }
      continue;
    }

    if (f.isRequired && blank(answers[f.fieldName])) out.push({ key: f.fieldName, label: title(f) });
  }
  return out;
}
