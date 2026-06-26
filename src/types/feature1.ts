// Feature 1 — Consensus Annotation Types for Frontend
// Mirrors the definitions from the backend schema but without any NestJS/Mongoose dependencies.

// -------------------- Constants --------------------
export const CLONE_MIN_ANNOTATORS = 1;
export const CLONE_MAX_ANNOTATORS = 5;

// -------------------- Task Status Types --------------------
export type TaskStatus = 'not_started' | 'pending' | 'in_progress' | 'completed';

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'not_started': return 'Not Started';
    case 'pending':     return 'Not Started';
    case 'in_progress': return 'In Progress';
    case 'completed':   return 'Completed';
    default: return 'Unknown';
  }
}

/**
 * Compute the display status purely from real annotation progress numbers.
 *
 * Rules:
 *   completedRows === 0                             → 'not_started'
 *   completedRows > 0 AND completedRows < totalRows → 'in_progress'
 *   completedRows === totalRows (and totalRows > 0)  → 'completed'
 *
 * Falls back to the stored taskStatus when progress data is unavailable.
 */
export function computeTaskStatus(
  progress: { totalRows: number; completedRows: number } | null | undefined,
  fallbackStatus?: string,
): TaskStatus {
  if (progress && progress.totalRows > 0) {
    if (progress.completedRows >= progress.totalRows) return 'completed';
    if (progress.completedRows > 0) return 'in_progress';
    return 'not_started';
  }
  // No progress data yet — treat any stored status as not_started
  if (fallbackStatus === 'completed') return 'completed';
  if (fallbackStatus === 'in_progress') return 'in_progress';
  return 'not_started';
}

// -------------------- Clone & Assign Types --------------------
export interface CloneAssignRequest {
  annotatorUserIds: string[];
}

export interface CloneAssignResponse {
  message: string;
  tasksCreated: number;
  cloneDatasets: Array<{
    _id: string;
    name: string;
    cloneParentId: string;
    isClone: boolean;
    cloneIndex: number;
    assignedAnnotatorId: string;
    createdAt: string;
  }>;
}

