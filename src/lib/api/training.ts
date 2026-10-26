import { jsonApi } from '../api';

export interface CaseSection { heading: string; items: string[] }
export interface CaseStage { key: string; title: string; sections: CaseSection[] }
export interface ReferenceMedicine { drug: string; dose: string; frequency: string; duration: string; instruction?: string }

export interface TrainingCase {
  _id: string;
  slug: string;
  title: string;
  specialty: string;
  difficulty: string;
  estimatedMinutes: number;
  teaser: string;
  source: string;
  patient: { age: number; sex: string };
  stages: CaseStage[];
  images: string[];
  reference?: { diagnoses: string[]; medicines: ReferenceMedicine[]; tests: string[]; advice: string[]; referral: string };
}

export interface CaseListItem extends Omit<TrainingCase, 'stages'> {
  myAttempts: number;
  myBestScore: number | null;
  lastAttemptId: string | null;
  peerAttempts: number;
  peerAverage: number | null;
}

export interface TraineeDiagnosis { name: string; role: 'primary' | 'secondary'; confidence: number; reasoning: string; evidence: string[] }
export interface TraineeMedicine { drug: string; dose: string; frequency: string; duration: string }
export interface TraineeTreatment { medicines: TraineeMedicine[]; investigations: string[]; advice: string[]; referral: string; safetyNet: string }
export interface StageImpression { stage: string; diagnoses: string[]; confidence: number }
export interface DialogueTurn { role: 'trainee' | 'tutor'; text: string; at: string }

export interface JudgeResult {
  summary: string;
  scores: { diagnosis: number; reasoning: number; treatment: number; safety: number };
  total: number;
  rubric: { diagnosis: number; reasoning: number; treatment: number; safety: number };
  diagnosis: {
    verdict: 'correct' | 'partially_correct' | 'incorrect';
    assessments: { trainee: string; canonical: string; status: string; comment?: string }[];
    missed: { diagnosis: string; importance: string; clues: string[]; question: string }[];
    differentialsToConsider: { diagnosis: string; why: string }[];
  };
  reasoning: {
    strengths: string[]; gaps: string[];
    evidence: { finding: string; linkedTo: string; verdict: string; comment: string }[];
    stageProgression: string;
  };
  treatment: {
    appropriate: string[];
    concerns: { item: string; severity: 'safety' | 'important' | 'minor'; comment: string }[];
    missingElements: string[]; suggestedPlan: string[]; comparison: string;
  };
  redFlags: string[];
  teachingPoints: string[];
  followUpQuestion: string;
}

export interface TrainingAttempt {
  _id: string;
  caseSlug: string;
  userId: string;
  userName: string;
  stageImpressions: StageImpression[];
  diagnoses: TraineeDiagnosis[];
  treatment: TraineeTreatment;
  timeSpentSec?: number;
  status: 'pending' | 'judged' | 'failed';
  judge?: JudgeResult;
  score?: number;
  judgeModel?: string;
  judgeError?: string;
  dialogue: DialogueTurn[];
  createdAt: string;
}

export interface CaseStats {
  attempts: number;
  averageScore: number | null;
  scores: number[];
  diagnoses: { name: string; count: number }[];
  missed: { name: string; count: number }[];
}

export interface Progress {
  casesCompleted: number; totalCases: number; attempts: number; averageScore: number | null;
  xp: number; level: number; streakDays: number;
  competencies: { diagnosis: number | null; reasoning: number | null; treatment: number | null; safety: number | null };
}

export interface Cohort {
  cases: { slug: string; title: string; specialty: string }[];
  trainees: { userId: string; name: string; scores: Record<string, number>; attempts: number }[];
  totals: { trainees: number; attempts: number; averageScore: number | null; safetyFlags: number };
  competencies: { key: string; percent: number }[];
  missed: { name: string; count: number; cases: string[] }[];
  recent: { id: string; caseSlug: string; userName: string; score: number; seeded: boolean; createdAt: string; diagnoses: string[] }[];
}

export interface Catalog { diagnoses: string[]; medicines: string[]; advice: string[]; tests: string[] }

export const trainingAPI = {
  catalog: async (): Promise<Catalog> => (await jsonApi.get('/training/catalog')).data,
  listCases: async (): Promise<CaseListItem[]> => (await jsonApi.get('/training/cases')).data,
  getCase: async (slug: string): Promise<TrainingCase> => (await jsonApi.get(`/training/cases/${slug}`)).data,
  // The judge runs synchronously on submit; give it room.
  submit: async (slug: string, body: { stageImpressions: StageImpression[]; diagnoses: TraineeDiagnosis[]; treatment: TraineeTreatment; timeSpentSec: number }): Promise<{ id: string; status: string }> =>
    (await jsonApi.post(`/training/cases/${slug}/attempts`, body, { timeout: 240000 })).data,
  getAttempt: async (id: string): Promise<{ attempt: TrainingAttempt; case: TrainingCase; stats: CaseStats }> =>
    (await jsonApi.get(`/training/attempts/${id}`)).data,
  reply: async (id: string, message: string): Promise<{ dialogue: DialogueTurn[] }> =>
    (await jsonApi.post(`/training/attempts/${id}/reply`, { message }, { timeout: 120000 })).data,
  progress: async (): Promise<Progress> => (await jsonApi.get('/training/progress')).data,
  cohort: async (): Promise<Cohort> => (await jsonApi.get('/training/cohort')).data,
};
