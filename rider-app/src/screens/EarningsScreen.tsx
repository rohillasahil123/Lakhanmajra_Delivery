import React, {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FunctionBar} from '../components/FunctionBar';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {EarningsSummary, RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;
type EarningsTab = 'summary' | 'delivered';

export const EarningsScreen: React.FC<Props> = ({route, navigation}) => {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [deliveredOrders, setDeliveredOrders] = useState<RiderOrder[]>([]);
  const [activeTab, setActiveTab] = useState<EarningsTab>(route.params?.initialTab || 'summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [summary, orders] = await Promise.all([riderService.getEarnings(), riderService.getOrders()]);
        setEarnings(summary);
        setDeliveredOrders(
          orders
            .filter((order) => order.status === 'Delivered')
            .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))
        );
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.brandOrange}>Gramin</Text>
        <Text style={styles.brandGreen}> Delivery Rider</Text>
      </View>
      <Text style={styles.title}>Rider Earnings</Text>
      <Text style={styles.subtitle}>Track payouts and review delivered orders in one place.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'summary' && styles.activeTabButton]}
          onPress={() => setActiveTab('summary')}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>Summary</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'delivered' && styles.activeTabButton]}
          onPress={() => setActiveTab('delivered')}>
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.activeTabText]}>Delivered</Text>
        </Pressable>
      </View>

      {activeTab === 'summary' ? (
        <View style={styles.card}>
          <Text style={styles.label}>Today</Text>
          <Text style={styles.value}>
            {earnings?.currency} {earnings?.today ?? 0}
          </Text>

          <Text style={styles.label}>Weekly</Text>
          <Text style={styles.value}>
            {earnings?.currency} {earnings?.weekly ?? 0}
          </Text>

          <Text style={styles.label}>Pending Payouts</Text>
          <Text style={styles.value}>
            {earnings?.currency} {earnings?.pendingPayouts ?? 0}
          </Text>
        </View>
      ) : (
        <FlatList
          data={deliveredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.deliveredList}
          ListEmptyComponent={<Text style={styles.emptyText}>No delivered orders available.</Text>}
          renderItem={({item}) => (
            <Pressable
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderDetail', {orderId: item.id})}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{item.id.slice(-6)}</Text>
                <Text style={styles.orderAmount}>₹{item.amount.toFixed(2)}</Text>
              </View>
              <Text style={styles.orderMeta}>{item.customer.name}</Text>
              <Text style={styles.orderMeta}>
                {item.deliveryAddress.city}, {item.deliveryAddress.state}
              </Text>
            </Pressable>
          )}
        />
      )}

      <FunctionBar
        active={activeTab === 'delivered' ? 'delivered' : 'earnings'}
        onOpenEarnings={() => setActiveTab('summary')}
        onOpenDelivered={() => setActiveTab('delivered')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -2,
  },
  brandOrange: {
    color: palette.accent,
    fontWeight: '800',
  },
  brandGreen: {
    color: palette.primary,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: -6,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  tabText: {
    color: palette.textSecondary,
    fontWeight: '700',
  },
  activeTabText: {
    color: palette.card,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderColor: palette.border,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  value: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  error: {
    color: palette.danger,
  },
  deliveredList: {
    paddingBottom: 12,
    gap: 10,
  },
  orderCard: {
    backgroundColor: palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  orderAmount: {
    color: palette.primary,
    fontWeight: '800',
  },
  orderMeta: {
    color: palette.textSecondary,
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
