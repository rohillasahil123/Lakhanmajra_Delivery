import { ThemedText } from '@/components/themed-text';
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

// Dummy data
const SEARCH_SUGGESTIONS = [
  'Fresh Vegetables',
  'Organic Milk',
  'Bread & Bakery',
  'Fruits',
  'Snacks',
  'Beverages',
  'Dairy Products',
  'Eggs',
];

const RECENT_SEARCHES = [
  'Amul Milk',
  'Tomatoes',
  'Parle-G',
  'Aashirvaad Atta',
];

const TRENDING_SEARCHES = [
  { id: 1, query: 'Fresh Vegetables', icon: '🥬' },
  { id: 2, query: 'Dairy Products', icon: '🥛' },
  { id: 3, query: 'Fruits', icon: '🍎' },
  { id: 4, query: 'Snacks', icon: '🍿' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Add to recent searches
      if (!recentSearches.includes(query)) {
        setRecentSearches([query, ...recentSearches.slice(0, 4)]);
      }
      // Navigate to search results or products
      router.push({
        pathname: '/products',
        params: { search: query },
      });
    }
  };

  const clearRecentSearch = (index: number) => {
    setRecentSearches(recentSearches.filter((_, i) => i !== index));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <ThemedText style={styles.clearIcon}>✕</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Suggestions (when typing) */}
        {searchQuery.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Suggestions</ThemedText>
            {SEARCH_SUGGESTIONS.filter((item) =>
              item.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSearch(suggestion)}
              >
                <ThemedText style={styles.suggestionIcon}>🔍</ThemedText>
                <ThemedText style={styles.suggestionText}>{suggestion}</ThemedText>
                <ThemedText style={styles.arrowIcon}>→</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Searches */}
        {searchQuery.length === 0 && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Searches</ThemedText>
              <TouchableOpacity onPress={clearAllRecent}>
                <ThemedText style={styles.clearAll}>Clear All</ThemedText>
              </TouchableOpacity>
            </View>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => handleSearch(search)}
              >
                <ThemedText style={styles.recentIcon}>🕒</ThemedText>
                <ThemedText style={styles.recentText}>{search}</ThemedText>
                <TouchableOpacity
                  onPress={() => clearRecentSearch(index)}
                  style={styles.removeButton}
                >
                  <ThemedText style={styles.removeIcon}>✕</ThemedText>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Trending Searches */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Trending Searches</ThemedText>
            <View style={styles.trendingGrid}>
              {TRENDING_SEARCHES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.trendingCard}
                  onPress={() => handleSearch(item.query)}
                >
                  <ThemedText style={styles.trendingIcon}>{item.icon}</ThemedText>
                  <ThemedText style={styles.trendingText}>{item.query}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Popular Categories */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Popular Categories</ThemedText>
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => router.push('/categories')}
            >
              <View style={styles.categoryIcon}>
                <ThemedText style={styles.categoryEmoji}>🥬</ThemedText>
              </View>
              <ThemedText style={styles.categoryText}>Vegetables & Fruits</ThemedText>
              <ThemedText style={styles.arrowIcon}>→</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => router.push('/categories')}
            >
              <View style={styles.categoryIcon}>
                <ThemedText style={styles.categoryEmoji}>🥛</ThemedText>
              </View>
              <ThemedText style={styles.categoryText}>Dairy & Eggs</ThemedText>
              <ThemedText style={styles.arrowIcon}>→</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => router.push('/categories')}
            >
              <View style={styles.categoryIcon}>
                <ThemedText style={styles.categoryEmoji}>🍿</ThemedText>
              </View>
              <ThemedText style={styles.categoryText}>Snacks & Beverages</ThemedText>
              <ThemedText style={styles.arrowIcon}>→</ThemedText>
            </TouchableOpacity>
          </View>
        )}

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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 28,
    color: '#111827',
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearIcon: {
    fontSize: 18,
    color: '#6B7280',
    padding: 4,
  },
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  clearAll: {
    fontSize: 13,
    color: '#FF6A00',
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.5,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  removeButton: {
    padding: 4,
  },
  removeIcon: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  trendingCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trendingIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  trendingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
});