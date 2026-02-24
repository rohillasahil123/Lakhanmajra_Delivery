import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import React from 'react';
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
import { createOrderApi } from '@/services/orderService';

export default function CheckoutScreen() {
  const router = useRouter();
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  // Calculate totals
  const billTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 10;
  const totalPayable = billTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart Empty', 'Please add items before placing order.');
      return;
    }

    try {
      const rawAddress = (selectedLocation.address || '').trim();
      const street = rawAddress || 'Lakhanmajra';
      const pinMatch = rawAddress.match(/\b\d{6}\b/);

      await createOrderApi({
        street,
        city: 'Rohtak',
        state: 'Haryana',
        pincode: pinMatch?.[0] || '124001',
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
            onPress={() => router.push('/location')}
          >
            <View style={styles.addressContent}>
              <View style={styles.checkmarkContainer}>
                <ThemedText style={styles.checkmark}>✓</ThemedText>
              </View>
              <View style={styles.addressText}>
                <ThemedText style={styles.addressMain}>
                  Near Main Bazaar, Lakmnja Rohtak
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Cart Items Section */}
        <View style={styles.section}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.cartItem}>
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

        {/* Bill Details Section */}
        <View style={styles.billSection}>
          <View style={styles.billRow}>
            <ThemedText style={styles.billLabel}>Bill Total</ThemedText>
            <ThemedText style={styles.billValue}>₹ {billTotal}</ThemedText>
          </View>

          <View style={styles.billRow}>
            <ThemedText style={styles.billLabel}>Delivery Fee</ThemedText>
            <ThemedText style={styles.deliveryFee}>+ ₹{deliveryFee}</ThemedText>
          </View>

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