export interface AnnotationTask {
  _id: string;  // This is now the clone Dataset _id
  name: string; // Clone name e.g. 'Project A - Clone 1 (Ananya Hegde)'
  parentName?: string; // Original dataset name
  cloneParentId: string;
  isClone: boolean;
  cloneIndex: number;
  assignedAnnotatorId: string;
  datasetType: string;
  taskStatus: 'pending' | 'in_progress' | 'completed';
  taskId?: string;
  progress?: {
    totalRows: number;
    completedRows: number;
    percentage: number;
  };
  dataset?: { // For backward compat
    _id: string;
    name: string;
    description: string;
    datasetType: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CloneGroup {
  original: {
    _id: string;
    name: string;
    datasetType: string;
    createdAt: string;
  };
  clones: AnnotationTask[];
  totalClones: number;
}

// -------------------- Utility Functions --------------------
export function isOddCount(count: number): boolean {
  return count % 2 !== 0;
}

// -------------------- Types --------------------
export interface TaskAnnotation {
  annotationTaskId: string; // ObjectId as string
  annotatorUserId: string; // ObjectId as string
  annotations: Record<string, any>;
}

export interface FieldReview {
  fieldName: string;
  isAgreement: boolean;
  finalDecision?: string;
}

export interface ConsensusReview {
  _id: string;
  datasetId: string;
  rowIndex: number;
  taskAnnotations: TaskAnnotation[];
  isAgreement: boolean;
  fieldReviews: FieldReview[];
  finalDecision?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveConsensusRequest {
  fieldName: string;
  finalDecision: string;
  resolvedBy: string; // userId of the admin resolving
}

/**
 * Subset of field configuration properties forwarded to the consensus UI
 * so FieldRow can render type-aware controls (no freeform on select, etc.).
 */
export interface FieldMetaForConsensus {
  columnType?: string;       // 'select' | 'radio' | 'rating' | 'date' | 'number' | 'checkbox' | 'multiselect' | 'selectrange' | 'textarea' | 'text'
  options?: string[];        // valid values for select / radio / multiselect
  maxRating?: number;
  allowHalf?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minDate?: string;
  maxDate?: string;
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  isRequired?: boolean;
}

export interface EnrichedTaskAnnotation extends TaskAnnotation {
  label: string; // e.g., "Annotator 1"
}

export interface EnrichedFieldReview extends FieldReview {
  majorityValue: string | null;
  isResolved: boolean;
  uniqueValues: string[];
  fieldMeta?: FieldMetaForConsensus; // populated when annotation config is available
}

export interface EnrichedConsensusReview extends Omit<ConsensusReview, 'taskAnnotations'> {
  taskAnnotations: EnrichedTaskAnnotation[];
  fieldReviews: EnrichedFieldReview[];
  isResolved: boolean; // row-level resolution status
}

export interface ConsensusStats {
  total: number;
  agreed: number;
  disagreed: number;
  resolved: number;
  pending: number;
}

// -------------------- Helper Functions --------------------
/**
 * Returns the majority value among the given array.
 * Returns null if no single value appears in strictly more than 50% of slots,
 * including the case of a three-way tie (each value appears once).
 */
export function getMajorityValue(values: string[], totalCount?: number): string | null {
  if (values.length === 0) return null;
  const freq: Record<string, number> = {};
  for (const v of values) freq[v] = (freq[v] || 0) + 1;
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const total = totalCount ?? values.length;
  // Strict majority: strictly more than half of all votes
  return sorted[0][1] > total / 2 ? sorted[0][0] : null;
}

/**
 * Enriches a raw ConsensusReview with computed UI properties.
 * @param review     Raw review from the API
 * @param expandedFields  Optional expanded annotation fields from the dataset config.
 *                   When provided, each EnrichedFieldReview gets a `fieldMeta` object
 *                   containing the field's type and validation constraints.
 */
export function enrichConsensusReview(
  review: ConsensusReview,
  expandedFields?: Array<{ fieldName: string; [key: string]: any }>,
): EnrichedConsensusReview {
  const enrichedTaskAnnotations: EnrichedTaskAnnotation[] = review.taskAnnotations.map((ta, i) => ({
    ...ta,
    label: `Annotator ${i + 1}`,
  }));

  const fieldMetaMap = new Map<string, FieldMetaForConsensus>();
  if (expandedFields) {
    for (const f of expandedFields) {
      fieldMetaMap.set(f.fieldName, {
        columnType: f.columnType || f.fieldType,
        options: f.options,
        maxRating: f.maxRating,
        allowHalf: f.allowHalf,
        min: f.min,
        max: f.max,
        step: f.step,
        minDate: f.minDate,
        maxDate: f.maxDate,
        rangeStart: f.rangeStart,
        rangeEnd: f.rangeEnd,
        rangeStep: f.rangeStep,
        isRequired: f.isRequired,
      });
    }
  }

  const fieldReviews = (review.fieldReviews || []).map((fr) => {
    const values = enrichedTaskAnnotations.map((a) => {
      const val = a.annotations?.[fr.fieldName];
      return val === undefined || val === null ? '-' : String(val).trim() || '-';
    });
    const isResolved = fr.isAgreement || (fr.finalDecision !== undefined && fr.finalDecision !== null && fr.finalDecision !== '');
    
    // Filter out placeholder '-' when computing majority
    const validValuesForMajority = values.filter(v => v !== '-');

    return {
      ...fr,
      majorityValue: getMajorityValue(validValuesForMajority, values.length),
      isResolved,
      uniqueValues: [...new Set(values)],
      fieldMeta: fieldMetaMap.get(fr.fieldName),
    };
  });

  const isResolved = fieldReviews.every(fr => fr.isResolved);

  return {
    ...review,
    taskAnnotations: enrichedTaskAnnotations,
    fieldReviews,
    isResolved,
  };
}

export function computeConsensusStats(reviews: EnrichedConsensusReview[]): ConsensusStats {
  const disagreed = reviews.filter((r) => !r.isAgreement);
  return {
    total: reviews.length,
    agreed: reviews.filter((r) => r.isAgreement).length,
    disagreed: disagreed.length,
    resolved: disagreed.filter((r) => r.isResolved).length,
    pending: disagreed.filter((r) => !r.isResolved).length,
  };
}

// -------------------- Feature 2 Repeatable Groups Types --------------------
export interface VisibilityRule {
  dependsOn: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'empty' | 'not_empty';
  value: string;
}

export interface FieldGroupChildField {
  fieldName: string;
  fieldType: 'text' | 'number' | 'select' | 'selectrange' | 'textarea' | 'rating' | 'multiselect' | 'checkbox' | 'radio' | 'date';
  isRequired: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  maxSelections?: number;
  minDate?: string;
  maxDate?: string;
  maxRating?: number;
  allowHalf?: boolean;
  rows?: number;
  repeatCount?: number;

  // NEW Metadata properties
  id?: string;
  questionTitle?: string;
  questionDescription?: string;
  helpText?: string;
  section?: string;
  visibilityRule?: VisibilityRule;
}

export interface FieldGroup {
  groupId: string;
  groupName: string;
  repeatCount: number;
  fields: FieldGroupChildField[];

  // NEW group metadata properties
  groupTitle?: string;
  groupDescription?: string;
  icon?: string;
  defaultExpanded?: boolean;
}

