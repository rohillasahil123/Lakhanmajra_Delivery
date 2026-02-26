import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {RiderOrder} from '../types/rider';
import {palette} from '../constants/theme';
import {AppButton} from './AppButton';

interface OrderCardProps {
  order: RiderOrder;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onOpenDetail: () => void;
  actionLoading?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onOpenDetail,
  actionLoading,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Order #{order.id.slice(-6).toUpperCase()}</Text>
      <Text style={styles.subtitle}>Status: {order.status}</Text>
      <Text style={styles.subtitle}>Payment: {order.paymentType}</Text>
      <Text style={styles.subtitle}>Customer: {order.customer.name}</Text>
      <Text style={styles.subtitle}>Phone: {order.customer.phone}</Text>
      <Text style={styles.address}>
        {order.deliveryAddress.line1}, {order.deliveryAddress.city}
      </Text>

      <View style={styles.buttonRow}>
        <AppButton title="Details" onPress={onOpenDetail} variant="secondary" />
      </View>

      {primaryActionLabel && onPrimaryAction ? (
        <View style={styles.buttonRow}>
          <AppButton
            title={primaryActionLabel}
            onPress={onPrimaryAction}
            loading={actionLoading}
          />
          {secondaryActionLabel && onSecondaryAction ? (
            <AppButton
              title={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="danger"
              loading={actionLoading}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  address: {
    fontSize: 14,
    color: palette.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});
