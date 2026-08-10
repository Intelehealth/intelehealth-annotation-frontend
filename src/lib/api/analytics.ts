import { jsonApi } from "../api";

export interface DatasetSummary {
  totalDocuments: number;
  processingStatusCounts: Record<string, number>;
  totalRows: number;
  completedRows: number;
  annotationProgress: number;
  averageConfidence: number | null;
  consensus: {
    totalConsensusReviews: number;
    agreedReviews: number;
    disagreedReviews: number;
    resolvedConflicts: number;
    pendingReviews: number;
  };
}

export interface ProcessingMetrics {
  documentsByStatus: Record<string, number>;
  totalDocuments: number;
  processingFailures: number;
  sourceTypes: Record<string, number>;
}

export interface AnnotationMetrics {
  totalRows: number;
  completedRows: number;
  pendingRows: number;
  inProgressRows: number;
  completionPercentage: number;
}

export interface ConsensusMetrics {
  totalConsensusReviews: number;
  agreedReviews: number;
  disagreedReviews: number;
  resolvedConflicts: number;
  pendingReviews: number;
  agreementPercentage: number;
}

export const analyticsAPI = {
  getDatasetSummary: async (datasetId: string): Promise<DatasetSummary> => {
    const response = await jsonApi.get(
      `/analytics/datasets/${datasetId}/summary`,
    );
    return response.data;
  },

  getProcessingMetrics: async (
    datasetId: string,
  ): Promise<ProcessingMetrics> => {
    const response = await jsonApi.get(
      `/analytics/datasets/${datasetId}/processing`,
    );
    return response.data;
  },

  getAnnotationMetrics: async (
    datasetId: string,
  ): Promise<AnnotationMetrics> => {
    const response = await jsonApi.get(
      `/analytics/datasets/${datasetId}/annotation`,
    );
    return response.data;
  },

  getConsensusMetrics: async (datasetId: string): Promise<ConsensusMetrics> => {
    const response = await jsonApi.get(
      `/analytics/datasets/${datasetId}/consensus`,
    );
    return response.data;
  },

  agentQuery: async (
    datasetId: string,
    tool: string,
    params?: Record<string, any>,
  ): Promise<{ tool: string; result: string }> => {
    const response = await jsonApi.post("/analytics/agent/query", {
      datasetId,
      tool,
      params,
    });
    return response.data;
  },
};
