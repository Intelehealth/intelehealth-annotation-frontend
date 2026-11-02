import { jsonApi } from '@/lib/api';

// Mirrors backend src/mismatch. NAS and TURN each have a workspace whose
// visits are synced from OpenMRS (ES GraphQL) in the background; a visit is a
// mismatch when the doctor picked none of the AI's top 5 diagnoses (ddx) or
// changed / skipped / added to the AI's medicines (ttx).

export type MismatchSource = 'NAS' | 'TURN';
/** TURN is the API's key; the programme is Arogya Path (PAT). */
export const SOURCE_LABEL: Record<MismatchSource, string> = { NAS: 'NAS', TURN: 'Arogya Path (PAT)' };
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
    fetched: number; total: number; inserted: number; updated: number; unchanged?: number; error?: string;
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
  uuid: string; visitId?: number; visitPseudoId: string | null; doctor: string | null; encounterAt?: string; gender?: string; age?: number; specialty?: string;
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
  flag?: string; model?: string; doctor?: string;
  q?: string; sort?: string; page?: number; limit?: number;
}

export interface QueuePage { total: number; page: number; limit: number; counts: Record<QueueTab, number>; items: QueueItem[] }
export interface Facets { specialties: string[]; models: string[]; doctors: string[]; rejectReasons: string[]; reviewers: { _id: string; name: string }[] }

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
  history?: ReviewHistoryEntry[];
}

/** One save of a review; newest first. */
export interface ReviewHistoryEntry {
  by: { _id: string; name: string } | null; at: string; action: 'annotated' | 'edited' | 'draft';
  ddxVerdict?: string; ddxReason?: string; correctDiagnosis?: string;
  ttxVerdict?: string; ttxReason?: string; correctTreatment?: string; comment?: string; followUp?: boolean;
}

export interface VisitDetail {
  uuid: string; visitId?: number; visitPseudoId?: string; source: MismatchSource; encounterAt?: string;
  demographics?: { patientId?: number; patientPseudoId?: string; gender?: string; age?: number; visitStartedDate?: string | null };
  /** IST wall-clock strings from OpenMRS: doctor opened the visit note / shared the prescription. */
  doctorTimestamps?: { doctorStartedVisitNoteAt?: string | null; prescriptionSharedAt?: string | null } | null;
  providers?: { creatorPseudoId?: string | null; doctorPseudoIds?: string[] | null } | null;
  attributes?: { specialty?: string; doctorPatientInteraction?: string };
  vitals?: Record<string, number | string | null>;
  visitNote?: Record<string, string | null>;
  images: string[];
  ddx?: { diagnoses: AiDiagnosis[]; conclusion?: string | null; furtherQuestions?: string[]; reason?: string | null; aiSurface?: string | null; details?: unknown } | null;
  ttx?: { medications: AiMedication[]; planRationale?: string | null; reason?: string | null; aiSurface?: string | null } | null;
  langfuse?: { model?: string; engine?: string; latency?: number; totalTokens?: number | null; success?: unknown; name?: string } | null;
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
  rejections: { name: string; count: number }[];
  models: { model: string; visits: number; ddxVisits: number; top1: number; top5: number; ttxVisits: number; ttxUsed: number; avgLatency: number | null }[];
  doctors: DoctorStat[];
  ai: AiMetrics;
  /** Consultation turnaround, every visit in range (follow-ups included). */
  tat: TatMetrics;
  mrr: number;
  aiTop1Agreement: GroupStat[];
  specialties: (GroupStat & { ttxVisits: number; ttxUsed: number })[];
  /** Every AI suggestion (ranks 1-5) by its confidence label: how often the doctor picked it. */
  confidence: { name: string; suggestions: number; picked: number; asTop1: number; top1Picked: number; avgRank: number | null }[];
  mismatchPairs: { missed: { name: string; count: number }[]; rankedLower: { name: string; count: number }[] };
  medicines: { name: string; suggested: number; exact: number; modified: number; ignored: number; acceptance: number }[];
  addedForDiagnosis: { name: string; count: number }[];
  progress: {
    total: number;
    openInRange: number;
    reviewers: { name: string; annotated: number; ddx: number; ttx: number; followUp: number; verdicts: Record<string, number>; lastActive: string | null }[];
    daily: ({ date: string } & Record<string, number | string>)[];
  };
}

