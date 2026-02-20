import { ThemedText } from '@/components/themed-text';
import { ALL_PRODUCTS } from '@/data/products';
import useCart from '@/stores/cartStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProductDetailDynamic() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = Number(params.productId);
  const product = ALL_PRODUCTS.find((p) => p.id === productId);

  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));

  const [selectedVariant, setSelectedVariant] = useState(
    product && product.unit ? { size: product.unit, price: product.price } : { size: product?.unit || '', price: product?.price || 0 }
  );
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 20 }}>
          <ThemedText>Product not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: '#FF6A00', marginTop: 12 }}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name, price: selectedVariant.price, unit: selectedVariant.size, image: product.image }, quantity as any);
    router.push('/cart');
  };

  const increaseQuantity = () => setQuantity((q) => q + 1);
  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {product.discount > 0 && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{product.discount}% OFF</ThemedText>
            </View>
          )}
          <ThemedText style={styles.productImage}>{product.image}</ThemedText>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{product.category}</ThemedText>
          </View>

          <ThemedText style={styles.productName}>{product.name}</ThemedText>

          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <ThemedText style={styles.ratingStar}>⭐</ThemedText>
              <ThemedText style={styles.ratingText}>{product.rating}</ThemedText>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View>
              <ThemedText style={styles.price}>₹{selectedVariant.price}</ThemedText>
              {product.discount > 0 && (
                <ThemedText style={styles.originalPrice}>₹{product.price}</ThemedText>
              )}
            </View>
            <View style={styles.savingsContainer}>
              <ThemedText style={styles.savingsText}>Save ₹{product.price - selectedVariant.price}</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>About Product</ThemedText>
            <ThemedText style={styles.description}>Delicious {product.name}.</ThemedText>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={decreaseQuantity}>
            <ThemedText style={styles.quantityButtonText}>−</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
          <TouchableOpacity style={styles.quantityButton} onPress={increaseQuantity}>
            <ThemedText style={styles.quantityButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
          <ThemedText style={styles.addToCartPrice}>₹{selectedVariant.price * quantity}</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB', paddingVertical: 30 },
  container: { flex: 1 },
  imageContainer: { backgroundColor: '#FFFFFF', height: 280, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  discountBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  discountText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  productImage: { fontSize: 24 },
  infoSection: { backgroundColor: '#FFFFFF', padding: 16, marginTop: 12 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  productName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingStar: { fontSize: 16, marginRight: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 28, fontWeight: '800', color: '#0E7A3D' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  savingsContainer: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  savingsText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  section: { backgroundColor: '#FFFFFF', padding: 16, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 22, color: '#6B7280' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 12, elevation: 8,  paddingBottom: 30 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 8 },
  quantityButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  quantityButtonText: { fontSize: 20, fontWeight: '700', color: '#0E7A3D' },
  quantityText: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, minWidth: 50, textAlign: 'center' },
  addToCartButton: { flex: 1, backgroundColor: '#0E7A3D', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, elevation: 6 },
  addToCartText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  addToCartPrice: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});