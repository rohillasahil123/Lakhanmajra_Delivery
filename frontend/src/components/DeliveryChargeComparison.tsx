/**
 * Delivery Charge Comparison Component
 * Shows regular vs same-delivery-charge option side by side
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './themed-text';
import { verticalScale, scale } from 'react-native-size-matters';

export interface DeliveryOption {
  type: 'regular' | 'same_delivery_charge';
  chargeAmount: number;
  estimatedTime: string; // e.g., "45-60 min"
  isCurrent?: boolean;
}

interface DeliveryChargeComparisonProps {
  regularOption: DeliveryOption;
  sameChargeOption: DeliveryOption | null;
  onSelectOption: (type: 'regular' | 'same_delivery_charge') => void;
  selectedType: 'regular' | 'same_delivery_charge';
}

/**
 * Shows comparison between regular and same-delivery-charge delivery options
 * Allows user to select their preferred delivery option
 */
export const DeliveryChargeComparison: React.FC<DeliveryChargeComparisonProps> = ({
  regularOption,
  sameChargeOption,
  onSelectOption,
  selectedType,
}) => {
  const renderOption = (option: DeliveryOption, isSelected: boolean) => (
    <TouchableOpacity
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
      ]}
      onPress={() => onSelectOption(option.type)}
      activeOpacity={0.7}
    >
      <View style={styles.radioButton}>
        {isSelected && <View style={styles.radioButtonInner} />}
      </View>

      <View style={styles.optionContent}>
        <ThemedText style={styles.optionType}>
          {option.type === 'regular' ? 'Regular Delivery' : 'Same Delivery Charge'}
        </ThemedText>
        <ThemedText style={styles.estimatedTime}>
          {option.estimatedTime}
        </ThemedText>
      </View>

      <View style={styles.chargeSection}>
        {option.type === 'same_delivery_charge' && (
          <View style={styles.savingTag}>
            <ThemedText style={styles.savingText}>SAVE</ThemedText>
          </View>
        )}
        <ThemedText style={styles.chargeAmount}>
          ₹{option.chargeAmount}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Delivery Options</ThemedText>

      <View style={styles.optionsContainer}>
        {renderOption(regularOption, selectedType === 'regular')}

        {sameChargeOption && (
          renderOption(sameChargeOption, selectedType === 'same_delivery_charge')
        )}
      </View>

      {sameChargeOption && selectedType === 'same_delivery_charge' && (
        <View style={styles.infoBox}>
          <ThemedText style={styles.infoText}>
            ✓ Same delivery charge applies when you add items within the active window
          </ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
    marginVertical: verticalScale(16),
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: verticalScale(12),
    color: '#1f2937',
  },
  optionsContainer: {
    gap: verticalScale(12),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  radioButton: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  radioButtonInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#10b981',
  },
  optionContent: {
    flex: 1,
  },
  optionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  chargeSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  savingTag: {
    backgroundColor: '#dcfce7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  savingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  chargeAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: 6,
    marginTop: verticalScale(12),
  },
  infoText: {
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 18,
  },
});
