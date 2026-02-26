import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../components/AppButton';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {OrderStatus, RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {assertValidTransition, getAllowedTransitions} from '../utils/orderStateMachine';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export const OrderDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {orderId} = route.params;
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await riderService.getOrderById(orderId);
        setOrder(result);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId]);

  const transition = async (nextStatus: OrderStatus) => {
    if (!order) {
      return;
    }

    try {
      assertValidTransition(order.status, nextStatus);
      setUpdating(true);
      const updated = await riderService.updateOrderStatus(order.id, nextStatus);
      setOrder(updated);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const openNavigation = async () => {
    if (!order) {
      return;
    }

    const address = `${order.deliveryAddress.line1}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.postalCode}`;
    const mapUrl = order.deliveryAddress.latitude && order.deliveryAddress.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    const canOpen = await Linking.canOpenURL(mapUrl);
    if (!canOpen) {
      setError('Unable to open map navigation');
      return;
    }

    await Linking.openURL(mapUrl);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>{error || 'Order not found'}</Text>
      </SafeAreaView>
    );
  }

  const [next] = getAllowedTransitions(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Order Detail</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>Order ID</Text>
        <Text style={styles.value}>{order.id}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{order.status}</Text>

        <Text style={styles.label}>Payment Type</Text>
        <Text style={styles.value}>{order.paymentType}</Text>

        <Text style={styles.label}>Customer Phone</Text>
        <Text style={styles.value}>{order.customer.phone}</Text>

        <Text style={styles.label}>Delivery Address</Text>
        <Text style={styles.value}>
          {order.deliveryAddress.line1}, {order.deliveryAddress.line2 ? `${order.deliveryAddress.line2}, ` : ''}
          {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
        </Text>
      </View>

      <AppButton title="Open in Google Maps" onPress={openNavigation} />
      {next ? (
        <View style={styles.spacedTop}>
          <AppButton
            title={`Mark as ${next}`}
            onPress={() => transition(next)}
            loading={updating}
          />
        </View>
      ) : null}
      <View style={styles.spacedTop}>
        <AppButton title="Back to Dashboard" onPress={() => navigation.navigate('Dashboard')} variant="secondary" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 6,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  value: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: palette.danger,
  },
  spacedTop: {
    marginTop: 8,
  },
});
