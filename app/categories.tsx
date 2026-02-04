import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

// All categories with subcategories
const CATEGORIES = [
  {
    id: 1,
    name: 'Vegetables & Fruits',
    icon: '🥬',
    color: '#10B981',
    itemCount: 120,
    subcategories: ['Fresh Vegetables', 'Seasonal Fruits', 'Exotic Vegetables', 'Organic'],
  },
  {
    id: 2,
    name: 'Dairy & Eggs',
    icon: '🥛',
    color: '#3B82F6',
    itemCount: 85,
    subcategories: ['Milk', 'Curd & Yogurt', 'Paneer & Cheese', 'Eggs', 'Butter & Ghee'],
  },
  {
    id: 3,
    name: 'Snacks & Beverages',
    icon: '🍿',
    color: '#EF4444',
    itemCount: 200,
    subcategories: ['Chips & Namkeen', 'Biscuits', 'Cold Drinks', 'Tea & Coffee', 'Chocolates'],
  },
  {
    id: 4,
    name: 'Bakery & Bread',
    icon: '🍞',
    color: '#F97316',
    itemCount: 45,
    subcategories: ['Bread', 'Buns & Pav', 'Cakes & Pastries', 'Cookies'],
  },
  {
    id: 5,
    name: 'Atta, Rice & Dal',
    icon: '🌾',
    color: '#FBBF24',
    itemCount: 95,
    subcategories: ['Atta & Flour', 'Rice & Rice Products', 'Dal & Pulses', 'Organic'],
  },
  {
    id: 6,
    name: 'Cooking Essentials',
    icon: '🧂',
    color: '#8B5CF6',
    itemCount: 150,
    subcategories: ['Masala & Spices', 'Oil & Ghee', 'Salt & Sugar', 'Dry Fruits'],
  },
  {
    id: 7,
    name: 'Personal Care',
    icon: '🧴',
    color: '#EC4899',
    itemCount: 180,
    subcategories: ['Bath & Body', 'Hair Care', 'Oral Care', 'Skin Care'],
  },
  {
    id: 8,
    name: 'Household Items',
    icon: '🧹',
    color: '#06B6D4',
    itemCount: 130,
    subcategories: ['Cleaning', 'Detergents', 'Kitchen Accessories', 'Fresheners'],
  },
  {
    id: 9,
    name: 'Frozen & Meat',
    icon: '🍖',
    color: '#DC2626',
    itemCount: 60,
    subcategories: ['Chicken', 'Fish & Seafood', 'Mutton', 'Frozen Snacks'],
  },
  {
    id: 10,
    name: 'Baby Care',
    icon: '👶',
    color: '#F59E0B',
    itemCount: 75,
    subcategories: ['Diapers', 'Baby Food', 'Baby Care', 'Toys'],
  },
];

export default function CategoriesScreen() {
  const router = useRouter();

  const handleCategoryPress = (category: any) => {
    router.push({
      pathname: '/products',
      params: {
        categoryId: category.id,
        categoryName: category.name,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>All Categories</ThemedText>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category)}
            >
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: category.color + '20' },
                ]}
              >
                <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
              </View>
              <View style={styles.categoryInfo}>
                <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                <ThemedText style={styles.categoryCount}>
                  {category.itemCount} items
                </ThemedText>
                <View style={styles.subcategoriesContainer}>
                  {category.subcategories.slice(0, 2).map((sub, index) => (
                    <View key={index} style={styles.subcategoryTag}>
                      <ThemedText style={styles.subcategoryText}>{sub}</ThemedText>
                    </View>
                  ))}
                  {category.subcategories.length > 2 && (
                    <ThemedText style={styles.moreText}>
                      +{category.subcategories.length - 2} more
                    </ThemedText>
                  )}
                </View>
              </View>
              <ThemedText style={styles.arrowIcon}>→</ThemedText>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  searchIcon: {
    fontSize: 24,
    padding: 8,
  },
  container: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  subcategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  subcategoryTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subcategoryText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});