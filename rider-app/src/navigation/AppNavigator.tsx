import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useRiderAuth} from '../context/RiderAuthContext';
import {DashboardScreen} from '../screens/DashboardScreen';
import {DeliveredOrdersScreen} from '../screens/DeliveredOrdersScreen';
import {EarningsScreen} from '../screens/EarningsScreen';
import {InAppMapScreen} from '../screens/InAppMapScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {OrderDetailScreen} from '../screens/OrderDetailScreen';
import {RiderProfileScreen} from '../screens/RiderProfileScreen';
import {RiderProfileOtpScreen} from '../screens/RiderProfileOtpScreen';
import {RootStackParamList} from './types';
import {palette} from '../constants/theme';
import {createResponsiveStyles} from '../utils/responsive';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const {status} = useRiderAuth();

  if (status === 'loading') {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  const authenticated = status === 'authenticated';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: palette.background,
          },
        }}
      >
        {authenticated ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="RiderProfile" component={RiderProfileScreen} />
            <Stack.Screen name="RiderProfileOtp" component={RiderProfileOtpScreen} />
            <Stack.Screen name="DeliveredOrders" component={DeliveredOrdersScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="InAppMap" component={InAppMapScreen} />
            <Stack.Screen name="Earnings" component={EarningsScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = createResponsiveStyles({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background,
  },
});
