import { ThemedText } from '@/components/themed-text';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { getMyOrdersApi, OrderRow } from '@/services/orderService';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getMyOrdersApi();
        setOrders(rows || []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0E7A3D" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>My Orders</ThemedText>
        <ThemedText style={styles.subtitle}>You have no orders yet. Start shopping!</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      <ThemedText style={styles.title}>My Orders</ThemedText>
      {orders.map((order) => (
        <View key={order._id} style={styles.card}>
          <ThemedText style={styles.orderId}>Order: {order._id.slice(-8).toUpperCase()}</ThemedText>
          <ThemedText style={styles.orderText}>Status: {order.status}</ThemedText>
          <ThemedText style={styles.orderText}>Amount: ₹{order.totalAmount}</ThemedText>
          <ThemedText style={styles.orderDate}>
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
          </ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  list: { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderId: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  orderText: { fontSize: 13, color: '#374151', marginBottom: 4 },
  orderDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});