/**
 * Product Grid Component
 * Displays grid of products with add to cart functionality
 */

import React, { useMemo } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { ThemedText } from './themed-text';
import { Product } from '@/types';
import { resolveImageUrl } from '@/config/api';
import { verticalScale, scale } from 'react-native-size-matters';

interface ProductGridProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  numColumns?: number;
  gap?: number;
}

/**
 * Reusable product grid component
 * Displays products in a grid layout with memoization for performance
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onProductPress,
  onAddToCart,
  numColumns = 2,
  gap = 12,
}) => {
  const { width } = Dimensions.get('window');
  const containerPadding = 16;
  const totalGap = (numColumns - 1) * gap;
  const itemWidth = (width - containerPadding * 2 - totalGap) / numColumns;

  // Memoize to avoid unnecessary re-renders
  const memoizedProducts = useMemo(() => products, [products]);

  const renderProduct = ({ item }: { item: Product }) => {
    const discount = item.discount ? Math.round(item.discount) : 0;

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: itemWidth }]}
        onPress={() => onProductPress(item)}
        activeOpacity={0.7}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: resolveImageUrl(item.image),
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{discount}% OFF</ThemedText>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {item.name}
          </ThemedText>

          <View style={styles.priceContainer}>
            <ThemedText style={styles.price}>₹{item.price}</ThemedText>
            {item.originalPrice && item.originalPrice > item.price && (
              <ThemedText style={styles.originalPrice}>
                ₹{item.originalPrice}
              </ThemedText>
            )}
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddToCart(item)}
            activeOpacity={0.6}
          >
            <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!memoizedProducts || memoizedProducts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No products available</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={memoizedProducts}
      renderItem={renderProduct}
      keyExtractor={(item) => item._id || item.id || `product-${Math.random()}`}
      numColumns={numColumns}
      columnWrapperStyle={{ gap }}
      scrollEnabled={false}
      contentContainerStyle={{ paddingHorizontal: containerPadding }}
    />
  );
};

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productInfo: {
    padding: scale(12),
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
