import { jsonApi } from '@/lib/api';

// Mirrors backend src/mismatch. NAS and TURN each have a workspace whose
// visits are synced from OpenMRS (ES GraphQL) in the background; a visit is a
// mismatch when the doctor picked none of the AI's top 5 diagnoses (ddx) or
// changed / skipped / added to the AI's medicines (ttx).

export type MismatchSource = 'NAS' | 'TURN';
export type MismatchType = 'none' | 'ddx' | 'ttx' | 'both';
export type ReviewStatus = 'pending' | 'in_progress' | 'done';

export interface SyncState {
  source: MismatchSource;
  configured: boolean;
  running: boolean;
  status?: 'idle' | 'running' | 'error';
  backfilled?: boolean;
  coveredUntil?: string;
  lastSuccessAt?: string;
  lastRun?: {
    trigger: string; startedAt: string; finishedAt?: string; window: string;
    fetched: number; total: number; inserted: number; updated: number; error?: string;
  };
}

export interface MismatchWorkspace {
  _id: string; name: string; description?: string; icon?: string; source: MismatchSource;
  members: number; total: number; mismatches: number; pending: number; sync: SyncState;
}

export interface Highlight {
  kind: 'ddx' | 'ttx';
  type: 'not_in_top5' | 'doctor_added' | 'modified' | 'ignored' | 'added' | 'doctor_flag';
  text: string;
  detail?: string;
}

export interface QueueItem {
  uuid: string; visitId?: number; encounterAt?: string; gender?: string; age?: number; specialty?: string;
  complaint?: string; mismatchType: MismatchType; aiTop1: string | null; bestRank: number | null;
  pickedBy: 'clicked' | 'name' | null; followUpOnly: boolean;
  doctorDx: string[]; highlights: Highlight[];
  ttx: { exact: number; modified: number; ignored: number; added: number } | null;
  review: {
    status: ReviewStatus; claimedBy: string | null; annotatedBy: string | null; annotatedAt?: string;
    ddxVerdict?: string; ttxVerdict?: string; followUp: boolean;
  };
}

export type QueueTab = 'todo' | 'done' | 'all';

export interface QueueQuery {
  tab?: QueueTab; mismatch?: string; ddx?: string; ttx?: string; status?: string;
  from?: string; to?: string; specialty?: string; gender?: string; age?: string;
  dx?: string; med?: string; reviewer?: string; verdict?: string; followUp?: string; images?: string;
  flag?: string; model?: string;
  q?: string; sort?: string; page?: number; limit?: number;
}

export interface QueuePage { total: number; page: number; limit: number; counts: Record<QueueTab, number>; items: QueueItem[] }
export interface Facets { specialties: string[]; models: string[]; rejectReasons: string[]; reviewers: { _id: string; name: string }[] }

export interface AiDiagnosis { diagnosis: string; rank: string | null; likelihood?: string | null; aiAssisted?: string | null; rationale?: unknown }
export interface AiMedication {
  medication: string; confidence?: string | null; dosage?: string | null; frequency?: string | null;
  duration?: string | null; durationUnits?: string | null; instructions?: string | null; aiAssisted?: string | null; rationale?: unknown;
}

export interface RankedDx { diagnosis: string; rank: number; likelihood?: string | null; picked: 'clicked' | 'name' | null }

export interface VisitAnalysis {
  ddxAvailable: boolean; ddxRanked: RankedDx[]; ddxPickedBy: 'clicked' | 'name' | null; followUpOnly: boolean;
  ddxRejectReason: string | null; ttxRejectReason: string | null; ddxSelectedRanks: number[]; ddxBestRank: number | null; top1: boolean; top3: boolean; top5: boolean;
  ddxMismatch: boolean; doctorAddedDx: string[];
  ttxAvailable: boolean; ttxExact: number; ttxModified: number; ttxIgnored: number; ttxAdded: number;
  ttxUsed: boolean; ttxFullyAccepted: boolean; ttxMismatch: boolean; mismatchType: MismatchType; highlights: Highlight[];
  doctorDiagnoses: { code: string; name: string; role: string; status: string }[];
  doctorMedications: { name: string; dose: string; duration: string; unit: string; instructions: string; frequency: string }[];
}

export interface Review {
  status: ReviewStatus;
  claimedBy?: { _id: string; name: string } | null; claimedAt?: string;
  ddxVerdict?: string; ddxReason?: string; correctDiagnosis?: string;
  ttxVerdict?: string; ttxReason?: string; correctTreatment?: string;
  comment?: string; followUp?: boolean;
  annotatedBy?: { _id: string; name: string } | null; annotatedAt?: string;
}

