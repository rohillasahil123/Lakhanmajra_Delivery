import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { responsiveModerateScale, responsiveScale, responsiveVerticalScale } from '@/utils/responsive';

type TopHeaderProps = {
  location: string;
  onLocationPress: () => void;
  onProfilePress: () => void;
  onOrdersPress: () => void;
  hasOrder: boolean;
};

export default function TopHeader({ location, onLocationPress, onProfilePress, onOrdersPress, hasOrder }: TopHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <TouchableOpacity style={styles.iconBtn} onPress={onOrdersPress}>
          <ThemedText style={styles.icon}>🧾</ThemedText>
          {hasOrder && <View style={styles.dotMini} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onProfilePress}>
          <ThemedText style={styles.icon}>👤</ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.locationChip} onPress={onLocationPress}>
        <ThemedText style={styles.locationPin}>📍</ThemedText>
        <ThemedText style={styles.locationText} numberOfLines={1}>
          {location}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsiveScale(4),
    marginBottom: responsiveVerticalScale(8),
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveModerateScale(8),
  },
  iconBtn: {
    width: responsiveScale(38),
    height: responsiveVerticalScale(38),
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: responsiveModerateScale(18),
  },
  dotMini: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  locationChip: {
    flex: 1,
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: responsiveScale(10),
    paddingVertical: responsiveVerticalScale(6),
  },
  locationPin: {
    fontSize: responsiveModerateScale(14),
    marginRight: 6,
  },
  locationText: {
    flex: 1,
    fontSize: responsiveModerateScale(11),
    fontWeight: '600',
  },
});
