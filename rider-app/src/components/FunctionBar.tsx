import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {useRiderAuth} from '../context/RiderAuthContext';
import {RootStackParamList} from '../navigation/types';
import {palette} from '../constants/theme';

type FunctionKey = 'home' | 'earnings' | 'delivered' | 'profile';

interface FunctionBarProps {
  active: FunctionKey;
}

const items: {key: FunctionKey; icon: keyof typeof Ionicons.glyphMap; label: string}[] = [
  {key: 'home', icon: 'home-outline', label: 'Home'},
  {key: 'earnings', icon: 'wallet-outline', label: 'Earnings'},
  {key: 'delivered', icon: 'checkmark-done-outline', label: 'Delivered'},
  {key: 'profile', icon: 'person-outline', label: 'Profile'},
];

export const FunctionBar: React.FC<FunctionBarProps> = ({active}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {logout} = useRiderAuth();

  const handleNavigate = (key: FunctionKey) => {
    if (key === 'home') {
      navigation.navigate('Dashboard');
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
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {items.slice(0, 4).map((item) => {
          const isActive = active === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleNavigate(item.key)}
              style={({pressed}) => [styles.item, isActive && styles.itemActive, pressed && styles.itemPressed]}>
              <Ionicons name={item.icon} size={20} color={isActive ? palette.card : palette.textSecondary} />
              {isActive ? (
                <>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeLabel}>{item.label}</Text>
                </>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable style={({pressed}) => [styles.item, styles.logoutButton, pressed && styles.itemPressed]} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={palette.accent} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: palette.textPrimary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  item: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: palette.background,
  },
  itemActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  itemPressed: {
    opacity: 0.85,
  },
  logoutButton: {
    borderColor: palette.danger,
    backgroundColor: palette.card,
  },
  activeDot: {
    marginTop: 1,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: palette.card,
  },
  activeLabel: {
    color: palette.card,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
