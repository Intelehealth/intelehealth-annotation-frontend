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

export function missingRequiredAnswers(
  fields: AnnotationField[],
  answers: Record<string, unknown>,
  rowData: Record<string, unknown> = {},
): MissingAnswer[] {
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
