// Shared conditional-visibility engine for nested / conditional questions.
//
// Single source of truth used by every annotation surface so behavior is
// identical (annotation panel + workbenches). Supports the 5 operators defined
// on VisibilityRule and adds CASCADING evaluation: a conditional sub-question is
// only visible when its own rule matches AND the question it depends on is
// itself visible. Cycles are guarded against.

import type { VisibilityRule } from '@/types/feature1';

export type VisibilityAnswers = Record<string, unknown>;

/** Minimal shape a field needs to participate in visibility evaluation. */
export interface VisibilityField {
  fieldName: string;
  visibilityRule?: VisibilityRule | null;
}

/**
 * Evaluate a single rule against the current answers (no cascading).
 * Comparison is case-insensitive and string-based, matching the original
 * inline implementation in new-column-data-panel.tsx.
 */
export function ruleMatches(
  rule: VisibilityRule | null | undefined,
  answers: VisibilityAnswers,
): boolean {
  if (!rule?.dependsOn) return true;
  const dep = String(answers[rule.dependsOn] ?? '').toLowerCase();
  const target = String(rule.value ?? '').toLowerCase();
  switch (rule.operator) {
    case 'equals':     return dep === target;
    case 'not_equals': return dep !== target;
    case 'contains':   return dep.includes(target);
    case 'empty':      return dep === '';
    case 'not_empty':  return dep !== '';
    default:           return true;
  }
}

/** Index a list of fields by fieldName for O(1) dependency lookups. */
export function indexByName<T extends VisibilityField>(fields: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const f of fields) {
    if (f.fieldName) map.set(f.fieldName, f);
  }
  return map;
}

/**
 * Cascading visibility. A field is visible iff:
 *   1. it has no rule (always visible), OR
 *   2. its own rule matches AND the field it depends on is itself visible.
 *
 * A dangling dependency (trigger field not found) falls back to the field's own
 * rule. Cycles are short-circuited to `true` to avoid infinite recursion.
 */
export function isFieldVisible<T extends VisibilityField>(
  field: T,
  fieldsByName: Map<string, T>,
  answers: VisibilityAnswers,
  seen: Set<string> = new Set(),
): boolean {
  const rule = field.visibilityRule;
  if (!rule?.dependsOn) return true;
  if (!ruleMatches(rule, answers)) return false;

  // Cascade up the dependency chain so hidden parents hide their descendants.
  if (seen.has(field.fieldName)) return true; // cycle guard
  const parent = fieldsByName.get(rule.dependsOn);
  if (!parent) return true; // dangling dependency — own rule is authoritative
  const nextSeen = new Set(seen);
  nextSeen.add(field.fieldName);
  return isFieldVisible(parent, fieldsByName, answers, nextSeen);
}

/** Build a { fieldName: isVisible } map for an entire field list. */
export function buildVisibilityMap<T extends VisibilityField>(
  fields: T[],
  answers: VisibilityAnswers,
): Record<string, boolean> {
  const byName = indexByName(fields);
  const out: Record<string, boolean> = {};
  for (const f of fields) out[f.fieldName] = isFieldVisible(f, byName, answers);
  return out;
}

/** True when a field is a conditional sub-question (has a dependency). */
export function isConditionalField(field: VisibilityField): boolean {
  return !!field.visibilityRule?.dependsOn;
}
