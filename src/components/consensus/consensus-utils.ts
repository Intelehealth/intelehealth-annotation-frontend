// Shared helpers for the consensus page (list view) and the row review workbench.

export const STATUS_BADGE: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  NOT_STARTED: { dot: 'bg-gray-400', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Not Started' },
  PARTIAL: { dot: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: 'Partial' },
  AGREED: { dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Agreed' },
  CONFLICT: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Conflict' },
  TIE: { dot: 'bg-fuchsia-500', bg: 'bg-fuchsia-50 border-fuchsia-200', text: 'text-fuchsia-700', label: 'Tie' },
  PENDING_UPDATE: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending Update' },
  ADMIN_CONFIRMED: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Confirmed' },
  OVERRIDDEN: { dot: 'bg-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'Override' },
};

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Pending';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(', ') : value;
    } catch {
      return value;
    }
  }
  return String(value);
}

// ─── Consensus field hierarchy ──────────────────────────────────────────────
// Each grid field carries parentPath / nestedLevel / branchStatus from the
// backend aggregation. The old UI ignored all of it and dumped one bare "%"
// per field, so nested-group children, repeat instances and dead conditional
// branches all showed up as unlabeled "0%"s. These helpers rebuild the
// parent → child tree and drop inactive (losing) branches from the rollups.

export type FieldNode = any & { children: FieldNode[]; inactive: boolean };

// Build the parent→child tree via `parentPath`, then propagate branch
// inactivity downward so a losing branch takes its whole subtree with it.
export function buildFieldTree(fields: any[]): FieldNode[] {
  const byName = new Map<string, FieldNode>();
  (fields || []).forEach((f) =>
    byName.set(f.fieldName, { ...f, children: [], inactive: f?.branchStatus === 'LOSING_BRANCH' }),
  );
  const roots: FieldNode[] = [];
  byName.forEach((node) => {
    const parent = node.parentPath ? byName.get(node.parentPath) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const mark = (node: FieldNode, ancestorInactive: boolean) => {
    node.inactive = node.inactive || ancestorInactive;
    node.children.forEach((child: FieldNode) => mark(child, node.inactive));
  };
  roots.forEach((root) => mark(root, false));
  return roots;
}

// Depth-first walk yielding active nodes (with depth) and the inactive ones
// separately, so callers can indent live questions and tuck dead branches away.
export function walkFieldTree(roots: FieldNode[]): { active: { node: FieldNode; depth: number }[]; inactive: FieldNode[] } {
  const active: { node: FieldNode; depth: number }[] = [];
  const inactive: FieldNode[] = [];
  const walk = (node: FieldNode, depth: number) => {
    if (node.inactive) {
      inactive.push(node);
      return;
    }
    active.push({ node, depth });
    node.children.forEach((child: FieldNode) => walk(child, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));
  return { active, inactive };
}

export function getClinicalNotes(rawData: any): string {
  if (!rawData || typeof rawData !== 'object') return '';
  const key = Object.keys(rawData).find((k) => /^clinical[_ ]?notes$/i.test(k));
  const value = key ? rawData[key] : '';
  return typeof value === 'string' ? value.replace(/\*\*/g, '').trim() : '';
}
