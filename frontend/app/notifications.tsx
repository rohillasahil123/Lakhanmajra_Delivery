import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/config/api';
import {
  AppNotification,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notificationService';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function NotificationsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getMyNotifications('all');
      setRows(result.data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const openNotification = async (row: AppNotification) => {
    try {
      if (!row.isRead) {
        await markNotificationAsRead(String(row._id));
        setRows((prev) => prev.map((item) => (item._id === row._id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)));
      }

      if (row.linkUrl?.trim()) {
        Alert.alert('Open Link', row.linkUrl.trim());
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to open notification');
    }
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setRows((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = rows.filter((r) => !r.isRead).length;
  let content: React.ReactNode = rows.map((row) => (
    <TouchableOpacity
      key={row._id}
      style={[styles.card, !row.isRead && styles.unreadCard]}
      onPress={() => openNotification(row)}
    >
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{row.title}</ThemedText>
        {!row.isRead && <View style={styles.unreadDot} />}
      </View>
      <ThemedText style={styles.cardBody}>{row.body}</ThemedText>
      {row.imageUrl?.trim() ? (
        <Image
          source={{ uri: resolveImageUrl(row.imageUrl.trim()) }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.metaRow}>
        <ThemedText style={styles.metaText}>
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Just now'}
        </ThemedText>
        <ThemedText style={styles.metaText}>{row.isRead ? 'Read' : 'Unread'}</ThemedText>
      </View>
    </TouchableOpacity>
  ));

  if (loading) {
    content = <ThemedText style={styles.emptyText}>Loading notifications...</ThemedText>;
  } else if (rows.length === 0) {
    content = <ThemedText style={styles.emptyText}>No notifications yet.</ThemedText>;
  }

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.title}>Notifications</ThemedText>

        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} disabled={markingAll || rows.length === 0}>
          <ThemedText style={styles.markAllText}>{markingAll ? 'Saving...' : 'Mark all read'}</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <ThemedText style={styles.summaryText}>Unread: {unreadCount}</ThemedText>
        <TouchableOpacity onPress={() => load().catch(() => {})}>
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  backText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
  },
  markAllText: {
    color: '#4338CA',
    fontWeight: '600',
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
  },
  refreshText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
  },
  unreadCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    paddingRight: 8,
  },
  cardBody: {
    marginTop: 6,
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
  cardImage: {
    marginTop: 10,
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: '#2563EB',
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#6B7280',
    fontSize: 11,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