export interface VisitDetail {
  uuid: string; visitId?: number; source: MismatchSource; encounterAt?: string;
  demographics?: { patientId?: number; gender?: string; age?: number };
  attributes?: { specialty?: string; doctorPatientInteraction?: string };
  vitals?: Record<string, number | string | null>;
  visitNote?: Record<string, string | null>;
  images: string[];
  ddx?: { diagnoses: AiDiagnosis[]; conclusion?: string | null; furtherQuestions?: string[]; reason?: string | null } | null;
  ttx?: { medications: AiMedication[]; planRationale?: string | null; reason?: string | null } | null;
  langfuse?: { model?: string; engine?: string; latency?: number; success?: unknown; name?: string } | null;
  notes: { chiefComplaint: string; physicalExamination: string; patientMedicalHistory: string; familyHistory: string };
  analysis: VisitAnalysis;
  mismatchType: MismatchType;
  review: Review;
}

export type ReviewInput = Pick<Review, 'ddxVerdict' | 'ddxReason' | 'correctDiagnosis' | 'ttxVerdict' | 'ttxReason' | 'correctTreatment' | 'comment' | 'followUp'>;

export interface DashboardData {
  source: MismatchSource; from: string | null; to: string | null;
  summary: {
    visits: number; ddxVisits: number; top1: number; top3: number; top5: number; ddxMismatch: number; doctorAddedDx: number;
    pickedByName: number; followUpExcluded: number; noAiDdx: number;
    ttxVisits: number; ttxUsed: number; ttxFullyAccepted: number; ttxMismatch: number;
    meds: { exact: number; modified: number; ignored: number; added: number };
    mismatch: Record<MismatchType, number>;
    review: Record<ReviewStatus, number>;
    rankHist: number[];
  };
  trend: { date: string; visits: number; ddxVisits: number; top1: number; top5: number; ttxVisits: number; ttxUsed: number; mismatches: number }[];
  top: Record<'missedDx' | 'aiTop1WhenMissed' | 'modifiedMeds' | 'ignoredMeds' | 'addedMeds', { name: string; count: number }[]>;
  annotators: { name: string; done: number }[];
  rejections: { name: string; count: number }[];
  models: { model: string; visits: number; ddxVisits: number; top1: number; top5: number; ttxVisits: number; ttxUsed: number; avgLatency: number | null }[];
}

const base = '/mismatch/workspaces';
const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));

export const mismatchAPI = {
  list: () => jsonApi.get<MismatchWorkspace[]>(base).then((r) => r.data),
  overview: (id: string) =>
    jsonApi.get<{ workspace: { _id: string; name: string; description?: string; icon?: string }; source: MismatchSource; sync: SyncState }>(`${base}/${id}`).then((r) => r.data),
  sync: (id: string, force = false) => jsonApi.post<SyncState>(`${base}/${id}/sync${force ? '?force=1' : ''}`).then((r) => r.data),
  syncState: (id: string) => jsonApi.get<SyncState>(`${base}/${id}/sync`).then((r) => r.data),
  queue: (id: string, q: QueueQuery) => jsonApi.get<QueuePage>(`${base}/${id}/queue`, { params: clean(q) }).then((r) => r.data),
  facets: (id: string) => jsonApi.get<Facets>(`${base}/${id}/facets`).then((r) => r.data),
  dashboard: (id: string, from?: string, to?: string) =>
    jsonApi.get<DashboardData>(`${base}/${id}/dashboard`, { params: clean({ from, to }) }).then((r) => r.data),
  visit: (id: string, uuid: string) => jsonApi.get<VisitDetail>(`${base}/${id}/visits/${uuid}`).then((r) => r.data),
  claim: (id: string, uuid: string) => jsonApi.post<{ claimed: boolean }>(`${base}/${id}/visits/${uuid}/claim`).then((r) => r.data),
  saveReview: (id: string, uuid: string, body: ReviewInput) =>
    jsonApi.put<{ ok: boolean }>(`${base}/${id}/visits/${uuid}/review`, body).then((r) => r.data),
};

export const MISMATCH_LABEL: Record<MismatchType, string> = {
  none: 'Match', ddx: 'Diagnosis', ttx: 'Treatment', both: 'Diagnosis + treatment',
};

export const DDX_VERDICTS = [
  { value: 'doctor_correct', label: 'Doctor is right, AI missed it' },
  { value: 'ai_correct', label: 'AI is right, doctor should have picked it' },
  { value: 'both_acceptable', label: 'Both acceptable / equivalent' },
  { value: 'neither', label: 'Neither is right' },
  { value: 'insufficient', label: 'Note too thin to judge' },
];
export const DDX_REASONS = [
  'AI missed the diagnosis', 'Same condition, different name (synonym)', 'More specific / less specific term',
  'History or exam incomplete in the note', 'Doctor coding or selection error', 'Other',
];
export const TTX_VERDICTS = [
  { value: 'doctor_correct', label: "Doctor's changes are right" },
  { value: 'ai_correct', label: 'AI plan was right' },
  { value: 'both_acceptable', label: 'Both acceptable' },
  { value: 'neither', label: 'Neither is right' },
];
export const TTX_REASONS = [
  'Dose adjusted (age / weight)', 'Frequency or duration changed', 'Formulary / stock availability',
  'AI medicine unnecessary', 'AI medicine unsafe or contraindicated', 'AI missed a needed medicine',
  'Doctor preference (equivalent drug)', 'Other',
];
