/**
 * Addon Delivery Banner Component
 * Displays information about same-day addon delivery window
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { AddonDeliveryWindow } from '@/services/addonWindowService';
import { verticalScale, scale } from 'react-native-size-matters';

interface AddonDeliveryBannerProps {
  window: AddonDeliveryWindow | null;
  remainingMs: number;
}

/**
 * Reusable addon delivery banner component
 * Shows time remaining for same-delivery-charge window
 */
export const AddonDeliveryBanner: React.FC<AddonDeliveryBannerProps> = ({
  window,
  remainingMs,
}) => {
  const [timerDisplay, setTimerDisplay] = useState('');

  useEffect(() => {
    if (remainingMs <= 0) {
      setTimerDisplay('');
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      setTimerDisplay(`${hours}h ${minutes}m`);
    } else if (minutes > 0) {
      setTimerDisplay(`${minutes}m ${seconds}s`);
    } else {
      setTimerDisplay(`${seconds}s`);
    }
  }, [remainingMs]);

  if (!window || remainingMs <= 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>⏰ Same delivery charge active</ThemedText>
        <ThemedText style={styles.subtitle}>
          Add more items before {timerDisplay} to save on delivery
        </ThemedText>
      </View>
      <View style={styles.timerBadge}>
        <ThemedText style={styles.timerText}>{timerDisplay}</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
  },
  timerBadge: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: scale(12),
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
