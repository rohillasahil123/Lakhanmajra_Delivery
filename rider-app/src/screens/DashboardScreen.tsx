import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../components/AppButton';
import {FunctionBar} from '../components/FunctionBar';
import {OrderCard} from '../components/OrderCard';
import {useRiderAuth} from '../context/RiderAuthContext';
import {useBackgroundLocation} from '../hooks/useBackgroundLocation';
import {useSocketConnection} from '../hooks/useSocketConnection';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {OrderStatus, RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {assertValidTransition, getAllowedTransitions} from '../utils/orderStateMachine';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const ONGOING_STATUSES: OrderStatus[] = ['Accepted', 'Picked', 'OutForDelivery'];

export const DashboardScreen: React.FC<Props> = ({navigation}) => {
  const {session, setOnlineState} = useRiderAuth();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUpdating, setOnlineUpdating] = useState(false);
  const [transitionLoadingOrderId, setTransitionLoadingOrderId] = useState<string | null>(null);
  const [newOrderModal, setNewOrderModal] = useState<RiderOrder | null>(null);
  const knownAssignedOrderIdsRef = React.useRef<Set<string>>(new Set());

  const online = session?.rider.online ?? false;
  const token = session?.accessToken ?? null;

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetched = await riderService.getOrders();
      setOrders(fetched);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  React.useEffect(() => {
    const assignedIds = orders
      .filter((order) => order.status === 'Assigned')
      .map((order) => order.id);
    knownAssignedOrderIdsRef.current = new Set(assignedIds);
  }, [orders]);

  React.useEffect(() => {
    if (!online) {
      return;
    }

    const poll = async () => {
      try {
        const fetched = await riderService.getOrders();

        const previous = knownAssignedOrderIdsRef.current;
        const assignedNow = fetched.filter((order) => order.status === 'Assigned');
        const freshAssigned = assignedNow.find((order) => !previous.has(order.id));

        knownAssignedOrderIdsRef.current = new Set(assignedNow.map((order) => order.id));
        setOrders(fetched);

        if (freshAssigned) {
          setNewOrderModal(freshAssigned);
        }
      } catch {
        // non-blocking background polling
      }
    };

    const interval = setInterval(() => {
      poll().catch(() => {});
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [online]);

  const handleOrderAssigned = useCallback((order: RiderOrder) => {
    setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)]);
    setNewOrderModal(order);
  }, []);

  const handleOrderUpdated = useCallback((order: RiderOrder) => {
    setOrders((prev) => prev.map((item) => (item.id === order.id ? order : item)));
  }, []);

  useSocketConnection({
    enabled: online,
    token,
    onOrderAssigned: handleOrderAssigned,
    onOrderUpdated: handleOrderUpdated,
  });

  const {locationError} = useBackgroundLocation(online);

  const assignedOrders = useMemo(
    () => orders.filter((order) => order.status === 'Assigned'),
    [orders]
  );
  const ongoingOrders = useMemo(
    () => orders.filter((order) => ONGOING_STATUSES.includes(order.status)),
    [orders]
  );
  const activeCount = assignedOrders.length + ongoingOrders.length;

  const handleOnlineToggle = async (value: boolean) => {
    try {
      setOnlineUpdating(true);
      await riderService.updateOnlineStatus(value);
      setOnlineState(value);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setOnlineUpdating(false);
    }
  };

  const applyTransition = async (order: RiderOrder, nextStatus: OrderStatus) => {
    try {
      assertValidTransition(order.status, nextStatus);
      setTransitionLoadingOrderId(order.id);
      const updated = await riderService.updateOrderStatus(order.id, nextStatus);
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setTransitionLoadingOrderId(null);
    }
  };

  const openOrderLocation = async (order: RiderOrder) => {
    const address = `${order.deliveryAddress.line1}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.postalCode}`;
    navigation.navigate('InAppMap', {
      orderId: order.id,
      destinationLat: order.deliveryAddress.latitude,
      destinationLng: order.deliveryAddress.longitude,
      address,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandOrange}>Gramin</Text>
            <Text style={styles.brandGreen}> Delivery Rider</Text>
          </View>
          <Text style={styles.title}>Rider Dashboard</Text>
          <Text style={styles.subtitle}>Manage your live delivery operations</Text>
        </View>
        <View style={styles.onlineRow}>
          <Text style={styles.onlineLabel}>{online ? 'Online' : 'Offline'}</Text>
          <Switch value={online} onValueChange={handleOnlineToggle} disabled={onlineUpdating} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Active</Text>
          <Text style={styles.summaryValue}>{activeCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>New</Text>
          <Text style={styles.summaryValue}>{assignedOrders.length}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>New Assigned Orders</Text>
      </View>
      <FlatList
        data={assignedOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No new assigned orders</Text>}
        renderItem={({item}) => (
          <OrderCard
            order={item}
            primaryActionLabel="Accept"
            secondaryActionLabel="Reject"
            onPrimaryAction={() => applyTransition(item, 'Accepted')}
            onSecondaryAction={() => applyTransition(item, 'Rejected')}
            onOpenLocation={() => openOrderLocation(item)}
            onOpenDetail={() => navigation.navigate('OrderDetail', {orderId: item.id})}
            actionLoading={transitionLoadingOrderId === item.id}
          />
        )}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ongoing Orders</Text>
      </View>
      <FlatList
        data={ongoingOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No ongoing orders</Text>}
        renderItem={({item}) => {
          const [next] = getAllowedTransitions(item.status);
          return (
            <OrderCard
              order={item}
              primaryActionLabel={next ?? undefined}
              onPrimaryAction={next ? () => applyTransition(item, next) : undefined}
              onOpenLocation={() => openOrderLocation(item)}
              onOpenDetail={() => navigation.navigate('OrderDetail', {orderId: item.id})}
              actionLoading={transitionLoadingOrderId === item.id}
            />
          );
        }}
      />

      <FunctionBar active="home" />

      <Modal visible={Boolean(newOrderModal)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Order Assigned</Text>
            <Text style={styles.modalText}>Order ID: {newOrderModal?.id}</Text>
            <Text style={styles.modalText}>Customer: {newOrderModal?.customer.name}</Text>
            <Text style={styles.modalText}>
              Address: {newOrderModal?.deliveryAddress.line1}, {newOrderModal?.deliveryAddress.city}
            </Text>
            {newOrderModal ? (
              <AppButton title="Open Location" onPress={() => openOrderLocation(newOrderModal)} variant="secondary" />
            ) : null}
            <AppButton title="Dismiss" onPress={() => setNewOrderModal(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 12,
    marginTop: 25,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'center',
  },
  header: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginBottom: 2,
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
    marginTop: 2,
    fontSize: 13,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 2,
    color: palette.textPrimary,
    fontWeight: '800',
    fontSize: 20,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  listContainer: {
    paddingBottom: 6,
  },
  emptyText: {
    color: palette.textSecondary,
    marginBottom: 8,
  },
  error: {
    color: palette.danger,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  modalText: {
    color: palette.textSecondary,
  },
});
