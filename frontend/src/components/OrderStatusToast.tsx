/**
 * Order Status Toast Component
 * Displays notification about order tracking
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Order } from '@/types';
import { verticalScale } from 'react-native-size-matters';

interface OrderStatusToastProps {
  order: Order | null;
  visible: boolean;
}

/**
 * Reusable toast component for displaying order status
 * Uses Animated API for smooth entrance/exit
 */
export const OrderStatusToast: React.FC<OrderStatusToastProps> = ({
  order,
  visible,
}) => {
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(toastAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible, toastAnim]);

  if (!order) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: toastAnim,
          transform: [
            {
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <ThemedText style={styles.toastText}>
        🚚 Tracking order {order._id || 'your latest order'} in progress
      </ThemedText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    backgroundColor: '#065f46',
    paddingVertical: verticalScale(12),
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: verticalScale(8),
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
