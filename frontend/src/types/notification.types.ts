/**
 * Notification Type Definitions
 * Represents user notifications
 */

export type NotificationType = 'order' | 'delivery' | 'offer' | 'system' | 'promotion' | 'alert';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  _id?: string;
  id?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  icon?: string;
  image?: string;
  actionUrl?: string;
  metadata?: {
    orderId?: string;
    offerId?: string;
    riderId?: string;
    [key: string]: any;
  };
  createdAt?: string;
  readAt?: string;
  archivedAt?: string;
}

export interface NotificationFilters {
  status?: NotificationStatus;
  type?: NotificationType;
  limit?: number;
  skip?: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  limit: number;
  skip: number;
}

export interface NotificationCountResponse {
  unreadCount: number;
  readCount: number;
  total: number;
}

export interface NotificationUpdate {
  status?: NotificationStatus;
}
