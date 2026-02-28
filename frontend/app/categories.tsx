import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchCategories } from '@/services/catalogService';
import { resolveImageUrl } from '@/config/api';

// Categories will be loaded from backend

export default function CategoriesScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);

  const getParentCategoryId = (category: any): string => {
    if (!category?.parentCategory) return '';
    if (typeof category.parentCategory === 'string') return category.parentCategory;
    return category.parentCategory?._id || '';
  };

  const mainCategories = categories.filter((category) => !getParentCategoryId(category));

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cats = await fetchCategories();
        if (!mounted) return;
        setCategories(cats || []);
      } catch (e) {
        // fallback to empty
        if (mounted) setCategories([]);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const openProductsByCategory = (categoryId: string, categoryName: string) => {
    router.push({
      pathname: '/products',
      params: {
        categoryId,
        categoryName,
      },
    });
  };

  const handleCategoryPress = (category: any) => {
    const categoryId = category._id || category.id;
    openProductsByCategory(categoryId, category.name);
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
          {mainCategories.map((category: any) => (
            (() => {
              const imageUrl = resolveImageUrl(category.image);
              const categoryId = category._id || category.id;

              return (
            <View key={categoryId}>
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
              >
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: (category.color || '#F3F4F6') + '20' },
                  ]}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.categoryImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <ThemedText style={styles.categoryIcon}>{category.icon || category.emoji || '📦'}</ThemedText>
                  )}
                </View>
                <View style={styles.categoryInfo}>
                  <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                  <ThemedText style={styles.categoryCount}>
                    {category.itemCount || ''}
                  </ThemedText>
                </View>
                <ThemedText style={styles.arrowIcon}>→</ThemedText>
              </TouchableOpacity>
            </View>
              );
            })()
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
    paddingVertical: 40,
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
  categoryImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
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
  arrowIcon: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});