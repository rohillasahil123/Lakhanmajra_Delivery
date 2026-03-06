import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {AppButton} from '../components/AppButton';
import {useRiderAuth} from '../context/RiderAuthContext';
import {useBackgroundLocation} from '../hooks/useBackgroundLocation';
import {useSocketConnection} from '../hooks/useSocketConnection';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {OrderStatus, RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {assertValidTransition} from '../utils/orderStateMachine';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const ONGOING_STATUSES: OrderStatus[] = ['Accepted', 'Picked', 'OutForDelivery'];

const timeAgo = (isoDate: string): string => {
  const source = new Date(isoDate).getTime();
  if (!Number.isFinite(source)) return 'just now';
  const diffMs = Math.max(0, Date.now() - source);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day ago`;
};

const isToday = (isoDate: string): boolean => {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

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
  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === 'Delivered'),
    [orders]
  );

  const deliveredToday = useMemo(
    () => deliveredOrders.filter((order) => isToday(order.updatedAt)),
    [deliveredOrders]
  );

  const activeOrder = ongoingOrders[0] || null;
  const newOrder = assignedOrders[0] || null;

  const todayEarnings = deliveredToday.reduce((sum, order) => sum + order.amount, 0);
  const distanceCovered = deliveredToday.length * 3;
  const rating = deliveredToday.length > 0 ? 4.9 : 0;

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

  const openActiveOrderMap = () => {
    if (!activeOrder) {
      setError('No active order available for map navigation');
      return;
    }

    openOrderLocation(activeOrder).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1b6b43" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>Good Morning!</Text>
          <Text style={styles.riderName}>{session?.rider.name || 'Rider'} 🚚</Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={[styles.onlineBadge, online ? styles.onlineBadgeOn : styles.onlineBadgeOff]}>
            <Text style={styles.onlineBadgeText}>{online ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
          <Switch
            value={online}
            onValueChange={handleOnlineToggle}
            disabled={onlineUpdating}
            thumbColor={online ? '#ffffff' : '#f4f3f4'}
            trackColor={{false: '#6f8b7e', true: '#20c062'}}
            style={styles.switch}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {(error || locationError) ? (
          <Text style={styles.errorText}>{error || locationError}</Text>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Today's Summary</Text>
          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{deliveredToday.length}</Text>
              <Text style={styles.summaryLabel}>Orders{`\n`}Delivered</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>Rs.{todayEarnings.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Earnings{`\n`}Today</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{distanceCovered} km</Text>
              <Text style={styles.summaryLabel}>Distance{`\n`}Covered</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{rating > 0 ? rating.toFixed(1) : '--'}</Text>
              <Text style={styles.summaryLabel}>Today's{`\n`}Rating</Text>
            </View>
          </View>
        </View>

        {newOrder ? (
          <View style={styles.newOrderCard}>
            <View style={styles.newOrderTag}>
              <Text style={styles.newOrderTagText}>NEW ORDER!</Text>
            </View>

            <Text style={styles.newOrderId}>Order #{newOrder.id}</Text>
            <Text style={styles.newOrderMeta}>📍 Pickup: {newOrder.deliveryAddress.city}</Text>
            <Text style={styles.newOrderMeta}>🚚 Drop: {newOrder.deliveryAddress.line1.slice(0, 18)}, 2.4 km away</Text>
            <Text style={styles.newOrderAmount}>💰 Earning: Rs.{newOrder.amount.toFixed(0)}</Text>

            <Pressable
              onPress={() => applyTransition(newOrder, 'Accepted')}
              disabled={transitionLoadingOrderId === newOrder.id}
              style={({pressed}) => [
                styles.acceptButton,
                pressed ? styles.acceptButtonPressed : null,
                transitionLoadingOrderId === newOrder.id ? styles.acceptButtonDisabled : null,
              ]}>
              <Text style={styles.acceptButtonText}>
                {transitionLoadingOrderId === newOrder.id ? 'Accepting...' : 'Accept 📦'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Active Order</Text>
        <View style={styles.activeOrderCard}>
          {activeOrder ? (
            <>
              <View style={styles.activeTopRow}>
                <View style={styles.activeIconBox}>
                  <Text style={styles.activeIcon}>🧾</Text>
                </View>
                <View style={styles.activeInfo}>
                  <Text style={styles.activeOrderId}>Order #{activeOrder.id}</Text>
                  <Text style={styles.activeOrderMeta}>
                    {activeOrder.items.length} items  {activeOrder.customer.name}
                  </Text>
                </View>
                <View style={styles.etaPill}>
                  <Text style={styles.etaText}>ETA: 4 min</Text>
                </View>
              </View>

              <Pressable onPress={() => openOrderLocation(activeOrder)} style={styles.progressTrack}>
                <View style={styles.progressDone} />
              </Pressable>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLeft}>Picked up</Text>
                <Text style={styles.progressRight}>Delivering...</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No active order right now.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.quickAction} onPress={openActiveOrderMap}>
            <Text style={styles.quickIcon}>🧭</Text>
            <Text style={styles.quickLabel}>Navigate</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate('DeliveredOrders')}>
            <Text style={styles.quickIcon}>📄</Text>
            <Text style={styles.quickLabel}>All Orders</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate('RiderProfile')}>
            <Text style={styles.quickIcon}>🛟</Text>
            <Text style={styles.quickLabel}>Support</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate('Earnings')}>
            <Text style={styles.quickIcon}>💰</Text>
            <Text style={styles.quickLabel}>Earnings</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
        {deliveredOrders.slice(0, 3).map((order) => (
          <Pressable
            key={order.id}
            style={styles.recentCard}
            onPress={() => navigation.navigate('OrderDetail', {orderId: order.id})}>
            <View style={styles.recentIconBox}>
              <Text style={styles.recentIcon}>✅</Text>
            </View>
            <View style={styles.recentCenter}>
              <Text style={styles.recentOrderId}>Order #{order.id}</Text>
              <Text style={styles.recentMeta}>🟩 Completed  {timeAgo(order.updatedAt)}</Text>
            </View>
            <Text style={styles.recentAmount}>Rs.{order.amount.toFixed(0)}</Text>
          </Pressable>
        ))}

        {deliveredOrders.length === 0 ? <Text style={styles.emptyText}>No recent deliveries.</Text> : null}

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={20} color="#1c4f38" />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
          <View style={styles.activeDot} />
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('DeliveredOrders')}>
          <Ionicons name="receipt-outline" size={20} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Orders</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={openActiveOrderMap}>
          <Ionicons name="map-outline" size={20} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Map</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Earnings')}>
          <Ionicons name="wallet-outline" size={20} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Earnings</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('RiderProfile')}>
          <Ionicons name="person-outline" size={20} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>

      <Modal visible={Boolean(newOrderModal)} transparent animationType="fade">
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
    backgroundColor: '#e6e4df',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f3',
  },
  headerTop: {
    backgroundColor: '#1b5a3d',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#c6e7d8',
    fontSize: 26,
  },
  riderName: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#2d7d57',
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    color: '#d7efe2',
    fontSize: 20,
  },
  onlineBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  onlineBadgeOn: {
    backgroundColor: '#14d05d',
  },
  onlineBadgeOff: {
    backgroundColor: '#9ca3af',
  },
  onlineBadgeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  switch: {
    transform: [{scaleX: 0.9}, {scaleY: 0.9}],
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  errorText: {
    color: '#b42318',
    marginBottom: 10,
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#f3f3f3',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -30,
    borderWidth: 1,
    borderColor: '#d8d8d8',
  },
  summaryHeading: {
    color: '#1f4f39',
    fontSize: 26,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#c2c2c2',
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 40,
    color: '#1d4f3b',
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#7a7a7a',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 18,
  },
  newOrderCard: {
    marginTop: 12,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0b442f',
    backgroundColor: '#2b9152',
  },
  newOrderTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f4d91b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  newOrderTagText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#154434',
  },
  newOrderId: {
    color: '#ffffff',
    fontSize: 37,
    fontWeight: '800',
  },
  newOrderMeta: {
    color: '#d9f4e6',
    fontSize: 21,
    marginTop: 2,
  },
  newOrderAmount: {
    color: '#fbe96a',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  acceptButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    backgroundColor: '#f4cd22',
    borderRadius: 999,
    paddingHorizontal: 24,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonPressed: {
    opacity: 0.9,
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#1d3e2f',
    fontWeight: '700',
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1f1f1f',
    marginTop: 12,
    marginBottom: 6,
  },
  activeOrderCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    padding: 10,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#cde8d6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activeIcon: {
    fontSize: 18,
  },
  activeInfo: {
    flex: 1,
  },
  activeOrderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202020',
  },
  activeOrderMeta: {
    fontSize: 13,
    color: '#4f4f4f',
    marginTop: 2,
  },
  etaPill: {
    backgroundColor: '#c5e8ce',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e5035',
  },
  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#cde8d4',
    overflow: 'hidden',
  },
  progressDone: {
    width: '63%',
    height: '100%',
    backgroundColor: '#1e5b3f',
  },
  progressLabels: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLeft: {
    color: '#43a668',
    fontSize: 12,
  },
  progressRight: {
    color: '#7f7f7f',
    fontSize: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#cdcdcd',
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIcon: {
    fontSize: 20,
  },
  quickLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#616161',
  },
  recentCard: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#cde8d6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recentIcon: {
    fontSize: 17,
  },
  recentCenter: {
    flex: 1,
  },
  recentOrderId: {
    color: '#242424',
    fontWeight: '700',
    fontSize: 16,
  },
  recentMeta: {
    color: '#6e6e6e',
    fontSize: 12,
    marginTop: 2,
  },
  recentAmount: {
    color: '#1f4f39',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyText: {
    color: '#6f6f6f',
    fontSize: 13,
    marginVertical: 8,
  },
  spacer: {
    height: 72,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dcdcdc',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#777777',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1f5a3e',
    fontWeight: '700',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#1f5a3e',
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalText: {
    color: '#374151',
  },
});
