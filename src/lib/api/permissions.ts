import { jsonApi } from '../api';

export interface FieldPermissionResponse {
  _id: string;
  datasetId: string;
  fieldId: string;
  groupId?: string;
  userId: string;
  permissions: Record<string, boolean>;
  source: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export const permissionsAPI = {
  async request(body: {
    datasetId: string;
    fieldId: string;
    groupId?: string;
    action: string;
    note?: string;
  }): Promise<any> {
    const response = await jsonApi.post('/permission/request', body);
    return response.data;
  },

  async approve(requestId: string, reviewNote?: string): Promise<any> {
    const response = await jsonApi.post('/permission/approve', { requestId, reviewNote });
    return response.data;
  },

  async reject(requestId: string, reviewNote?: string): Promise<any> {
    const response = await jsonApi.post('/permission/reject', { requestId, reviewNote });
    return response.data;
  },

  async getFieldPermissions(datasetId: string): Promise<FieldPermissionResponse[]> {
    const response = await jsonApi.get(`/permission/field/${datasetId}`);
    return response.data;
  },

  async revoke(permissionId: string): Promise<void> {
    await jsonApi.post(`/permission/revoke/${permissionId}`);
  },
};
