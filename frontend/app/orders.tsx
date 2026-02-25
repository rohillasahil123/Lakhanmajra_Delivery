import { ThemedText } from '@/components/themed-text';
import { resolveImageUrl } from '@/config/api';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { getMyOrdersApi, OrderRow } from '@/services/orderService';

const getStatusTone = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'delivered') return { bg: '#DCFCE7', text: '#166534' };
  if (normalized === 'cancelled') return { bg: '#FEE2E2', text: '#991B1B' };
  if (normalized === 'shipped' || normalized === 'confirmed' || normalized === 'processing') {
    return { bg: '#DBEAFE', text: '#1E40AF' };
  }
  return { bg: '#FEF3C7', text: '#92400E' };
};

export default function OrdersScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = String(params.filter || 'all').toLowerCase();

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

  const visibleOrders =
    filter === 'delivered'
      ? orders.filter((order) => String(order.status || '').toLowerCase() === 'delivered')
      : orders;

  const pageTitle = filter === 'delivered' ? 'Delivered Products' : 'My Orders';
  const totalProducts = visibleOrders.reduce(
    (sum, order) => sum + (order.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0),
    0
  );
  const totalSpend = visibleOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  if (visibleOrders.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{pageTitle}</ThemedText>
        <ThemedText style={styles.subtitle}>No products found for this section.</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <View style={styles.heroCard}>
          <ThemedText style={styles.title}>{pageTitle}</ThemedText>
          <ThemedText style={styles.subtitle}>Track your order history and purchased products</ThemedText>

          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <ThemedText style={styles.summaryLabel}>Orders</ThemedText>
              <ThemedText style={styles.summaryValue}>{visibleOrders.length}</ThemedText>
            </View>
            <View style={styles.summaryChip}>
              <ThemedText style={styles.summaryLabel}>Products</ThemedText>
              <ThemedText style={styles.summaryValue}>{totalProducts}</ThemedText>
            </View>
            <View style={styles.summaryChip}>
              <ThemedText style={styles.summaryLabel}>Spent</ThemedText>
              <ThemedText style={styles.summaryValue}>₹{Math.round(totalSpend)}</ThemedText>
            </View>
          </View>
        </View>

        {visibleOrders.map((order) => {
          const tone = getStatusTone(order.status);

          return (
            <View key={order._id} style={styles.card}>
              <View style={styles.orderTopRow}>
                <View>
                  <ThemedText style={styles.orderId}>Order #{order._id.slice(-8).toUpperCase()}</ThemedText>
                  <ThemedText style={styles.orderDate}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                  </ThemedText>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                  <ThemedText style={[styles.statusText, { color: tone.text }]}>
                    {String(order.status || 'pending').toUpperCase()}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.amountRow}>
                <ThemedText style={styles.amountLabel}>Total Amount</ThemedText>
                <ThemedText style={styles.amountValue}>₹{order.totalAmount}</ThemedText>
              </View>

              <View style={styles.itemsBlock}>
                <ThemedText style={styles.itemsTitle}>Products</ThemedText>
                {(order.items || []).map((item, idx) => {
                  const productObj = typeof item.productId === 'object' && item.productId ? item.productId : null;
                  const productName = productObj?.name || 'Product';

                  const rawImage =
                    (Array.isArray(productObj?.images) && productObj.images.length > 0
                      ? productObj.images[0]
                      : productObj?.image) || '';
                  const imageUrl = resolveImageUrl(rawImage);

                  const unitText = productObj?.unitType || productObj?.unit || 'piece';
                  const categoryText = productObj?.category || productObj?.categoryName || '';
                  const linePrice = (item.price || 0) * (item.quantity || 0);

                  return (
                    <View key={`${order._id}-${idx}`} style={styles.productRow}>
                      <View style={styles.productImageWrap}>
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                        ) : (
                          <ThemedText style={styles.productImageFallback}>🛍️</ThemedText>
                        )}
                      </View>

                      <View style={styles.productInfo}>
                        <ThemedText style={styles.productName} numberOfLines={2}>{productName}</ThemedText>
                        <ThemedText style={styles.productMeta}>
                          {unitText}{categoryText ? ` · ${categoryText}` : ''}
                        </ThemedText>
                        <ThemedText style={styles.productMeta}>Qty: {item.quantity} · ₹{item.price} each</ThemedText>
                        <ThemedText style={styles.productTotal}>Line Total: ₹{linePrice}</ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F8' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  list: { flex: 1, backgroundColor: '#F4F6F8' },
  listContent: { padding: 14, paddingBottom: 26 },
  heroCard: {
    backgroundColor: '#0E7A3D',
    borderRadius: 16,
    padding: 14,
    marginTop: 40,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#D1FAE5', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  summaryLabel: { fontSize: 11, color: '#D1FAE5', marginBottom: 2 },
  summaryValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '800' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  orderTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  amountRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: { fontSize: 12, color: '#6B7280' },
  amountValue: { fontSize: 18, color: '#0E7A3D', fontWeight: '800' },
  itemsBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#EDF2F7', paddingTop: 10 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EEF5',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  productImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageFallback: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  productMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  productTotal: {
    fontSize: 12,
    color: '#0E7A3D',
    fontWeight: '700',
  },
  orderId: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 3 },
  orderText: { fontSize: 13, color: '#374151', marginBottom: 4 },
  orderDate: { fontSize: 12, color: '#6B7280' },
});