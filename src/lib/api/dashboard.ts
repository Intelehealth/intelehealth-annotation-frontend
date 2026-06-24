import { jsonApi } from '../api';

// Dashboard API endpoints
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const [datasets, annotations] = await Promise.all([
        jsonApi.get('/datasets'),
        jsonApi.get('/annotations'),
      ]);

      return {
        totalDatasets: datasets.data.length,
        totalAnnotations: annotations.data.length,
        // Calculate completion rate based on annotations
        completionRate:
          annotations.data.length > 0
            ? Math.round(
                (annotations.data.filter((a: any) => a.isAiGenerated).length /
                  annotations.data.length) *
                  100,
              )
            : 0,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalDatasets: 0,
        totalAnnotations: 0,
        completionRate: 0,
      };
    }
  },

  // Get recent datasets
  getRecentDatasets: async (limit = 5) => {
    const response = await jsonApi.get('/datasets');
    return response.data
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  },

  // Get recent annotations
  getRecentAnnotations: async (limit = 10) => {
    const response = await jsonApi.get('/annotations');
    return response.data
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  },

  // Get annotation statistics for a specific CSV import
  getAnnotationStats: async (csvImportId: string) => {
    const response = await jsonApi.get(`/annotations/csv/${csvImportId}/stats`);
    return response.data;
  },

  // Get all CSV imports with their status
  getAllCSVImports: async () => {
    try {
      const datasets = await jsonApi.get('/datasets');
      const csvImports = [];

      for (const dataset of datasets.data) {
        try {
          const imports = await jsonApi.get(
            `/csv-processing/dataset/${dataset._id}/imports`,
          );
          csvImports.push(
            ...imports.data.map((imp: any) => ({
              ...imp,
              datasetName: dataset.name,
              datasetId: dataset._id,
            })),
          );
        } catch (error) {
          console.error(
            `Error fetching imports for dataset ${dataset._id}:`,
            error,
          );
        }
      }

      return csvImports;
    } catch (error) {
      console.error('Error fetching CSV imports:', error);
      return [];
    }
  },

  // Get activity feed
  getActivityFeed: async (limit = 20) => {
    try {
      const [datasets, annotations] = await Promise.all([
        jsonApi.get('/datasets'),
        jsonApi.get('/annotations'),
      ]);

      const activities: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: string;
        datasetId?: string;
        csvImportId?: string;
      }> = [];

      // Add dataset creation activities
      datasets.data.forEach((dataset: any) => {
        activities.push({
          id: `dataset-${dataset._id}`,
          type: 'dataset_created',
          title: 'Dataset Created',
          description: `Created dataset "${dataset.name}"`,
          timestamp: dataset.createdAt,
          datasetId: dataset._id,
        });
      });

      // Add annotation activities
      annotations.data.forEach((annotation: any) => {
        activities.push({
          id: `annotation-${annotation._id}`,
          type: 'annotation_created',
          title: 'Annotation Added',
          description: `Added ${annotation.type} annotation for field "${annotation.fieldName}"`,
          timestamp: annotation.createdAt,
          csvImportId: annotation.csvImportId,
        });
      });

      return activities
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  },
};
