import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Dummy categories data
const CATEGORIES = [
  { id: 1, name: 'Vegetables', icon: '🥬', color: '#10B981' },
  { id: 2, name: 'Fruits', icon: '🍎', color: '#F59E0B' },
  { id: 3, name: 'Dairy', icon: '🥛', color: '#3B82F6' },
  { id: 4, name: 'Snacks', icon: '🍿', color: '#EF4444' },
  { id: 5, name: 'Beverages', icon: '🥤', color: '#8B5CF6' },
  { id: 6, name: 'Bakery', icon: '🍞', color: '#F97316' },
  { id: 7, name: 'Meat', icon: '🍖', color: '#DC2626' },
  { id: 8, name: 'Frozen', icon: '🧊', color: '#06B6D4' },
];

// Dummy products data
const FEATURED_PRODUCTS = [
  { id: 1, name: 'Fresh Tomatoes', price: 40, unit: 'kg', image: '🍅', category: 'Vegetables' },
  { id: 2, name: 'Organic Milk', price: 60, unit: 'L', image: '🥛', category: 'Dairy' },
  { id: 3, name: 'Red Apples', price: 120, unit: 'kg', image: '🍎', category: 'Fruits' },
  { id: 4, name: 'Fresh Bread', price: 35, unit: 'pack', image: '🍞', category: 'Bakery' },
  { id: 5, name: 'Potato Chips', price: 25, unit: 'pack', image: '🍿', category: 'Snacks' },
  { id: 6, name: 'Orange Juice', price: 80, unit: 'L', image: '🥤', category: 'Beverages' },
];

export default function HomeScreen() {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.reduce((sum: number, it) => sum + it.quantity, 0));
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with Cart Button */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greeting}>Hello! 👋</ThemedText>
            <View style={styles.brandContainer}>
              <ThemedText style={styles.brandGray}>Lakhanmajra </ThemedText>
              <ThemedText style={styles.brandOrange}>Delivery</ThemedText>
            </View>
          </View>
          
          {/* Cart Button */}
          <TouchableOpacity 
            style={styles.cartButton} 
            onPress={() => router.push('/cart')}
          >
            <ThemedText style={styles.cartIcon}>🛒</ThemedText>
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>{cartCount}</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => router.push('/location')}
        >
          <ThemedText style={styles.locationIcon}>📍</ThemedText>
          <ThemedText style={styles.locationText}>Delivering to Ludhiana, Punjab</ThemedText>
          <ThemedText style={styles.changeText}>Change</ThemedText>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <ThemedText style={styles.bannerTitle}>Fresh Groceries</ThemedText>
            <ThemedText style={styles.bannerSubtitle}>Delivered to your doorstep</ThemedText>
            <View style={styles.bannerBadge}>
              <ThemedText style={styles.bannerBadgeText}>30 min delivery 🚀</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.bannerEmoji}>🛒</ThemedText>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAll}>See All</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <ThemedText style={styles.categoryEmoji}>{category.icon}</ThemedText>
                </View>
                <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Featured Products</ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAll}>See All</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.productsGrid}>
            {FEATURED_PRODUCTS.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <View style={styles.productImage}>
                  <ThemedText style={styles.productEmoji}>{product.image}</ThemedText>
                </View>
                <View style={styles.productInfo}>
                  <ThemedText style={styles.productName}>{product.name}</ThemedText>
                  <ThemedText style={styles.productCategory}>{product.category}</ThemedText>
                  <View style={styles.productFooter}>
                    <ThemedText style={styles.productPrice}>₹{product.price}/{product.unit}</ThemedText>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() =>
                        addItem({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          unit: product.unit,
                          image: product.image,
                        }, 1)
                      }
                    >
                      <ThemedText style={styles.addButtonText}>+</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandGray: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C7C7CC',
  },
  brandOrange: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6A00',
  },
  // Cart Button Styles
  cartButton: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cartIcon: {
    fontSize: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  changeText: {
    fontSize: 12,
    color: '#FF6A00',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF6A00',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#FF6A00',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 10,
  },
  bannerBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6A00',
  },
  bannerEmoji: {
    fontSize: 60,
    opacity: 0.9,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  seeAll: {
    fontSize: 13,
    color: '#FF6A00',
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 8,
  },
  categoryIcon: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },
  productCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  productImage: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
  },
  productCategory: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6A00',
  },
  addButton: {
    backgroundColor: '#FF6A00',
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});