import { jsonApi } from '../api';

// ─── Existing interfaces (unchanged) ──────────────────────────────────────────

export interface DatasetMergedRow {
  rowIndex: number;
  data: Record<string, any>;
  processed: boolean;
  completed?: boolean;
  completedAt?: Date;
}

export interface CSVInfo {
  csvImportId: string;
  fileName: string;
  originalCsvRowIndex: number;
}

export interface RowWithCSVInfo {
  rowIndex: number;
  data: Record<string, any>;
  processed: boolean;
  completed?: boolean;
  completedAt?: Date;
  csvInfo?: CSVInfo | null;
}

export interface DatasetRowsResponse {
  rows: RowWithCSVInfo[];
  totalRows: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface AnnotationProgress {
  totalRows: number;
  completedRows: number;
  pendingRows: number;
  progressPercentage: number;
  csvBreakdown: {
    fileName: string;
    totalRows: number;
    completedRows: number;
    progressPercentage: number;
  }[];
}

export interface DatasetMergedRowsData {
  _id: string;
  datasetId: string;
  userId: string;
  mergedRows: DatasetMergedRow[];
  csvImports: {
    csvImportId: string;
    fileName: string;
    totalRows: number;
    startRowIndex: number;
    endRowIndex: number;
    uploadedAt: string;
  }[];
  totalRows: number;
  totalCSVFiles: number;
  lastRowIndex: number;
  status: string;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatchRowDataRequest {
  data: Record<string, any>;
}

export interface PatchRowDataResponse {
  success: boolean;
  data: any;
  updatedFields: number;
  changedFields: string[];
  updatedAt: string;
}

export interface MarkRowCompletedRequest {
  datasetId: string;
  rowIndex: number;
}

// ─── DatasetMergedRowsAPI ──────────────────────────────────────────────────────

export class DatasetMergedRowsAPI {

