import React from 'react';
import {ActivityIndicator, Alert, Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {RootStackParamList} from '../navigation/types';
import {createResponsiveStyles, iconSize} from '../utils/responsive';
import {riderService} from '../services/riderService';
import {RiderOrder} from '../types/rider';

type FunctionKey = 'home' | 'earnings' | 'delivered' | 'profile' | 'map';

interface FunctionBarProps {
  active: FunctionKey;
}

const items: {key: FunctionKey; icon: keyof typeof Ionicons.glyphMap; label: string}[] = [
  {key: 'home', icon: 'home-outline', label: 'Home'},
  {key: 'delivered', icon: 'receipt-outline', label: 'Orders'},
  {key: 'map', icon: 'map-outline', label: 'Map'},
  {key: 'earnings', icon: 'wallet-outline', label: 'Earnings'},
  {key: 'profile', icon: 'person-outline', label: 'Profile'},
];

export const FunctionBar: React.FC<FunctionBarProps> = ({active}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mapLoading, setMapLoading] = React.useState(false);

  const getPreferredMapOrder = (orders: RiderOrder[]): RiderOrder | null => {
    const statusPriority: RiderOrder['status'][] = ['OutForDelivery', 'Picked', 'Accepted', 'Assigned'];

    for (const status of statusPriority) {
      const match = orders.find((order) => order.status === status);
      if (match) {
        return match;
      }
    }

    return orders[0] || null;
  };

  const openMapFromOrder = async () => {
    try {
      setMapLoading(true);
      const orders = await riderService.getOrders();
      if (!orders.length) {
        Alert.alert('No Orders', 'Map open karne ke liye pehle koi order assigned hona chahiye.');
        return;
      }

      const target = getPreferredMapOrder(orders);
      if (!target) {
        Alert.alert('No Order Found', 'Map destination nahi mila.');
        return;
      }

      const line1 = target.deliveryAddress.line1 || '';
      const city = target.deliveryAddress.city || '';
      const state = target.deliveryAddress.state || '';
      const postalCode = target.deliveryAddress.postalCode || '';

      const address = [line1, city, state, postalCode].filter(Boolean).join(', ') || 'Delivery location';

      navigation.navigate('InAppMap', {
        orderId: target.id,
        destinationLat: target.deliveryAddress.latitude,
        destinationLng: target.deliveryAddress.longitude,
        address,
      });
    } catch {
      Alert.alert('Map Error', 'Map open nahi ho paya. Please thodi der baad try karein.');
    } finally {
      setMapLoading(false);
    }
  };

  const handleNavigate = async (key: FunctionKey) => {
    if (key === 'home') {
      navigation.navigate('Dashboard');
      return;
    }

    if (key === 'map') {
      if (mapLoading) {
        return;
      }
      await openMapFromOrder();
      return;
    }

    if (key === 'profile') {
      navigation.navigate('RiderProfile');
      return;
    }

    if (key === 'earnings') {
      navigation.navigate('Earnings');
      return;
    }

    navigation.navigate('DeliveredOrders');
  };

  return (
    <View style={styles.bottomBar}>
      {items.map((item) => {
          const isActive = active === item.key;
          const isMapItem = item.key === 'map';
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                handleNavigate(item.key).catch(() => {});
              }}
              disabled={isMapItem && mapLoading}
              style={({pressed}) => [styles.tabItem, pressed && styles.tabItemPressed]}>
              {isMapItem && mapLoading ? (
                <ActivityIndicator size="small" color="#1c4f38" />
              ) : (
                <Ionicons name={item.icon} size={iconSize(20)} color={isActive ? '#1c4f38' : '#7a7a7a'} />
              )}
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{item.label}</Text>
              {isActive ? <View style={styles.activeDot} /> : null}
            </Pressable>
          );
        })}
    </View>
  );
};

const styles = createResponsiveStyles({
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderColor: '#d4d4d4',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabItemPressed: {
    opacity: 0.8,
  },
  tabLabel: {
    color: '#7a7a7a',
    fontSize: 10,
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1c4f38',
    fontWeight: '700',
  },
  activeDot: {
    marginTop: 2,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#1c4f38',
  },
});
