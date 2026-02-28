import { ThemedText } from '@/components/themed-text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
  Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import useCart from '@/stores/cartStore';
import useLocationStore from '@/stores/locationStore';
import { createOrderApi, getOrderEligibilityApi, OrderEligibility } from '@/services/orderService';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const setSelectedLocation = useLocationStore((s) => s.setSelectedLocation);
  const [eligibility, setEligibility] = useState<OrderEligibility | null>(null);
  const [payAdvance, setPayAdvance] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [qrNonce, setQrNonce] = useState(() => Math.floor(Math.random() * 1000000));

  const getParamText = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    return '';
  };

  const hasSavedAddress =
    !!selectedLocation.address && selectedLocation.address !== 'Select your delivery location';
  const addressLines = hasSavedAddress
    ? selectedLocation.address
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  const primaryAddressLine = hasSavedAddress
    ? addressLines.slice(0, 2).join(', ') || selectedLocation.address
    : 'Select your delivery location';
  const secondaryAddressLine = hasSavedAddress
    ? addressLines.slice(2).join(', ') || selectedLocation.deliveryInstructions || 'Tap to change location'
    : 'Tap to add delivery address';

  // Calculate totals
  const billTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const effectivePaymentMethod: 'cod' | 'online' = eligibility?.requiresAdvancePayment ? 'online' : paymentMethod;
  const deliveryFee = effectivePaymentMethod === 'online' ? 8 : 10;
  const advanceCharge = eligibility?.requiresAdvancePayment ? Number(eligibility?.advanceAmount || 20) : 0;
  const totalPayable = billTotal + deliveryFee + (payAdvance ? advanceCharge : 0);

  const qrPaymentData = useMemo(() => {
    const handles = ['okaxis', 'ybl', 'ibl', 'okicici'];
    const handle = handles[qrNonce % handles.length];
    const txnId = `LKM${Date.now().toString().slice(-6)}${qrNonce % 1000}`;
    const upiId = `lakhanmajra${(qrNonce % 9000) + 1000}@${handle}`;
    return {
      upiId,
      txnId,
      payload: `upi://pay?pa=${upiId}&pn=Lakhanmajra%20Delivery&am=${totalPayable.toFixed(2)}&cu=INR&tn=${txnId}`,
    };
  }, [qrNonce, totalPayable]);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPaymentData.payload)}`;

  useEffect(() => {
    const addressParam = getParamText(params.address).trim();
    const instructionsParam = getParamText(params.deliveryInstructions).trim();
    const latitudeParam = Number(getParamText(params.latitude));
    const longitudeParam = Number(getParamText(params.longitude));

    if (!addressParam) {
      return;
    }

    setSelectedLocation({
      address: addressParam,
      deliveryInstructions: instructionsParam,
      latitude: Number.isFinite(latitudeParam) ? latitudeParam : selectedLocation.latitude,
      longitude: Number.isFinite(longitudeParam) ? longitudeParam : selectedLocation.longitude,
    });
  }, [params.address, params.deliveryInstructions, params.latitude, params.longitude, selectedLocation.latitude, selectedLocation.longitude, setSelectedLocation]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrderEligibilityApi();
        setEligibility(data);
      } catch {
        setEligibility(null);
      }
    })();
  }, []);

  

  useEffect(() => {
    if (eligibility?.requiresAdvancePayment) {
      setPaymentMethod('online');
    }
  }, [eligibility?.requiresAdvancePayment]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart Empty', 'Please add items before placing order.');
      return;
    }

    try {
      const rawAddress = (selectedLocation.address || '').trim();
      const street = rawAddress || 'Lakhanmajra';
      const pinMatch = rawAddress.match(/\b\d{6}\b/);

      if (eligibility?.requiresAdvancePayment && !payAdvance) {
        Alert.alert(
          'Advance Required',
          `Aapne ${eligibility.cancelledOrdersCount} orders cancel kiye hain. Next order ke liye ₹${eligibility.advanceAmount} advance dena zaroori hai.`
        );
        return;
      }

      await createOrderApi({
        shippingAddress: {
          street,
          city: 'Rohtak',
          state: 'Haryana',
          pincode: pinMatch?.[0] || '124001',
          ...(Number.isFinite(selectedLocation.latitude) ? { latitude: selectedLocation.latitude } : {}),
          ...(Number.isFinite(selectedLocation.longitude) ? { longitude: selectedLocation.longitude } : {}),
        },
        paymentMethod: effectivePaymentMethod,
        advancePaid: eligibility?.requiresAdvancePayment ? payAdvance : false,
      });

      await clearCart();
      Alert.alert(
        'Order Placed! 🎉',
        `Your order of ₹${totalPayable} has been placed successfully!`,
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/orders'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Order Failed', error?.message || 'Unable to place order right now.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <ThemedText style={styles.icon}>🏠</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <ThemedText style={styles.icon}>🔔</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
          <TouchableOpacity 
            style={styles.addressCard}
            onPress={() =>
              router.push({
                pathname: '/location',
                params: {
                  returnTo: '/checkout',
                  address: selectedLocation.address,
                  deliveryInstructions: selectedLocation.deliveryInstructions,
                  latitude: selectedLocation.latitude.toString(),
                  longitude: selectedLocation.longitude.toString(),
                },
              })
            }
          >
            <View style={styles.addressContent}>
              <View style={styles.checkmarkContainer}>
                <ThemedText style={styles.checkmark}>✓</ThemedText>
              </View>
              <View style={styles.addressText}>
                <ThemedText style={styles.addressMain}>
                  {primaryAddressLine}
                </ThemedText>
                <ThemedText style={styles.addressSub} numberOfLines={2}>
                  {secondaryAddressLine}
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cart Items Section */}
        <View style={styles.section}>
          {cartItems.map((item) => (
            <View key={item.cartItemId || item.id} style={styles.cartItem}>
              <View style={styles.itemImageContainer}>
                {(() => {
                  const imageValue = String(item.image || '').trim();
                  const isImageUrl = /^(https?:\/\/|file:\/\/|data:image\/)/i.test(imageValue);

                  if (isImageUrl) {
                    return <Image source={{ uri: imageValue }} style={styles.itemImage} resizeMode="cover" />;
                  }

                  const fallbackIcon = imageValue && imageValue.length <= 3 ? imageValue : '🛍️';
                  return <ThemedText style={styles.itemImageFallback}>{fallbackIcon}</ThemedText>;
                })()}
              </View>
              <View style={styles.itemDetails}>
                <ThemedText style={styles.itemName}>
                  {item.name} × {item.quantity}
                </ThemedText>
                <ThemedText style={styles.itemUnit}>{item.unit}</ThemedText>
              </View>
              <ThemedText style={styles.itemPrice}>₹ {item.price * item.quantity}</ThemedText>
            </View>
          ))}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>

          <View style={styles.paymentOptionsWrap}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                effectivePaymentMethod === 'cod' && styles.paymentOptionActive,
                eligibility?.requiresAdvancePayment && styles.paymentOptionDisabled,
              ]}
              onPress={() => setPaymentMethod('cod')}
              disabled={!!eligibility?.requiresAdvancePayment}
            >
              <ThemedText style={styles.paymentOptionTitle}>Cash on Delivery</ThemedText>
              <ThemedText style={styles.paymentOptionSub}>
                {eligibility?.requiresAdvancePayment ? 'Temporarily unavailable' : 'Pay when order arrives · Delivery ₹10'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, effectivePaymentMethod === 'online' && styles.paymentOptionActive]}
              onPress={() => {
                setPaymentMethod('online');
                setQrNonce((prev) => prev + 1);
              }}
            >
              <ThemedText style={styles.paymentOptionTitle}>Online Payment</ThemedText>
              <ThemedText style={styles.paymentOptionSub}>Scan QR and pay now · Delivery ₹8</ThemedText>
            </TouchableOpacity>
          </View>

          {effectivePaymentMethod === 'online' ? (
            <View style={styles.qrSection}>
              <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
              <ThemedText style={styles.qrTitle}>Demo QR (Random)</ThemedText>
              <ThemedText style={styles.qrMeta}>UPI ID: {qrPaymentData.upiId}</ThemedText>
              <ThemedText style={styles.qrMeta}>Amount: ₹{totalPayable}</ThemedText>
              <TouchableOpacity style={styles.refreshQrButton} onPress={() => setQrNonce((prev) => prev + 1)}>
                <ThemedText style={styles.refreshQrText}>Generate New QR</ThemedText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Bill Details Section */}
        <View style={styles.billSection}>
          <View style={styles.billRow}>
            <ThemedText style={styles.billLabel}>Bill Total</ThemedText>
            <ThemedText style={styles.billValue}>₹ {billTotal}</ThemedText>
          </View>

          <View style={styles.billRow}>
            <ThemedText style={styles.billLabel}>Delivery Fee</ThemedText>
            <ThemedText style={styles.deliveryFee}>+ ₹{deliveryFee} ({effectivePaymentMethod === 'online' ? 'Online' : 'COD'})</ThemedText>
          </View>

          {eligibility?.requiresAdvancePayment && (
            <>
              <View style={styles.ruleAlert}>
                <ThemedText style={styles.ruleAlertText}>
                  {`Aapke ${eligibility.cancelledOrdersCount} cancelled orders hain. Is next order par COD disabled hai.`}
                </ThemedText>
                <ThemedText style={styles.ruleAlertSubText}>{`₹${eligibility.advanceAmount} advance pay karke order place karein.`}</ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.advanceToggle, payAdvance && styles.advanceToggleActive]}
                onPress={() => setPayAdvance((prev) => !prev)}
              >
                <ThemedText style={[styles.advanceToggleText, payAdvance && styles.advanceToggleTextActive]}>
                  {payAdvance ? `✓ ₹${eligibility.advanceAmount} Advance Added` : `Add ₹${eligibility.advanceAmount} Advance`}
                </ThemedText>
              </TouchableOpacity>

              {payAdvance && (
                <View style={styles.billRow}>
                  <ThemedText style={styles.billLabel}>Advance Charge</ThemedText>
                  <ThemedText style={styles.billValue}>+ ₹ {eligibility.advanceAmount}</ThemedText>
                </View>
              )}
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.billRow}>
            <ThemedText style={styles.totalLabel}>Total Payable</ThemedText>
            <ThemedText style={styles.totalValue}>₹ {totalPayable}</ThemedText>
          </View>
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder}>
          <ThemedText style={styles.placeOrderText}>Place Order</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
   marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
     marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0E7A3D',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  icon: {
    fontSize: 18,
  },
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  addressCard: {
    paddingHorizontal: 16,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0E7A3D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addressText: {
    flex: 1,
  },
  addressMain: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 20,
  },
  addressSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemImageContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  itemImageFallback: {
    fontSize: 28,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  paymentOptionsWrap: {
    paddingHorizontal: 16,
    gap: 10,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionActive: {
    borderColor: '#0E7A3D',
    backgroundColor: '#ECFDF3',
  },
  paymentOptionDisabled: {
    opacity: 0.55,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  paymentOptionSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  qrSection: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  qrMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  refreshQrButton: {
    marginTop: 8,
    backgroundColor: '#EEF7F0',
    borderWidth: 1,
    borderColor: '#B8E2C4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshQrText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  billSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E7A3D',
  },
  ruleAlert: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  ruleAlertText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  ruleAlertSubText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  advanceToggle: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  advanceToggleActive: {
    borderColor: '#0E7A3D',
    backgroundColor: '#ECFDF3',
  },
  advanceToggleText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  advanceToggleTextActive: {
    color: '#166534',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  placeOrderButton: {
    backgroundColor: '#0E7A3D',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0E7A3D',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  placeOrderText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});