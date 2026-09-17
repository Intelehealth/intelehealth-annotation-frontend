import { jsonApi } from '../api';

export interface AnnotationData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  start?: number;
  end?: number;
  text?: string;
  startTime?: number;
  endTime?: number;
  transcription?: string;
  value?: string;
  [key: string]: any;
}

export interface CreateAnnotationRequest {
  csvImportId: string;
  userId?: string;
  csvRowIndex: number;
  fieldName: string;
  type:
    | 'BBOX'
    | 'TEXT_NER'
    | 'AUDIO_TRANSCRIPTION'
    | 'CLASSIFICATION'
    | 'POLYGON'
    | 'POINT'
    | 'LINE'
    | 'NEW_COLUMN_VALUE';
  label: string;
  data: AnnotationData;
  isAiGenerated?: boolean;
  confidenceScore?: number;
  metadata?: Record<string, any>;
}

export interface Annotation {
  _id: string;
  csvImportId: string;
  userId?: string;
  csvRowIndex: number;
  fieldName: string;
  type: string;
  label: string;
  data: AnnotationData;
  isAiGenerated: boolean;
  confidenceScore?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationStats {
  totalRows: number;
  annotatedRows: number;
  totalAnnotations: number;
  annotationsByType: Record<string, number>;
  annotationsByField: Record<string, number>;
}

export class AnnotationsAPI {
  // Create a new annotation
  static async create(data: CreateAnnotationRequest): Promise<Annotation> {
    const response = await jsonApi.post('/annotations', data);
    return response.data;
  }

  // Get all annotations for the current user
  static async findAll(): Promise<Annotation[]> {
    const response = await jsonApi.get('/annotations');
    return response.data;
  }

  // Get a specific annotation by ID
  static async findOne(id: string): Promise<Annotation> {
    const response = await jsonApi.get(`/annotations/${id}`);
    return response.data;
  }

  // Get annotations for a specific CSV import
  static async findByCSVImport(csvImportId: string): Promise<Annotation[]> {
    const response = await jsonApi.get(`/annotations/csv/${csvImportId}`);
    return response.data;
  }

  // Get annotations for a specific CSV row
  static async findByCSVRow(
    csvImportId: string,
    rowIndex: number,
  ): Promise<Annotation[]> {
    const response = await jsonApi.get(
      `/annotations/csv/${csvImportId}/row/${rowIndex}`,
    );
    return response.data;
  }

  // Get annotations for a specific field
  static async findByField(
    csvImportId: string,
    fieldName: string,
  ): Promise<Annotation[]> {
    const response = await jsonApi.get(
      `/annotations/csv/${csvImportId}/field/${fieldName}`,
    );
    return response.data;
  }

  // Get annotation statistics for a CSV import
  static async getCSVStats(csvImportId: string): Promise<AnnotationStats> {
    const response = await jsonApi.get(`/annotations/csv/${csvImportId}/stats`);
    return response.data;
  }

  // Update an annotation
  static async update(
    id: string,
    data: Partial<CreateAnnotationRequest>,
  ): Promise<Annotation> {
    const response = await jsonApi.patch(`/annotations/${id}`, data);
    return response.data;
  }

  // Delete an annotation
  static async delete(id: string): Promise<void> {
    await jsonApi.delete(`/annotations/${id}`);
  }
}
