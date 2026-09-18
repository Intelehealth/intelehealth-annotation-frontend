import { jsonApi } from '../api';
import { VisibilityRule, BranchOption } from '@/types/feature1';

export interface CSVRowData {
  rowIndex: number;
  data: Record<string, any>;
  processed: boolean;
  errors?: string[];
  // NEW: Progress tracking fields
  completed?: boolean;
  completedAt?: string; // ISO string date
}

export interface CSVImport {
  _id: string;
  datasetId: string;
  userId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  status: string;
  columns?: string[];
  columnMappings: any[];
  rowData: CSVRowData[];
  metadata?: {
    totalColumns: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GroupChildField {
  id: string;
  fieldName: string;
  columnType: 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'multiselect' | 'checkbox' | 'date' | 'rating' | 'url';
  options?: string[];
  placeholder?: string;
  isRequired?: boolean;
  /** The annotator may add more of this input. */
  repeatable?: boolean;
  /** Cap on how many, when repeatable. */
  maxInstances?: number;
  helpText?: string;
}

export interface AnnotationField {
  /** How an image column stores its value — see lib/image-source.ts */
  imageFormat?: 'url' | 'base64' | 'binary';
  imageMultiple?: boolean;
  imageDelimiter?: string;
  imageMimeType?: string;
  /** Let annotators caption each image, and how that caption is captured. */
  captionEnabled?: boolean;
  captionLabel?: string;
  captionType?: 'text' | 'textarea' | 'select' | 'radio' | 'multiselect' | 'number';
  captionOptions?: string[];
  captionRequired?: boolean;
  /** Inputs filled for each image; supersedes the single caption* settings. */
  captionFields?: GroupChildField[];
  /** Hover magnifier on the full-size image: on/off, zoom (1.5 = 150%), radius px. */
  lensEnabled?: boolean;
  lensZoom?: number;
  lensRadius?: number;
  csvColumnName: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'select' | 'selectrange' | 'textarea' | 'rating' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'url' | 'image' | 'audio' | 'video';
  isRequired: boolean;
  // true if it needs annotation (right panel); false if metadata (left)
  isAnnotationField: boolean;
  // optional: whether this field is the unique primary key
  isPrimaryKey?: boolean;
  options?: string[];
  instructions?: string;
  isNewColumn?: boolean; // true if this is a new column, not from CSV  
  newColumnId?: string; // Reference to NewColumn if isNewColumn is true
  columnType?: 'text' | 'number' | 'select' | 'selectrange' | 'textarea' | 'rating' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'url' | 'group';
  /**
   * Children of a composite ("group") field: several inputs answered together
   * under one heading. A child marked repeatable starts with one box and the
   * annotator adds more; its answers are stored as a JSON array.
   */
  groupChildren?: GroupChildField[];
  /** Annotators may add more sets of this group's inputs (e.g. several medications). */
  groupRepeatable?: boolean;
  /** Cap on how many sets, when groupRepeatable. */
  groupMaxEntries?: number;
  /** Name of one set, shown numbered: "Medication 1", "Medication 2". */
  groupEntryLabel?: string;
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

  // NEW Metadata properties
  id?: string;
  /** Stable identifier linking to the original CSV column. Never changes. */
  csvColumnId?: string;
  questionTitle?: string;
  questionDescription?: string;
  helpText?: string;
  section?: string;
  visibilityRule?: VisibilityRule;
  branching?: {
    enabled: boolean;
    options: BranchOption[];
  };

  /** @deprecated No longer used. CSV fields are now moved (not linked). */
  isDataFieldLink?: boolean;
  /** @deprecated No longer used alongside isDataFieldLink. */
  sourceCsvColumnName?: string;
}

export interface AnnotationConfig {
  _id: string;
  csvImportId: string;
  userId?: string;
  annotationFields: AnnotationField[];
  annotationLabels?: any[]; // Add annotation labels
  rowAnnotations: any[];
  fieldGroups?: any[]; // Repeatable field groups config
  totalRows: number;
  completedRows: number;
  lastViewedRow?: number; // NEW: Track last viewed row for resume
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatchAnnotationConfigRequest {
  annotationFields?: AnnotationField[];
  annotationLabels?: any[];
  lastViewedRow?: number; // NEW: Allow updating last viewed row
  completedRows?: number; // NEW: Allow updating completed count
  status?: string;
}

export interface PatchRowAnnotationRequest {
  annotations: Record<string, any>;
  confidence?: number;
  notes?: string;
  status?: string;
}

export interface PatchAnnotationResponse {
  success: boolean;
  data: any;
  updatedFields: number;
  changedFields: string[];
  updatedAt: string;
}

export class CSVImportsAPI {
  // Get CSV import by ID with full data including rowData
  static async findOne(datasetId: string, id: string): Promise<CSVImport> {
    const response = await jsonApi.get(`/csv-processing/dataset/${datasetId}/data/${id}`);
    return response.data;
  }

  // Get CSV import status (same as findOne since we're using the status endpoint)
  static async getStatus(datasetId: string, id: string): Promise<CSVImport> {
    return this.findOne(datasetId, id);
  }

  // Get CSV columns
  static async getColumns(id: string): Promise<{ columns: string[] }> {
    const response = await jsonApi.get(`/csv-processing/imports/${id}/columns`);
    return response.data;
  }

  // Get annotation config for CSV import
  static async getAnnotationConfig(
    csvImportId: string,
  ): Promise<AnnotationConfig> {
    const response = await jsonApi.get(
      `/csv-processing/field-selection/${csvImportId}`,
    );
    return response.data;
  }

  // Get CSV imports by dataset ID
  static async getByDataset(datasetId: string): Promise<CSVImport[]> {
    const response = await jsonApi.get(
      `/csv-processing/dataset/${datasetId}/imports`,
    );
    return response.data;
  }

  // Get annotation progress
  static async getAnnotationProgress(csvImportId: string): Promise<{
    totalRows: number;
    completedRows: number;
    pendingRows: number;
    inProgressRows: number;
    status: string;
    lastViewedRow?: number; // NEW: Track last viewed row for resume
  }> {
    const response = await jsonApi.get(
      `/csv-processing/field-selection/${csvImportId}/progress`,
    );
    return response.data;
  }

  // Delete CSV import
  static async deleteCSVImport(
    datasetId: string,
    csvImportId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await jsonApi.delete(
      `/datasets/${datasetId}/csv-imports/${csvImportId}`,
    );
    return response.data;
  }

  // PATCH Methods for Partial Updates
  static async patchAnnotationConfig(
    csvImportId: string,
    patchData: PatchAnnotationConfigRequest,
  ): Promise<PatchAnnotationResponse> {
    const response = await jsonApi.patch(
      `/csv-processing/field-selection/${csvImportId}`,
      patchData,
    );
    return response.data;
  }

  static async patchRowAnnotation(
    csvImportId: string,
    rowIndex: number,
    patchData: PatchRowAnnotationRequest,
  ): Promise<PatchAnnotationResponse> {
    const response = await jsonApi.patch(
      `/csv-processing/field-selection/${csvImportId}/row/${rowIndex}`,
      patchData,
    );
    return response.data;
  }

  static async patchAnnotationField(
    csvImportId: string,
    fieldIndex: number,
    patchData: PatchAnnotationConfigRequest,
  ): Promise<PatchAnnotationResponse> {
    const response = await jsonApi.patch(
      `/csv-processing/field-selection/${csvImportId}/field/${fieldIndex}`,
      patchData,
    );
    return response.data;
  }

  // Direct CSV row data update method
  static async patchCSVRowData(
    datasetId: string,
    csvImportId: string,
    rowIndex: number,
    updatedData: Record<string, any>,
  ): Promise<PatchAnnotationResponse> {
    const response = await jsonApi.patch(
      `/csv-processing/dataset/${datasetId}/data/${csvImportId}/row/${rowIndex}`,
      { data: updatedData },
    );
    return response.data;
  }

  // Utility method to create partial update objects
  static createPartialUpdate<T extends Record<string, any>>(updates: Partial<T>): Partial<T> {
    // Remove undefined values to ensure only changed fields are sent
    const cleanedUpdates: Partial<T> = {};
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof T] !== undefined) {
        cleanedUpdates[key as keyof T] = updates[key as keyof T];
      }
    });
    return cleanedUpdates;
  }

  // NEW HELPER METHODS FOR ANNOTATION PROGRESS

  // Helper: Mark row as completed
  static async markRowCompleted(
    datasetId: string,
    csvImportId: string,
    rowIndex: number
  ): Promise<PatchAnnotationResponse> {
    return this.patchCSVRowData(datasetId, csvImportId, rowIndex, {
      processed: true,
      completed: true,
      completedAt: new Date().toISOString()
    });
  }

  // Helper: Update annotation progress (last viewed row + completed count)
  static async updateAnnotationProgress(
    csvImportId: string,
    lastViewedRow: number,
    completedRows: number
  ): Promise<PatchAnnotationResponse> {
    return this.patchAnnotationConfig(csvImportId, {
      lastViewedRow,
      completedRows
    });
  }

  // Helper: Get detailed progress with row completion statuses
  static async getDetailedProgress(csvImportId: string) {
    try {
      const response = await jsonApi.get(
        `/csv-processing/field-selection/${csvImportId}/detailed-progress`,
      );
      return response.data;
    } catch (error) {
      console.error('Error getting detailed progress:', error);
      throw error;
    }
  }

  // Helper: Check if annotation can be resumed (has progress)
  static async canResumeAnnotation(csvImportId: string): Promise<{
    canResume: boolean;
    lastViewedRow: number;
    completedRows: number;
    totalRows: number;
    progressPercentage: number;
  }> {
    try {
      const response = await jsonApi.get(
        `/csv-processing/field-selection/${csvImportId}/can-resume`,
      );
      return response.data;
    } catch (error) {
      console.error('Error checking resume capability:', error);
      return {
        canResume: false,
        lastViewedRow: 0,
        completedRows: 0,
        totalRows: 0,
        progressPercentage: 0
      };
    }
  }
}
