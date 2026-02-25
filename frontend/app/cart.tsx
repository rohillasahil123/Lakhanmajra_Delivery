import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    Alert,
  Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

// Cart items are managed by the global Zustand store (stores/cartStore.ts)

export default function CartScreen() {
  const router = useRouter();
  const cartItems = useCart((s) => s.items);
  const increaseQuantity = useCart((s) => s.increase);
  const decreaseQuantity = useCart((s) => s.decrease);
  const removeFromCart = useCart((s) => s.remove);
  const clearCart = useCart((s) => s.clear);
  const hydrateLocal = useCart((s) => s.hydrateLocal);
  const syncFromServer = useCart((s) => s.syncFromServer);
  const initialized = useCart((s) => s.initialized);

  useEffect(() => {
    (async () => {
      if (!initialized) await hydrateLocal();
      await syncFromServer();
    })();
  }, [initialized, hydrateLocal, syncFromServer]);

  // Calculate totals (give explicit types to reduce callback to satisfy strict TS)
  const itemCount = cartItems.length;
  const billTotal = cartItems.reduce((sum: number, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = 10;
  const totalPayable = billTotal + deliveryFee;

  // Remove item with confirmation
  const confirmRemove = (id: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeFromCart(id);
          },
        },
      ]
    );
  };

  const goToCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart first.');
      return;
    }

    const invalidItems = cartItems.filter((item) => Number(item.stock ?? 0) <= 0 || item.quantity > Number(item.stock ?? 0));
    if (invalidItems.length > 0) {
      Alert.alert('Out of Stock', 'Some items are out of stock. Please remove them before checkout.');
      return;
    }

    router.push('/checkout');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Cart</ThemedText>
        <View style={styles.cartBadge}>
          <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
        </View>
      </View>

      {cartItems.length === 0 ? (
        // Empty Cart
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>🛒</ThemedText>
          <ThemedText style={styles.emptyTitle}>Your cart is empty</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Add items to get started
          </ThemedText>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/home')}
          >
            <ThemedText style={styles.shopButtonText}>Start Shopping</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Cart Items */}
            <View style={styles.itemsSection}>
              {cartItems.map((item) => (
                (() => {
                  const availableStock = Number(item.stock ?? 0);
                  const isOutOfStock = availableStock <= 0;
                  const canIncrease = !isOutOfStock && item.quantity < availableStock;

                  return (
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
                    <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    <ThemedText style={styles.itemUnit}>{item.unit}</ThemedText>
                    <ThemedText style={styles.itemPrice}>₹{item.price}</ThemedText>
                    {isOutOfStock && <ThemedText style={styles.stockText}>Out of stock</ThemedText>}
                  </View>

                  <View style={styles.itemActions}>
                    {/* Quantity Controls */}
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => decreaseQuantity(item.id)}
                      >
                        <ThemedText style={styles.quantityButtonText}>−</ThemedText>
                      </TouchableOpacity>
                      <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
                      <TouchableOpacity
                        style={[styles.quantityButton, !canIncrease && styles.quantityButtonDisabled]}
                        onPress={() => increaseQuantity(item.id)}
                        disabled={!canIncrease}
                      >
                        <ThemedText style={styles.quantityButtonText}>+</ThemedText>
                      </TouchableOpacity>
                    </View>

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => confirmRemove(item.id)}
                    >
                      <ThemedText style={styles.removeButtonText}>🗑️</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                  );
                })()
              ))}
            </View>

            {/* Bill Summary */}
            <View style={styles.summarySection}>
              <ThemedText style={styles.summaryTitle}>Bill Details</ThemedText>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Items Total</ThemedText>
                <ThemedText style={styles.summaryValue}>₹{billTotal}</ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
                <ThemedText style={styles.deliveryFee}>₹{deliveryFee}</ThemedText>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <ThemedText style={styles.totalLabel}>To Pay</ThemedText>
                <ThemedText style={styles.totalValue}>₹{totalPayable}</ThemedText>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Fixed Bottom Checkout Button */}
          <View style={styles.bottomContainer}>
            <View style={styles.bottomContent}>
              <View>
                <ThemedText style={styles.bottomLabel}>{itemCount} items</ThemedText>
                <ThemedText style={styles.bottomTotal}>₹{totalPayable}</ThemedText>
              </View>
              <TouchableOpacity style={styles.checkoutButton} onPress={goToCheckout}>
                <ThemedText style={styles.checkoutButtonText}>
                  Proceed to Checkout
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  cartBadge: {
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#0E7A3D',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  shopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  itemsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  itemImageFallback: {
    fontSize: 28,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  stockText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0E7A3D',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  summaryValue: {
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
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  bottomContent: {
    flexDirection: 'row',
    marginBottom: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bottomLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  bottomTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  checkoutButton: {
    backgroundColor: '#0E7A3D',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#0E7A3D',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  checkoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});