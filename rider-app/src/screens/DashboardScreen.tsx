import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../components/AppButton';
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
  const {session, logout, setOnlineState} = useRiderAuth();
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

  useSocketConnection({
    enabled: online,
    token,
    onOrderAssigned: (order) => {
      setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)]);
      setNewOrderModal(order);
    },
    onOrderUpdated: (order) => {
      setOrders((prev) => prev.map((item) => (item.id === order.id ? order : item)));
    },
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
        <Text style={styles.title}>Rider Dashboard</Text>
        <View style={styles.onlineRow}>
          <Text style={styles.onlineLabel}>{online ? 'Online' : 'Offline'}</Text>
          <Switch value={online} onValueChange={handleOnlineToggle} disabled={onlineUpdating} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>New Assigned Orders</Text>
      </View>
      <FlatList
        data={assignedOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No assigned orders</Text>}
        renderItem={({item}) => (
          <OrderCard
            order={item}
            primaryActionLabel="Accept"
            secondaryActionLabel="Reject"
            onPrimaryAction={() => applyTransition(item, 'Accepted')}
            onSecondaryAction={() => applyTransition(item, 'Rejected')}
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
              onOpenDetail={() => navigation.navigate('OrderDetail', {orderId: item.id})}
              actionLoading={transitionLoadingOrderId === item.id}
            />
          );
        }}
      />

      <View style={styles.footerActions}>
        <AppButton title="Earnings" onPress={() => navigation.navigate('Earnings')} />
        <AppButton title="Logout" onPress={logout} variant="danger" />
      </View>

      <Modal visible={Boolean(newOrderModal)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Order Assigned</Text>
            <Text style={styles.modalText}>Order ID: {newOrderModal?.id}</Text>
            <Text style={styles.modalText}>Customer: {newOrderModal?.customer.name}</Text>
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
    fontSize: 22,
    fontWeight: '700',
    color: palette.textPrimary,
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
    paddingBottom: 10,
  },
  emptyText: {
    color: palette.textSecondary,
    marginBottom: 8,
  },
  footerActions: {
    marginVertical: 10,
    gap: 8,
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
    borderRadius: 12,
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
