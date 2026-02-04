import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ALL_PRODUCTS } from '@/data/products';

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));
  const [selectedSort, setSelectedSort] = useState('popular');

  const categoryName = params.categoryName || 'All Products';

  const handleProductPress = (product: any) => {
    router.push({ pathname: '/product/[productId]', params: { productId: product.id } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{categoryName as string}</ThemedText>
        <TouchableOpacity onPress={() => router.push('/cart')}>
          <View style={styles.cartButton}>
            <ThemedText style={styles.cartIcon}>🛒</ThemedText>
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>{cartCount}</ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filters Bar */}
      <View style={styles.filtersBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedSort === 'popular' && styles.filterChipActive]}
            onPress={() => setSelectedSort('popular')}
          >
            <ThemedText
              style={[styles.filterText, selectedSort === 'popular' && styles.filterTextActive]}
            >
              Popular
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedSort === 'price-low' && styles.filterChipActive]}
            onPress={() => setSelectedSort('price-low')}
          >
            <ThemedText
              style={[styles.filterText, selectedSort === 'price-low' && styles.filterTextActive]}
            >
              Price: Low to High
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedSort === 'price-high' && styles.filterChipActive]}
            onPress={() => setSelectedSort('price-high')}
          >
            <ThemedText
              style={[styles.filterText, selectedSort === 'price-high' && styles.filterTextActive]}
            >
              Price: High to Low
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedSort === 'discount' && styles.filterChipActive]}
            onPress={() => setSelectedSort('discount')}
          >
            <ThemedText
              style={[styles.filterText, selectedSort === 'discount' && styles.filterTextActive]}
            >
              Discount
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Products Count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>{ALL_PRODUCTS.length} products found</ThemedText>
      </View>

      {/* Products Grid */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.productsGrid}>
          {ALL_PRODUCTS.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleProductPress(product)}
            >
              {/* Discount Badge */}
              {product.discount > 0 && (
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>{product.discount}% OFF</ThemedText>
                </View>
              )}

              {/* Product Image */}
              <View style={styles.productImage}>
                <ThemedText style={styles.productEmoji}>{product.image}</ThemedText>
              </View>

              {/* Product Info */}
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName} numberOfLines={2}>
                  {product.name}
                </ThemedText>
                <ThemedText style={styles.productUnit}>{product.unit}</ThemedText>

                {/* Rating */}
                <View style={styles.ratingContainer}>
                  <ThemedText style={styles.ratingStar}>⭐</ThemedText>
                  <ThemedText style={styles.ratingText}>{product.rating}</ThemedText>
                </View>

                {/* Price & Add Button */}
                <View style={styles.productFooter}>
                  <View>
                    <ThemedText style={styles.productPrice}>₹{product.price}</ThemedText>
                    {product.discount > 0 && (
                      <ThemedText style={styles.originalPrice}>
                        ₹{Math.round(product.price / (1 - product.discount / 100))}
                      </ThemedText>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => addItem({ id: product.id, name: product.name, price: product.price, unit: product.unit, image: product.image }, 1)}
                  >
                    <ThemedText style={styles.addButtonText}>+</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
  filtersBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0E7A3D',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  countText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    margin: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 1,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productImage: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productEmoji: {
    fontSize: 50,
  },
  productInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minHeight: 36,
  },
  productUnit: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingStar: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: '#0E7A3D',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});