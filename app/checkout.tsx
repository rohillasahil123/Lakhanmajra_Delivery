import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

// Dummy cart data
const CART_ITEMS = [
  { 
    id: 1, 
    name: 'Amul Milk', 
    quantity: 2, 
    price: 25, 
    unit: '500ml',
    image: '🥛',
    total: 50 
  },
  { 
    id: 2, 
    name: 'Aashirvaad Atta', 
    quantity: 1, 
    price: 200, 
    unit: '5kg',
    image: '🌾',
    total: 200 
  },
  { 
    id: 3, 
    name: 'Parle-G Biscuits', 
    quantity: 1, 
    price: 30, 
    unit: 'pack',
    image: '🍪',
    total: 30 
  },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const [cartItems] = useState(CART_ITEMS);
  
  // Calculate totals
  const billTotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = 10;
  const totalPayable = billTotal + deliveryFee;

  const handlePlaceOrder = () => {
    Alert.alert(
      'Order Placed! 🎉',
      `Your order of ₹${totalPayable} has been placed successfully!\n\nDelivery Time: 30 minutes`,
      [
        {
          text: 'Track Order',
          onPress: () => router.push('/home'),
        },
      ]
    );
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
                <ThemedText style={styles.itemImage}>{item.image}</ThemedText>
              </View>
              <View style={styles.itemDetails}>
                <ThemedText style={styles.itemName}>
                  {item.name} × {item.quantity}
                </ThemedText>
                <ThemedText style={styles.itemUnit}>{item.unit}</ThemedText>
              </View>
              <ThemedText style={styles.itemPrice}>₹ {item.total}</ThemedText>
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
    backgroundColor: '#FF6A00',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6A00',
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