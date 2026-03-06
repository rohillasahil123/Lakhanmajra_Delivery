import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {OrderStatus, RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {assertValidTransition, getAllowedTransitions} from '../utils/orderStateMachine';
import {createResponsiveStyles, iconSize} from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const actionLabelMap: Partial<Record<OrderStatus, string>> = {
  Assigned: 'Accept Order',
  Accepted: 'Picked Up - Start Delivery',
  Picked: 'Out for Delivery',
  OutForDelivery: 'Mark Delivered',
};

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
      setError(null);
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
    navigation.navigate('InAppMap', {
      orderId: order.id,
      destinationLat: order.deliveryAddress.latitude,
      destinationLng: order.deliveryAddress.longitude,
      address,
    });
  };

  const callNumber = async (number?: string) => {
    const normalized = String(number || '').trim();
    if (!normalized) {
      setError('Contact number not available');
      return;
    }

    const url = `tel:${normalized}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      setError('Unable to open phone dialer');
      return;
    }

    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1b6b43" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
      </SafeAreaView>
    );
  }

  const [next] = getAllowedTransitions(order.status);
  const primaryActionLabel = next ? actionLabelMap[order.status] || `Mark as ${next}` : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={iconSize(22)} color="#d6efe2" />
          </Pressable>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.earningPill}>
          <Text style={styles.earningText}>Rs.{order.amount.toFixed(0)} Earning</Text>
        </View>

        <Text style={styles.headerSubText}>Order #{order.id} · {order.items.length} items</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.blockCard}>
          <View style={[styles.tagPill, styles.pickTag]}>
            <Text style={styles.tagText}>PICKUP POINT</Text>
          </View>

          <Text style={styles.blockTitle}>▫ Green Market Store</Text>
          <Text style={styles.blockMeta}>Shop No. 12, {order.deliveryAddress.city}</Text>
          <Text style={styles.blockMeta}>Contact: {order.customer.phone || 'Not available'}</Text>

          <View style={styles.actionRow}>
            <Pressable style={[styles.smallBtn, styles.callBtn]} onPress={() => callNumber(order.customer.phone)}>
              <Text style={styles.callBtnText}>▫ Call Store</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.navBtn]} onPress={openNavigation}>
              <Text style={styles.navBtnText}>▫ Navigate</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.blockCard}>
          <View style={[styles.tagPill, styles.dropTag]}>
            <Text style={styles.tagText}>DELIVERY TO</Text>
          </View>

          <Text style={styles.blockTitle}>▫ {order.customer.name}</Text>
          <Text style={styles.blockMeta}>
            {order.deliveryAddress.line1}, {order.deliveryAddress.city} - {order.deliveryAddress.postalCode}
          </Text>
          <Text style={styles.blockMeta}>{order.deliveryAddress.state}</Text>
          <Text style={styles.blockMeta}>Contact: +91 {order.customer.phone}</Text>

          <View style={styles.actionRow}>
            <Pressable style={[styles.smallBtn, styles.callBtn]} onPress={() => callNumber(order.customer.phone)}>
              <Text style={styles.callBtnText}>▫ Call Customer</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.navBtn]} onPress={openNavigation}>
              <Text style={styles.navBtnText}>▫ Navigate</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items to Deliver</Text>
        {order.items.map((item) => (
          <View key={`${item.productId}-${item.name}`} style={styles.itemCard}>
            <View style={styles.itemIconBox}>
              <Text style={styles.itemIcon}>🧾</Text>
            </View>
            <View style={styles.itemCenter}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>Quantity: x{item.quantity}</Text>
            </View>
            <View style={styles.qtyPill}>
              <Text style={styles.qtyText}>x{item.quantity}</Text>
            </View>
          </View>
        ))}

        <View style={styles.paymentBanner}>
          <Text style={styles.paymentTitle}>▫ Payment: {order.paymentType === 'COD' ? 'Cash on Delivery' : 'Paid Online'}</Text>
          <Text style={styles.paymentSub}>
            {order.paymentType === 'COD'
              ? `Collect Rs.${order.amount.toFixed(0)} from customer`
              : 'Payment already completed by customer'}
          </Text>
        </View>

        <View style={styles.timelineBox}>
          <Text style={styles.timelineLight}>Order placed at 2:10 PM</Text>
          <Text style={styles.timelineBold}>Pickup by: 2:25 PM  |  Deliver by: 2:45 PM</Text>
        </View>

        {next ? (
          <Pressable
            disabled={updating}
            onPress={() => transition(next)}
            style={({pressed}) => [
              styles.primaryButton,
              pressed && !updating ? styles.primaryButtonPressed : null,
              updating ? styles.primaryButtonDisabled : null,
            ]}>
            <Text style={styles.primaryButtonText}>{updating ? 'Updating...' : primaryActionLabel}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.footerHint}>Tap when you have collected all items</Text>
        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('DeliveredOrders')}>
          <Ionicons name="receipt-outline" size={iconSize(20)} color="#1c4f38" />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Orders</Text>
          <View style={styles.activeDot} />
        </Pressable>

        <Pressable style={styles.tabItem} onPress={openNavigation}>
          <Ionicons name="map-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Map</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Earnings')}>
          <Ionicons name="wallet-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Earnings</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('RiderProfile')}>
          <Ionicons name="person-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: '#ece9e4',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f3',
  },
  topHeader: {
    backgroundColor: '#1b5a3d',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    paddingVertical: 2,
  },
  headerTitle: {
    color: '#e8f6ee',
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '700',
  },
  earningPill: {
    backgroundColor: '#f3cb21',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  earningText: {
    color: '#1f4f38',
    fontWeight: '700',
    fontSize: 15,
  },
  headerSubText: {
    width: '100%',
    color: '#b9cdc3',
    fontSize: 21,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  errorText: {
    color: '#b42318',
    marginBottom: 8,
    fontSize: 13,
  },
  blockCard: {
    backgroundColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8c6c2',
    padding: 12,
    marginBottom: 12,
  },
  tagPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  pickTag: {
    backgroundColor: '#1d5b3f',
  },
  dropTag: {
    backgroundColor: '#e63a4f',
  },
  tagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  blockTitle: {
    fontSize: 31,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  blockMeta: {
    fontSize: 20,
    color: '#666666',
    marginTop: 2,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    height: 33,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: '#cde8d6',
  },
  navBtn: {
    backgroundColor: '#1b5a3d',
  },
  callBtnText: {
    color: '#1f4f38',
    fontWeight: '700',
    fontSize: 14,
  },
  navBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 37,
    fontWeight: '700',
    color: '#1f1f1f',
    marginTop: 2,
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: '#f1f1f1',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c8c6c2',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#cde8d6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemIcon: {
    fontSize: 16,
  },
  itemCenter: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  itemMeta: {
    fontSize: 14,
    color: '#6a6a6a',
    marginTop: 2,
  },
  qtyPill: {
    backgroundColor: '#c5e8ce',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  qtyText: {
    color: '#1e5035',
    fontWeight: '700',
    fontSize: 26,
  },
  paymentBanner: {
    marginTop: 6,
    backgroundColor: '#c5e8ce',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a9d4b7',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  paymentTitle: {
    color: '#1d4f38',
    fontSize: 31,
    fontWeight: '700',
  },
  paymentSub: {
    color: '#2f6b4b',
    marginTop: 2,
    fontSize: 20,
  },
  timelineBox: {
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timelineLight: {
    fontSize: 14,
    color: '#6a6a6a',
  },
  timelineBold: {
    marginTop: 2,
    fontSize: 16,
    color: '#1f1f1f',
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1b5a3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 31,
    letterSpacing: 0.2,
    fontWeight: '700',
  },
  footerHint: {
    textAlign: 'center',
    color: '#6a6a6a',
    marginTop: 8,
    fontSize: 11,
  },
  spacer: {
    height: 82,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#d7d7d7',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
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
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#1f5a3e',
    marginTop: 4,
  },
});
