/**
 * Visit note text (already one language, plain lines from the API) as labelled
 * rows for the visit page (wave 2, V-layout): "►Skin disorder:" starts a group,
 * "• Site - Hands." is a row, Marathi "● label" lines pair with the "•value"
 * line after them. Lines that do not split stay as unlabelled rows.
 */
export interface NoteRow { label: string; value: string }
export interface NoteGroup { title: string; rows: NoteRow[] }

// Leading bullets, trailing full stops and dangling " -" fragments go; "Na" values are shown as a dash by the page.
const tidy = (s: string) => s.replace(/^[•●\s]+/, '').replace(/(\s*-)+\s*$/, '').replace(/[.\s]+$/, '').trim();

export function noteSections(text: string): NoteGroup[] {
  const groups: NoteGroup[] = [];
  let cur: NoteGroup | null = null;
  let pending: string | null = null;
  const push = (row: NoteRow) => {
    if (!cur) { cur = { title: '', rows: [] }; groups.push(cur); }
    cur.rows.push(row);
  };
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('►')) {
      cur = { title: line.replace(/^►\s*/, '').split(':')[0].trim(), rows: [] };
      groups.push(cur);
      pending = null;
      // "►Fever::● Since" carries its first label on the same line.
      const after = line.split('::')[1];
      if (after) pending = tidy(after) || null;
      continue;
    }
    if (line.startsWith('●')) { if (pending) push({ label: pending, value: '' }); pending = tidy(line) || null; continue; }
    const body = tidy(line);
    if (pending) { push({ label: pending, value: body }); pending = null; continue; }
    const dash = body.indexOf(' - ');
    const colon = body.indexOf(': ');
    if (dash > 0 && dash <= 60) push({ label: body.slice(0, dash).trim(), value: tidy(body.slice(dash + 3)) });
    else if (colon > 0 && colon <= 40) push({ label: body.slice(0, colon).trim(), value: tidy(body.slice(colon + 2)) });
    else push({ label: '', value: body });
  }
  if (pending) push({ label: pending, value: '' });
  return groups.filter((g) => g.rows.length || g.title);
}