  /**
   * Get dataset merged rows data.
   *
   * Feature 1: When taskId is provided, the ?taskId= query param tells the backend
   * to return the merged rows record scoped to that annotator's task, so Ravi and
   * Priya each read their own isolated record.
   * Without taskId: existing admin behaviour — reads the shared dataset record.
   */
  static async getDatasetData(
    datasetId: string,
    taskId?: string,
  ): Promise<DatasetMergedRowsData> {
    try {
      const qs = taskId ? `?taskId=${taskId}` : '';
      const response = await jsonApi.get(
        `/dataset-merged-rows/dataset/${datasetId}/debug${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error getting dataset data:', error);
      throw error;
    }
  }

  /**
   * Get paginated dataset rows (no taskId needed — unchanged).
   */
  static async getDatasetRows(
    datasetId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<DatasetRowsResponse> {
    const response = await jsonApi.get(
      `/dataset-merged-rows/dataset/${datasetId}/rows?page=${page}&limit=${limit}`,
    );
    return response.data;
  }

  /**
   * Get specific row by index (unchanged).
   */
  static async getRowByIndex(
    datasetId: string,
    rowIndex: number,
  ): Promise<RowWithCSVInfo | null> {
    const response = await jsonApi.get(
      `/dataset-merged-rows/dataset/${datasetId}/row/${rowIndex}`,
    );
    return response.data;
  }

  /**
   * Get annotation progress for dataset (unchanged).
   */
  static async getAnnotationProgress(datasetId: string): Promise<AnnotationProgress> {
    const response = await jsonApi.get(
      `/dataset-merged-rows/dataset/${datasetId}/progress`,
    );
    return response.data;
  }

  /**
   * Mark a row as completed.
   *
   * Feature 1: taskId in the request body tells backend to scope this completion
   * flag to the annotator's task record, not the shared dataset record.
   * Without taskId: existing behaviour (admin marks shared record).
   */
  static async markRowCompleted(
    datasetId: string,
    rowIndex: number,
    taskId?: string,
  ): Promise<void> {
    try {
      await jsonApi.patch('/dataset-merged-rows/mark-completed', {
        datasetId,
        rowIndex,
        ...(taskId ? { taskId } : {}),
      });
    } catch (error) {
      console.error('Error marking row as completed:', error);
      throw error;
    }
  }

  /**
   * Update row data (annotation field values).
   *
   * Feature 1: taskId in the body tells backend to write into the annotator's
   * task-scoped merged rows record. Ravi's save never touches Priya's record.
   * Without taskId: existing behaviour (admin writes to shared record).
   */
  static async patchRowData(
    datasetId: string,
    rowIndex: number,
    data: Record<string, any>,
    taskId?: string,
  ): Promise<PatchRowDataResponse> {
    try {
      const response = await jsonApi.patch(
        `/dataset-merged-rows/dataset/${datasetId}/row/${rowIndex}`,
        {
          data,
          ...(taskId ? { taskId } : {}),
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error patching row data:', error);
      throw error;
    }
  }

  // Sprint B: Clone-based annotation save for isolation
  static async patchCloneRowData(
    cloneId: string,
    rowIndex: number,
    data: Record<string, any>,
  ): Promise<PatchRowDataResponse> {
    try {
      const response = await jsonApi.patch(
        `/dataset-merged-rows/clone/${cloneId}/row/${rowIndex}`,
        { data },
      );
      return response.data;
    } catch (error) {
      console.error('Error patching clone row data:', error);
      throw error;
    }
  }

  /**
   * Check if dataset has merged rows (unchanged).
   */
  static async hasMergedRows(datasetId: string): Promise<boolean> {
    try {
      const data = await this.getDatasetData(datasetId);
      return data.totalRows > 0;
    } catch (error) {
      console.error('Error checking merged rows:', error);
      return false;
    }
  }

  /**
   * Get detailed progress with row completion statuses.
   *
   * Feature 1: taskId scopes both the progress record and row status reads
   * to this annotator's task. Without taskId: existing admin view behaviour.
   */
  static async getDetailedProgress(
    datasetId: string,
    taskId?: string,
  ): Promise<{
    totalRows: number;
    completedRows: number;
    pendingRows: number;
    progressPercentage: number;
    lastViewedRow: number;
    rowStatuses: {
      rowIndex: number;
      completed: boolean;
      completedAt?: string;
    }[];
  }> {
    try {
      const qs = taskId ? `?taskId=${taskId}` : '';
      const progressResponse = await jsonApi.get(
        `/field-selection/dataset/${datasetId}/progress${qs}`,
      );
      const progress = progressResponse.data;

      const datasetData = await this.getDatasetData(datasetId, taskId);

      const rowStatuses = (datasetData?.mergedRows || []).map((row) => ({
        rowIndex: row.rowIndex,
        completed: row.completed || false,
        completedAt: row.completedAt
          ? row.completedAt instanceof Date
            ? row.completedAt.toISOString()
            : (row.completedAt as unknown as string)
          : undefined,
      }));

      return {
        totalRows: progress.totalRows || datasetData.totalRows,
        completedRows: progress.completedRows || 0,
        pendingRows: progress.pendingRows || datasetData.totalRows,
        progressPercentage:
          progress.totalRows > 0
            ? (progress.completedRows / progress.totalRows) * 100
            : 0,
        lastViewedRow: progress.lastViewedRow || 0,
        rowStatuses,
      };
    } catch (error) {
      console.error('Error getting detailed progress:', error);
      throw error;
    }
  }

  /**
   * Check if annotation can be resumed (unchanged — uses getDetailedProgress internally).
   */
  static async canResumeAnnotation(datasetId: string): Promise<{
    canResume: boolean;
    lastViewedRow: number;
    completedRows: number;
    totalRows: number;
    progressPercentage: number;
  }> {
    try {
      const progress = await this.getDetailedProgress(datasetId);
      return {
        canResume: progress.completedRows > 0,
        lastViewedRow: progress.lastViewedRow,
        completedRows: progress.completedRows,
        totalRows: progress.totalRows,
        progressPercentage: progress.progressPercentage,
      };
    } catch (error) {
      console.error('Error checking resume capability:', error);
      return {
        canResume: false,
        lastViewedRow: 0,
        completedRows: 0,
        totalRows: 0,
        progressPercentage: 0,
      };
    }
  }

  /**
   * Update annotation progress (last viewed row + completed count).
   *
   * Feature 1: taskId scopes the progress update to this annotator's task.
   * Without taskId: existing behaviour.
   */
  static async updateAnnotationProgress(
    datasetId: string,
    lastViewedRow: number,
    completedRows: number,
    taskId?: string,
  ): Promise<void> {
    try {
      const response = await jsonApi.patch(
        `/field-selection/dataset/${datasetId}/progress`,
        {
          lastViewedRow,
          completedRows,
          ...(taskId ? { taskId } : {}),
        },
      );
    } catch (error) {
      console.error('Error updating dataset annotation progress:', error);
      throw error;
    }
  }

  /**
   * Check if all rows in a dataset (or task) are completed.
   *
   * Feature 1: ?taskId= scopes the completion check to this annotator's task.
   * Without taskId: checks the shared dataset record (admin view).
   */
  static async checkAllRowsCompleted(
    datasetId: string,
    taskId?: string,
  ): Promise<{
    allCompleted: boolean;
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
  }> {
    try {
      const qs = taskId ? `?taskId=${taskId}` : '';
      const response = await jsonApi.get(
        `/dataset-merged-rows/dataset/${datasetId}/completion-status${qs}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error checking completion status:', error);
      throw error;
    }
  }

  /**
   * Utility to build partial update objects (unchanged).
   */
  static createPartialUpdate<T extends Record<string, any>>(
    updates: Partial<T>,
  ): Partial<T> {
    const cleanedUpdates: Partial<T> = {};
    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof T] !== undefined) {
        cleanedUpdates[key as keyof T] = updates[key as keyof T];
      }
    });
    return cleanedUpdates;
  }
}