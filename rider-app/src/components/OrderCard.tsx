import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
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
  onOpenLocation?: () => void;
  actionLoading?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onOpenDetail,
  onOpenLocation,
  actionLoading,
}) => {
  const statusTone =
    order.status === 'Delivered'
      ? styles.statusSuccess
      : order.status === 'Rejected'
      ? styles.statusDanger
      : styles.statusPrimary;

  const amountLabel = order.paymentType === 'COD' ? 'To Collect' : 'Paid Online';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        <View style={[styles.statusBadge, statusTone]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.productPanel}>
        {order.productPreview?.image ? (
          <Image source={{uri: order.productPreview.image}} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.productInfoWrap}>
          <Text style={styles.productName}>{order.productPreview?.name || 'Product'}</Text>
          <Text style={styles.customerName}>Customer: {order.customer.name}</Text>
          <Text style={styles.phone}>Phone: {order.customer.phone}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Payment</Text>
        <Text style={styles.metaValue}>{order.paymentType}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{amountLabel}</Text>
        <Text style={styles.amount}>₹{order.amount.toFixed(2)}</Text>
      </View>

      <View style={styles.addressBox}>
        <Text style={styles.addressLabel}>Delivery Address</Text>
        <Text style={styles.address}>
          {order.deliveryAddress.line1}, {order.deliveryAddress.city}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <View style={styles.actionButtonWrap}>
          <AppButton title="Details" onPress={onOpenDetail} variant="secondary" />
        </View>
        {onOpenLocation ? (
          <View style={styles.actionButtonWrap}>
            <AppButton title="Open Map" onPress={onOpenLocation} variant="secondary" />
          </View>
        ) : null}
      </View>

      {primaryActionLabel && onPrimaryAction ? (
        <View style={styles.buttonRow}>
          <View style={styles.actionButtonWrap}>
            <AppButton
              title={primaryActionLabel}
              onPress={onPrimaryAction}
              loading={actionLoading}
            />
          </View>
          {secondaryActionLabel && onSecondaryAction ? (
            <View style={styles.actionButtonWrap}>
              <AppButton
                title={secondaryActionLabel}
                onPress={onSecondaryAction}
                variant="danger"
                loading={actionLoading}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 10,
    marginBottom: 14,
    shadowColor: palette.textPrimary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPrimary: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  statusSuccess: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.success,
  },
  statusDanger: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  productPanel: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  productInfoWrap: {
    flex: 1,
    gap: 3,
  },
  productName: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  customerName: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  phone: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  amount: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: '800',
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  addressBox: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  addressLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  address: {
    fontSize: 13,
    color: palette.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonWrap: {
    flex: 1,
  },
});
