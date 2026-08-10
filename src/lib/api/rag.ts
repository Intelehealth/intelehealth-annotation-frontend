import { jsonApi } from '../api';

export type RagDocumentStatus = 'INDEXED' | 'READY' | 'PROCESSING' | 'FAILED';

export interface CsvPreviewResult {
  columns: string[];
  rows: string[][];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RagDocumentInfo {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: RagDocumentStatus;
  pageCount?: number;
  profile: string;
  chunkCount: number;
  indexed: boolean;
  source?: 'DOCUMENT' | 'CSV';
}

export interface RagIndexHealth {
  documents: number;
  chunks: number;
  ready: boolean;
  embeddingModel?: string;
  embeddingVersion?: string;
}

export interface RagCitation {
  fileName?: string;
  page?: number;
  chunkId?: string;
  documentId?: string;
}

export interface RagChatResult {
  answer: string;
  confidence: number;
  lowConfidence: boolean;
  citations: RagCitation[];
  selectedModel: string;
  selectedEmbedModel: string;
}

export interface RagPresetInfo {
  key: 'GEMINI' | 'QWEN' | 'LLAMA';
  available: boolean;
  capabilities: string[];
  resolvedId?: string;
}

export const ragAPI = {
  async status(datasetId: string): Promise<RagIndexHealth> {
    const res = await jsonApi.get(`/rag/datasets/${datasetId}/status`);
    return res.data;
  },

  async index(datasetId: string): Promise<any> {
    const res = await jsonApi.post(`/rag/datasets/${datasetId}/index`);
    return res.data;
  },

  async reindex(datasetId: string): Promise<any> {
    const res = await jsonApi.post(`/rag/datasets/${datasetId}/reindex`);
    return res.data;
  },

  async documents(datasetId: string): Promise<RagDocumentInfo[]> {
    const res = await jsonApi.get(`/rag/datasets/${datasetId}/documents`);
    return res.data;
  },

  async csvPreview(
    datasetId: string,
    csvImportId: string,
    opts?: { page?: number; pageSize?: number },
  ): Promise<CsvPreviewResult> {
    const params = new URLSearchParams();
    if (opts?.page != null) params.set('page', String(opts.page));
    if (opts?.pageSize != null) params.set('pageSize', String(opts.pageSize));
    const qs = params.toString();
    const res = await jsonApi.get(
      `/rag/datasets/${datasetId}/imports/${csvImportId}/preview${qs ? `?${qs}` : ''}`,
    );
    return res.data;
  },

  async models(): Promise<RagPresetInfo[]> {
    const res = await jsonApi.get(`/rag/models`);
    return res.data;
  },

  async chat(input: {
    datasetId: string;
    question: string;
    model?: string;
    temperature?: number;
    topK?: number;
    documentId?: string;
  }): Promise<RagChatResult> {
    const res = await jsonApi.post(`/rag/chat`, input);
    return res.data;
  },

  async orchestrate(input: {
    datasetId: string;
    question: string;
    model?: string;
    documentId?: string;
  }): Promise<any> {
    const res = await jsonApi.post(`/orchestrator/query`, input);
    return res.data;
  },

  async getConversation(datasetId: string): Promise<{ messages: any[] }> {
    const res = await jsonApi.get(`/rag/datasets/${datasetId}/conversations`);
    return res.data;
  },

  async clearConversation(datasetId: string): Promise<{ success: boolean }> {
    const res = await jsonApi.delete(
      `/rag/datasets/${datasetId}/conversations`,
    );
    return res.data;
  },

  async relatedQuestions(datasetId: string): Promise<any[]> {
    const res = await jsonApi.get(
      `/rag/datasets/${datasetId}/related-questions`,
    );
    return res.data;
  },

  async generateRelatedQuestions(datasetId: string, count?: number): Promise<any[]> {
    const res = await jsonApi.post(
      `/rag/datasets/${datasetId}/related-questions`,
      { count },
    );
    return res.data;
  },

  async coverage(datasetId: string): Promise<any[]> {
    const res = await jsonApi.get(`/rag/datasets/${datasetId}/coverage`);
    return res.data;
  },

  async saveUserSettings(input: { preferredModel?: string; preferredEmbeddingModel?: string }): Promise<any> {
    const res = await jsonApi.patch(`/rag/settings`, input);
    return res.data;
  },

  async saveDatasetSettings(
    datasetId: string,
    input: { model?: string; embedModel?: string; systemPrompt?: string; temperature?: number; topK?: number },
  ): Promise<any> {
    const res = await jsonApi.patch(`/rag/datasets/${datasetId}/rag-settings`, input);
    return res.data;
  },
};