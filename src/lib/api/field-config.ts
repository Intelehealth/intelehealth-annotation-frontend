import { jsonApi } from '../api';
import { FieldGroup } from '@/types/feature1';

// Field Selection API endpoints
export const fieldSelectionAPI = {
  // Save annotation field configuration
  saveFieldSelection: async (data: {
    csvImportId: string;
    annotationFields: {
      csvColumnName: string;
      fieldName: string;
      fieldType: string;
      isRequired: boolean;
      isMetadataField: boolean;
      options?: string[];
      instructions?: string;
    }[];
  }) => {
    const response = await jsonApi.post('/field-selection', data);
    return response.data;
  },

  // Get field selection configuration for a CSV import
  getFieldSelection: async (csvImportId: string) => {
    const response = await jsonApi.get(`/field-selection/${csvImportId}`);
    return response.data;
  },

  // Start annotation process
  startAnnotation: async (csvImportId: string) => {
    const response = await jsonApi.post(
      `/field-selection/${csvImportId}/start`,
    );
    return response.data;
  },

  // Get annotation progress
  getAnnotationProgress: async (csvImportId: string) => {
    const response = await jsonApi.get(
      `/field-selection/${csvImportId}/progress`,
    );
    return response.data;
  },

  // Get CSV columns for a specific CSV import
  getCSVColumns: async (csvImportId: string) => {
    const response = await jsonApi.get(
      `/csv-processing/columns/${csvImportId}`,
    );
    return response.data;
  },

  // Get CSV import status (includes columns)
  getCSVImportStatus: async (csvImportId: string) => {
    const response = await jsonApi.get(`/csv-processing/status/${csvImportId}`);
    return response.data;
  },

  // Dataset-level configuration methods
  saveDatasetFieldConfig: async (data: {
    datasetId: string;
    annotationFields: {
      csvColumnName: string;
      fieldName: string;
      fieldType: string;
      isRequired: boolean;
      isAnnotationField: boolean;
      isPrimaryKey?: boolean;
      options?: string[];
      isNewColumn?: boolean;
      newColumnId?: string;
      columnType?: string;
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
      branching?: any;
    }[];
    annotationLabels: {
      name: string;
      color: string;
      description?: string;
      hotkey?: string;
    }[];
    newColumns: {
      id: string;
      columnName: string;
      columnType: string;
      isRequired: boolean;
      defaultValue?: string;
      options?: string[];
      placeholder?: string;
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
      validation?: {
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: string;
      };
      branching?: any;
    }[];
    fieldGroups?: FieldGroup[];
  }) => {
    const response = await jsonApi.post(
      `/field-selection/dataset/${data.datasetId}`,
      {
        datasetId: data.datasetId,
        annotationFields: data.annotationFields,
        annotationLabels: data.annotationLabels,
        newColumns: data.newColumns,
        fieldGroups: data.fieldGroups || [],
      },
    );
    return response.data;
  },

  getDatasetFieldConfig: async (datasetId: string) => {
    const response = await jsonApi.get(`/field-selection/dataset/${datasetId}`);
    return response.data;
  },

  getExpandedFields: async (datasetId: string) => {
    const response = await jsonApi.get(`/field-selection/dataset/${datasetId}/expanded`);
    return response.data;
  },

  checkDatasetFieldConfig: async (
    datasetId: string,
  ): Promise<{ hasConfig: boolean; config?: any }> => {
    const response = await jsonApi.get(
      `/field-selection/dataset/${datasetId}/check`,
    );
    return response.data;
  },

  getDatasetCSVImports: async (datasetId: string) => {
    const response = await jsonApi.get(
      `/csv-processing/dataset/${datasetId}/imports`,
    );
    return response.data;
  },
};
