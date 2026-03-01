import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

// Dummy product detail data
const PRODUCT_DETAIL = {
  id: 1,
  name: 'Fresh Tomatoes',
  image: '🍅',
  category: 'Vegetables',
  rating: 4.5,
  reviews: 250,
  price: 40,
  originalPrice: 50,
  discount: 20,
  unit: 'kg',
  inStock: true,
  description:
    'Fresh, juicy tomatoes handpicked from local farms. Rich in vitamins and minerals. Perfect for salads, cooking, and sauces. No artificial chemicals or preservatives.',
  variants: [
    { id: 1, size: '500g', price: 20 },
    { id: 2, size: '1kg', price: 40 },
    { id: 3, size: '2kg', price: 75 },
  ],
  nutritionFacts: [
    { label: 'Calories', value: '18 kcal' },
    { label: 'Carbs', value: '3.9g' },
    { label: 'Protein', value: '0.9g' },
    { label: 'Vitamin C', value: '14mg' },
  ],
  benefits: [
    'Rich in antioxidants',
    'Good for heart health',
    'Improves skin health',
    'Aids in digestion',
  ],
};

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.length);
  const [selectedVariant, setSelectedVariant] = useState(PRODUCT_DETAIL.variants[1]);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    // Add to global cart
    addItem({ id: String(PRODUCT_DETAIL.id), name: PRODUCT_DETAIL.name, price: selectedVariant.price, unit: selectedVariant.size, image: PRODUCT_DETAIL.image }, quantity);

    Alert.alert(
      'Added to Cart! 🛒',
      `${quantity}x ${PRODUCT_DETAIL.name} (${selectedVariant.size}) has been added to your cart.`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'Go to Cart', onPress: () => router.push('/cart') },
      ]
    );
  };

  const increaseQuantity = () => setQuantity(quantity + 1);
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Product Details</ThemedText>
        <TouchableOpacity onPress={() => router.push('/cart')}>
          <View style={styles.cartButton}>
            <ThemedText style={styles.cartIcon}>🛒</ThemedText>
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>{cartCount}</ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {PRODUCT_DETAIL.discount > 0 && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{PRODUCT_DETAIL.discount}% OFF</ThemedText>
            </View>
          )}
          <ThemedText style={styles.productImage}>{PRODUCT_DETAIL.image}</ThemedText>
        </View>

        {/* Product Info Section */}
        <View style={styles.infoSection}>
          {/* Category */}
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{PRODUCT_DETAIL.category}</ThemedText>
          </View>

          {/* Product Name */}
          <ThemedText style={styles.productName}>{PRODUCT_DETAIL.name}</ThemedText>

          {/* Rating & Reviews */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <ThemedText style={styles.ratingStar}>⭐</ThemedText>
              <ThemedText style={styles.ratingText}>
                {PRODUCT_DETAIL.rating} ({PRODUCT_DETAIL.reviews} reviews)
              </ThemedText>
            </View>
            {PRODUCT_DETAIL.inStock ? (
              <View style={styles.stockBadge}>
                <ThemedText style={styles.stockText}>In Stock</ThemedText>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.outOfStock]}>
                <ThemedText style={[styles.stockText, styles.outOfStockText]}>
                  Out of Stock
                </ThemedText>
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <View>
              <ThemedText style={styles.price}>₹{selectedVariant.price}</ThemedText>
              {PRODUCT_DETAIL.discount > 0 && (
                <ThemedText style={styles.originalPrice}>₹{PRODUCT_DETAIL.originalPrice}</ThemedText>
              )}
            </View>
            <View style={styles.savingsContainer}>
              <ThemedText style={styles.savingsText}>
                Save ₹{PRODUCT_DETAIL.originalPrice - selectedVariant.price}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Variants Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Select Size</ThemedText>
          <View style={styles.variantsContainer}>
            {PRODUCT_DETAIL.variants.map((variant) => (
              <TouchableOpacity
                key={variant.id}
                style={[
                  styles.variantChip,
                  selectedVariant.id === variant.id && styles.variantChipActive,
                ]}
                onPress={() => setSelectedVariant(variant)}
              >
                <ThemedText
                  style={[
                    styles.variantText,
                    selectedVariant.id === variant.id && styles.variantTextActive,
                  ]}
                >
                  {variant.size}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.variantPrice,
                    selectedVariant.id === variant.id && styles.variantPriceActive,
                  ]}
                >
                  ₹{variant.price}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About Product</ThemedText>
          <ThemedText style={styles.description}>{PRODUCT_DETAIL.description}</ThemedText>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Health Benefits</ThemedText>
          {PRODUCT_DETAIL.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <ThemedText style={styles.benefitIcon}>✓</ThemedText>
              <ThemedText style={styles.benefitText}>{benefit}</ThemedText>
            </View>
          ))}
        </View>

        {/* Nutrition Facts */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Nutrition Facts (per 100g)</ThemedText>
          <View style={styles.nutritionGrid}>
            {PRODUCT_DETAIL.nutritionFacts.map((fact, index) => (
              <View key={index} style={styles.nutritionItem}>
                <ThemedText style={styles.nutritionLabel}>{fact.label}</ThemedText>
                <ThemedText style={styles.nutritionValue}>{fact.value}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Fixed Bar */}
      <View style={styles.bottomBar}>
        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={decreaseQuantity}>
            <ThemedText style={styles.quantityButtonText}>−</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
          <TouchableOpacity style={styles.quantityButton} onPress={increaseQuantity}>
            <ThemedText style={styles.quantityButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
          <ThemedText style={styles.addToCartPrice}>₹{selectedVariant.price * quantity}</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#111827',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  cartButton: {
    position: 'relative',
  },
  cartIcon: {
    fontSize: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6A00',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: '#FFFFFF',
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productImage: {
    fontSize: 140,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stockBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  outOfStock: {
    backgroundColor: '#FEE2E2',
  },
  outOfStockText: {
    color: '#DC2626',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0E7A3D',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  savingsContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  variantsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  variantChip: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  variantChipActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#0E7A3D',
  },
  variantText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  variantTextActive: {
    color: '#0E7A3D',
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  variantPriceActive: {
    color: '#0E7A3D',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#0E7A3D',
    marginRight: 10,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    minWidth: 50,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#0E7A3D',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#0E7A3D',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addToCartPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});