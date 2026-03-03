import React, {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FunctionBar} from '../components/FunctionBar';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveredOrders'>;

export const DeliveredOrdersScreen: React.FC<Props> = ({navigation}) => {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetched = await riderService.getOrders();
        const delivered = fetched
          .filter((order) => order.status === 'Delivered')
          .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
        setOrders(delivered);
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
      <Text style={styles.title}>Delivered Orders</Text>
      <Text style={styles.subtitle}>All completed deliveries are listed here.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No delivered orders yet.</Text>}
        renderItem={({item}) => (
          <Pressable style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', {orderId: item.id})}>
            <View style={styles.orderTopRow}>
              <Text style={styles.orderId}>#{item.id.slice(-6)}</Text>
              <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
            </View>
            <Text style={styles.meta}>{item.customer.name}</Text>
            <Text style={styles.meta}>
              {item.deliveryAddress.city}, {item.deliveryAddress.state}
            </Text>
            <Text style={styles.metaSmall}>Delivered on {new Date(item.updatedAt).toLocaleString()}</Text>
          </Pressable>
        )}
      />

      <FunctionBar active="delivered" />
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
    backgroundColor: palette.background,
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: -6,
  },
  listContent: {
    paddingBottom: 10,
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
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  amount: {
    color: palette.primary,
    fontWeight: '800',
  },
  meta: {
    color: palette.textSecondary,
  },
  metaSmall: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  error: {
    color: palette.danger,
  },
});
