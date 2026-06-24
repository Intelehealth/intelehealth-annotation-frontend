import { jsonApi } from '../api';

export interface NotificationResponse {
  _id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsAPI = {
  async getAll(): Promise<NotificationResponse[]> {
    const response = await jsonApi.get('/notifications');
    return response.data;
  },

  async markAsRead(id: string): Promise<NotificationResponse> {
    const response = await jsonApi.patch(`/notifications/${id}/read`);
    return response.data;
  },
};