/** Chief-of-AI metric set (backend src/mismatch/ai-metrics.ts). */
export interface AiHeadline {
  visits: number;
  dxGenerated: number; dxScored: number; dxPicked: number; top1: number; top3: number; top5: number; dxAddedNonAi: number; followUpOnly: number;
  ttxGenerated: number; aiMedicines: number;
  casesUnchanged: number; casesChanged: number; casesNotPicked: number; casesAdded: number; casesFullyAccepted: number;
  investigations: number; advice: number; referral: number; followUp: number;
}
export interface DxAgg { name: string; visits: number; scored: number; picked: number; top1: number; top3: number; top5: number; addedNonAi: number }
export type ChangeType = 'dose' | 'frequency' | 'duration' | 'instructions' | 'not_in_prescription' | 'no_visible_difference';
export interface AiMetrics {
  headline: { all: AiHeadline; paediatric: AiHeadline; adult: AiHeadline; paediatricMaxAge: number; includeFollowUps: boolean };
  rationaleClicks: number | null;
  /** Follow-up visits left out of every AI metric (nothing in the note for the AI to work from). */
  followUpVisitsExcluded: number;
  byDoctor: (DxAgg & { ttxGenerated: number; casesUnchanged: number; casesChanged: number })[];
  byDay: (DxAgg & { ttxGenerated: number; casesUnchanged: number; casesChanged: number; casesNotPicked: number; casesAdded: number })[];
  byDoctorDay: (DxAgg & { doctor: string; date: string })[];
  byDx: DxAgg[];
  medicines: { name: string; suggested: number; unchanged: number; changed: number; notPicked: number; paediatric: number; changes: Record<ChangeType, number> }[];
  changeTypes: Record<ChangeType, number>;
  addedMedicines: { name: string; count: number; paediatric: number; dose: string | null; frequency: string | null; duration: string | null }[];
  orders: Record<'investigations' | 'advice' | 'referrals', { name: string; count: number }[]>;
}

/** Minutes. wait = visit start -> doctor opened the note; consult = note -> prescription shared; total = visit start -> shared. */
export interface TatRow {
  name: string; visits: number; shared: number;
  waitMedian: number | null; waitP90: number | null; consultMedian: number | null; consultP90: number | null;
  totalMedian: number | null; totalP90: number | null; sharedWithin1h: number; over24h: number;
}
export interface TatMetrics {
  all: TatRow; paediatric: TatRow; adult: TatRow;
  byDoctor: TatRow[]; byDay: TatRow[]; byMonth: TatRow[]; byDoctorMonth: (TatRow & { doctor: string; month: string })[];
}

/** Per consulting doctor (pseudo id from OpenMRS). */
export interface DoctorStat {
  doctor: string; visits: number; ddxVisits: number; top1: number; top5: number; ddxMismatch: number;
  ttxVisits: number; ttxUsed: number; ttxFullyAccepted: number; mismatches: number; annotated: number;
  ddxDoctorRight: number; ddxAiRight: number; ttxDoctorRight: number; ttxAiRight: number;
}

/** Doctors are shown by the pseudo id OpenMRS sends, never by name. */
export const doctorLabel = (id?: string | null) => (id && id !== 'Unknown' ? `Dr #${id}` : 'Unknown doctor');

export interface GroupStat { name: string; visits: number; top1: number; top5: number; mrr: number }

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
  dashboard: (id: string, from?: string, to?: string, population?: string, followUps?: 'include' | 'exclude') =>
    jsonApi.get<DashboardData>(`${base}/${id}/dashboard`, { params: clean({ from, to, population, followUps }) }).then((r) => r.data),
  visit: (id: string, uuid: string) => jsonApi.get<VisitDetail>(`${base}/${id}/visits/${uuid}`).then((r) => r.data),
  /** Image `index` of a visit as a blob, proxied from OpenMRS by the backend. */
  image: (id: string, uuid: string, index: number) =>
    jsonApi.get<Blob>(`${base}/${id}/visits/${uuid}/images/${index}`, { responseType: 'blob' }).then((r) => r.data),
  claim: (id: string, uuid: string) => jsonApi.post<{ claimed: boolean }>(`${base}/${id}/visits/${uuid}/claim`).then((r) => r.data),
  /** final = "Save & next" (mark done; the API rejects it without the required verdicts); otherwise a draft. */
  saveReview: (id: string, uuid: string, body: ReviewInput & { final?: boolean }) =>
    jsonApi.put<{ ok: boolean; status: ReviewStatus; missing: string[] }>(`${base}/${id}/visits/${uuid}/review`, body).then((r) => r.data),
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
