import { ThemedText } from '@/components/themed-text';
import { authService } from '@/services/authService';
import { getMyOrdersApi, OrderRow } from '@/services/orderService';
import useCart from '@/stores/cartStore';
import { User } from '@/types/auth.types';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type ProfileTab = 'overview' | 'success';

const SUCCESS_STATUSES = new Set(['delivered']);

export default function ProfileScreen() {
  const router = useRouter();
  const resetLocalCart = useCart((s) => s.resetLocal);
  const cartItems = useCart((s) => s.items);
  const hydrateLocal = useCart((s) => s.hydrateLocal);
  const syncFromServer = useCart((s) => s.syncFromServer);
  const initialized = useCart((s) => s.initialized);

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!initialized) await hydrateLocal();
        await syncFromServer();

        const storedUser = await authService.getStoredUser();
        if (storedUser) setUser(storedUser as User);

        const freshUser = await authService.getUser();
        if (freshUser) setUser(freshUser);

        const myOrders = await getMyOrdersApi();
        setOrders(Array.isArray(myOrders) ? myOrders : []);
      } catch {
        // keep UI resilient
      } finally {
        setLoading(false);
      }
    })();
  }, [initialized, hydrateLocal, syncFromServer]);

  const cartProductCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalOrderedProductCount = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum + (order.items || []).reduce((inner, item) => inner + (item.quantity || 0), 0),
        0
      ),
    [orders]
  );

  const successfulOrders = useMemo(
    () => orders.filter((order) => SUCCESS_STATUSES.has(String(order.status || '').toLowerCase())),
    [orders]
  );

  const successfulOrderedProductCount = useMemo(
    () =>
      successfulOrders.reduce(
        (sum, order) =>
          sum + (order.items || []).reduce((inner, item) => inner + (item.quantity || 0), 0),
        0
      ),
    [successfulOrders]
  );

  const successfulItems = useMemo(
    () =>
      successfulOrders.flatMap((order) =>
        (order.items || []).map((item) => ({
          orderId: order._id,
          quantity: item.quantity || 0,
          price: item.price || 0,
          productName:
            typeof item.productId === 'object' && item.productId
              ? (item.productId as any).name || 'Product'
              : 'Product',
          createdAt: order.createdAt,
        }))
      ),
    [successfulOrders]
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            await resetLocalCart();
            router.replace('/signup');
          } catch (error: any) {
            Alert.alert('Logout Failed', error?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <ThemedText style={styles.title}>My Profile</ThemedText>

        {loading ? (
          <ThemedText style={styles.subtitle}>Loading profile...</ThemedText>
        ) : user ? (
          <>
            <View style={styles.card}>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Name</ThemedText>
                <ThemedText style={styles.value}>{user.name || '-'}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <ThemedText style={styles.value}>{user.email || '-'}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Phone</ThemedText>
                <ThemedText style={styles.value}>{user.phone || '-'}</ThemedText>
              </View>
            </View>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
                onPress={() => setActiveTab('overview')}
              >
                <ThemedText style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                  Overview
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'success' && styles.tabButtonActive]}
                onPress={() => setActiveTab('success')}
              >
                <ThemedText style={[styles.tabText, activeTab === 'success' && styles.tabTextActive]}>
                  Success
                </ThemedText>
              </TouchableOpacity>
            </View>

            {activeTab === 'overview' ? (
              <View style={styles.statsWrap}>
                <View style={styles.statCard}>
                  <ThemedText style={styles.statLabel}>Total Ordered Products</ThemedText>
                  <ThemedText style={styles.statValue}>{totalOrderedProductCount}</ThemedText>
                </View>

                <View style={styles.statCard}>
                  <ThemedText style={styles.statLabel}>Products In Cart</ThemedText>
                  <ThemedText style={styles.statValue}>{cartProductCount}</ThemedText>
                </View>

                <View style={styles.statCard}>
                  <ThemedText style={styles.statLabel}>Successfully Delivered</ThemedText>
                  <ThemedText style={styles.statValue}>{successfulOrderedProductCount}</ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.successCard}>
                <ThemedText style={styles.successTitle}>Successful Purchased Products</ThemedText>

                {successfulItems.length === 0 ? (
                  <ThemedText style={styles.subtitle}>No successful delivered products yet.</ThemedText>
                ) : (
                  successfulItems.map((item, idx) => (
                    <View key={`${item.orderId}-${idx}`} style={styles.successRow}>
                      <ThemedText style={styles.successName}>{item.productName}</ThemedText>
                      <ThemedText style={styles.successMeta}>Qty: {item.quantity} · ₹{item.price}</ThemedText>
                      <ThemedText style={styles.successMetaSmall}>
                        Order: #{item.orderId.slice(-8).toUpperCase()}
                      </ThemedText>
                      <ThemedText style={styles.successMetaSmall}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        ) : (
          <ThemedText style={styles.subtitle}>Please login to view your profile details.</ThemedText>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingVertical: 40 },
  contentContainer: { padding: 18, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 14 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 8,
  },
  row: { marginBottom: 10 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  value: { fontSize: 15, color: '#111827', fontWeight: '600' },

  tabRow: { flexDirection: 'row', marginTop: 14, marginBottom: 10, gap: 10 },
  tabButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: '#0E7A3D' },
  tabText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  statsWrap: { gap: 10 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 22, color: '#111827', fontWeight: '700' },

  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 10,
  },
  successName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  successMeta: { fontSize: 13, color: '#374151', marginTop: 3 },
  successMetaSmall: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  logoutButton: {
    marginTop: 20,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
