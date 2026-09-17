import { jsonApi } from '../api';

export interface SchemaChangeRequestResponse {
  _id: string;
  type: string;
  cloneId: { _id: string; name: string } | string;
  parentDatasetId: string;
  rowId?: string;
  field?: any;
  fieldName?: string;
  newFieldName?: string;
  newQuestionTitle?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: { _id: string; firstName: string; lastName: string; email: string } | any;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  choice?: 'PUSH_ALL' | 'KEEP_LOCAL';
  createdAt: string;
  updatedAt: string;
}

export const schemaRequestsAPI = {
  async create(body: {
    type: string;
    cloneId: string;
    rowId?: string;
    field?: any;
    fieldName?: string;
    newFieldName?: string;
    newQuestionTitle?: string;
  }): Promise<SchemaChangeRequestResponse> {
    const response = await jsonApi.post('/schema-requests', body);
    return response.data;
  },

  async getPending(): Promise<SchemaChangeRequestResponse[]> {
    const response = await jsonApi.get('/schema-requests/pending');
    return response.data;
  },

  async getByDataset(datasetId: string): Promise<SchemaChangeRequestResponse[]> {
    const response = await jsonApi.get(`/schema-requests/dataset/${datasetId}`);
    return response.data;
  },

  async approve(
    requestId: string,
    body: { choice: 'PUSH_ALL' | 'KEEP_LOCAL'; reviewNote?: string }
  ): Promise<SchemaChangeRequestResponse> {
    const response = await jsonApi.post(`/schema-requests/${requestId}/approve`, body);
    return response.data;
  },

  async reject(
    requestId: string,
    body: { reviewNote?: string }
  ): Promise<SchemaChangeRequestResponse> {
    const response = await jsonApi.post(`/schema-requests/${requestId}/reject`, body);
    return response.data;
  },
};
