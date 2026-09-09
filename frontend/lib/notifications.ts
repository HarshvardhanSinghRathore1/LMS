import { apiClient } from './api';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ACTION_REQUIRED'
  | 'ACHIEVEMENT';

export interface NotificationItem {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export async function getNotifications(
  filters: NotificationFilters = {}
): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();
  if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
  if (filters.type) params.append('type', filters.type);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const res = await apiClient.get(`/notifications?${params.toString()}`);
  return res.data.data;
}

export async function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data.data;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const res = await apiClient.patch(`/notifications/${id}/read`);
  return res.data.data;
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  const res = await apiClient.patch('/notifications/mark-all-read');
  return res.data.data;
}

export async function deleteNotification(id: string): Promise<{ deleted: boolean }> {
  const res = await apiClient.delete(`/notifications/${id}`);
  return res.data.data;
}
