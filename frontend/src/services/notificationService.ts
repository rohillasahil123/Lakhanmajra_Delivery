import { API_BASE_URL } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';

export type AppNotification = {
  _id: string;
  title: string;
  body: string;
  audience: 'all' | 'selected';
  linkUrl?: string;
  imageUrl?: string;
  isRead?: boolean;
  readAt?: string | null;
  createdAt?: string;
};

export type NotificationListResult = {
  data: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await tokenManager.getToken();
  if (!token) {
    throw new Error('Please login first');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const parseJson = async (res: Response): Promise<any> => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export async function getMyNotifications(status: 'all' | 'unread' = 'all'): Promise<NotificationListResult> {
  const headers = await getAuthHeaders();
  const endpoint = `${API_BASE_URL}/api/notifications/me?status=${status}&limit=30`;

  const res = await fetch(endpoint, { method: 'GET', headers });
  const json = await parseJson(res);

  if (!res.ok) {
    throw new Error(json?.message || 'Failed to fetch notifications');
  }

  const payload = json?.data || {};
  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    total: Number(payload.total || 0),
    unreadCount: Number(payload.unreadCount || 0),
    page: Number(payload.page || 1),
    limit: Number(payload.limit || 30),
    hasMore: Boolean(payload.hasMore),
  };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const endpoint = `${API_BASE_URL}/api/notifications/${notificationId}/read`;

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers,
  });

  if (!res.ok) {
    const json = await parseJson(res);
    throw new Error(json?.message || 'Failed to mark notification as read');
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const headers = await getAuthHeaders();
  const endpoint = `${API_BASE_URL}/api/notifications/read-all`;

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers,
  });

  if (!res.ok) {
    const json = await parseJson(res);
    throw new Error(json?.message || 'Failed to mark all notifications as read');
  }
}
