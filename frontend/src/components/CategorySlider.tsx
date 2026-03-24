/**
 * Category Slider Component
 * Displays horizontal scrollable list of product categories
 */

import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { Category } from '@/types';
import { scale, verticalScale } from 'react-native-size-matters';

interface CategorySliderProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  visibleOnScreen?: number;
  getCategoryColor?: (categoryName: string) => string;
  getCategoryIcon?: (categoryName: string) => keyof typeof MaterialCommunityIcons.glyphMap;
}

/**
 * Reusable category slider component
 * Extracted from home.tsx to reduce component size
 */
export const CategorySlider: React.FC<CategorySliderProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  visibleOnScreen: _visibleOnScreen = 5,
  getCategoryColor = (_name: string) => '#F3F4F6',
  getCategoryIcon = (_name: string) => 'shopping-outline',
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const catId = category._id || category.id || '';
          const isSelected = selectedCategoryId === catId;
          const bgColor = getCategoryColor(category.name);
          const icon = getCategoryIcon(category.name);

          return (
            <TouchableOpacity
              key={catId}
              style={[
                styles.categoryCard,
                { backgroundColor: bgColor, borderWidth: isSelected ? 2 : 0 },
              ]}
              onPress={() => onSelectCategory(catId)}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name={icon}
                size={scale(28)}
                color={isSelected ? '#3b82f6' : '#6b7280'}
              />
              <ThemedText
                style={[
                  styles.categoryName,
                  { color: isSelected ? '#1f2937' : '#6b7280' },
                ]}
                numberOfLines={1}
              >
                {category.name}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: verticalScale(12),
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(10),
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: 12,
    borderColor: '#3b82f6',
    minWidth: scale(80),
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: verticalScale(6),
    textAlign: 'center',
  },
});
