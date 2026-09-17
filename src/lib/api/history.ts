import { jsonApi } from '@/lib/api';

// Change history for a dataset, backed by GET /datasets/:id/history.
// Mode is SHARED (one dataset, many people) or CLONE (parent + one copy per annotator).

export interface HistoryPerson { id: string; name: string; email: string; isOnline: boolean }
export interface HistoryCopy { id: string; name: string; isClone: boolean; annotator: HistoryPerson | null }
export interface HistoryItem {
  id: string;
  at: string;
  rowIndex: number;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  by: HistoryPerson | null;
  dataset: { id: string; name: string; isClone: boolean } | null;
}
export interface HistoryPage {
  mode: 'SHARED' | 'CLONE';
  page: number;
  limit: number;
  total: number;
  items: HistoryItem[];
  fields: string[];
  people: HistoryPerson[];
  copies: HistoryCopy[];
}
export interface HistorySummary {
  mode: 'SHARED' | 'CLONE';
  lastChange: { at: string; by: HistoryPerson | null; fieldName: string; rowIndex: number; dataset?: string } | null;
  people: (HistoryPerson & { changes: number; rowsTouched: number; firstAt: string; lastAt: string; workingNow: boolean; dataset: { id: string; name: string; isClone: boolean } | null })[];
  copies: number;
}
export interface HistoryFilters { user?: string; field?: string; dataset?: string; q?: string; from?: string; to?: string; page?: number; limit?: number }

export const historyAPI = {
  list: (datasetId: string, f: HistoryFilters = {}) =>
    jsonApi.get<HistoryPage>(`/datasets/${datasetId}/history`, { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '')) }).then((r) => r.data),
  summary: (datasetId: string) => jsonApi.get<HistorySummary>(`/datasets/${datasetId}/history/summary`).then((r) => r.data),
};
