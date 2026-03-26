import { ThemedText } from "@/components/themed-text";
import { Product } from "@/types";
import { resolveImageUrl } from "@/config/api";
import { fetchProductsPage } from "@/services/catalogService";
import {
  getResponsiveFont,
  getScreenPadding,
  createResponsiveStyles,
  responsiveVerticalScale,
} from "@/utils/responsive";
import { sanitizeSearchQuery } from "@/utils/sanitize";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RECENT_SEARCHES = ["Amul Milk", "Tomatoes", "Parle-G", "Aashirvaad Atta"];

const RECENT_SEARCHES_KEY = "recent_searches_v1";
const SEARCH_PAGE_SIZE = 20;

export default function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const screenPadding = getScreenPadding(width);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const normalizedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const sanitized = parsed
            .map((item: any) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 5);
          setRecentSearches(sanitized.length ? sanitized : RECENT_SEARCHES);
        }
      } catch {
        // fallback to default
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recentSearches),
    ).catch(() => {});
  }, [recentSearches]);

  useEffect(() => {
    if (!normalizedQuery) {
      setResults([]);
      setPage(1);
      setHasMore(false);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const pageResult = await fetchProductsPage({
          q: normalizedQuery,
          page: 1,
          limit: SEARCH_PAGE_SIZE,
          sortBy: "demand",
        });
        if (!active) return;
        setResults(pageResult.data);
        setPage(pageResult.page);
        setHasMore(pageResult.hasMore);
        setTotalCount(pageResult.total);
      } finally {
        if (active) setLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  const loadMore = async () => {
    if (!normalizedQuery || loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const pageResult = await fetchProductsPage({
        q: normalizedQuery,
        page: nextPage,
        limit: SEARCH_PAGE_SIZE,
        sortBy: "demand",
      });

      setResults((prev) => {
        const merged = [...prev, ...pageResult.data];
        const seen = new Set<string>();
        return merged.filter((product: any) => {
          const id = String(product?._id || product?.id || "");
          if (!id) return false;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });

      setPage(pageResult.page);
      setHasMore(pageResult.hasMore);
      setTotalCount(pageResult.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = (query: string) => {
    /**
     * SECURITY: Sanitize search query before storing or searching
     */
    const sanitized = sanitizeSearchQuery(query.trim(), 100);
    if (!sanitized) return;

    const exists = recentSearches.some(
      (item) => item.toLowerCase() === sanitized.toLowerCase(),
    );
    if (!exists) {
      setRecentSearches([sanitized, ...recentSearches.slice(0, 4)]);
    }
    setSearchQuery(sanitized);
  };

  const clearRecentSearch = (index: number) => {
    setRecentSearches(recentSearches.filter((_, i) => i !== index));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
  };

  let resultsContent: React.ReactNode = results.map((product: any) => {
    const productId = product?._id || product?.id;
    const imageUrl =
      Array.isArray(product?.images) && product.images[0]
        ? resolveImageUrl(product.images[0])
        : "";

    return (
      <TouchableOpacity
        key={String(productId)}
        style={[styles.resultItem, { paddingHorizontal: screenPadding }]}
        onPress={() =>
          router.push({
            pathname: "/product/[productId]",
            params: { productId },
          })
        }
      >
        <View style={styles.resultImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.resultImage} />
          ) : (
            <ThemedText style={styles.resultFallback}>🛍️</ThemedText>
          )}
        </View>
        <View style={styles.resultInfo}>
          <ThemedText style={styles.resultName} numberOfLines={1}>
            {product?.name}
          </ThemedText>
          <ThemedText style={styles.resultMeta}>
            ₹{Number(product?.price ?? 0)}
          </ThemedText>
        </View>
        <ThemedText style={styles.arrowIcon}>→</ThemedText>
      </TouchableOpacity>
    );
  });

  if (loading) {
    resultsContent = (
      <View style={styles.emptyWrap}>
        <ThemedText style={styles.emptyText}>Searching products...</ThemedText>
      </View>
    );
  } else if (results.length === 0) {
    resultsContent = (
      <View style={styles.emptyWrap}>
        <ThemedText style={styles.emptyTitle}>No results found</ThemedText>
        <ThemedText style={styles.emptyText}>Try another keyword</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.header, { paddingHorizontal: screenPadding }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText style={styles.backIcon}>‹</ThemedText>
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
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <ThemedText style={styles.clearIcon}>✕</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {searchQuery.length === 0 && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  {
                    fontSize: getResponsiveFont(width, 16),
                    paddingHorizontal: 0,
                    marginBottom: 0,
                  },
                ]}
              >
                Recent Searches
              </ThemedText>
              <TouchableOpacity onPress={clearAllRecent}>
                <ThemedText style={styles.clearAll}>Clear All</ThemedText>
              </TouchableOpacity>
            </View>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={search}
                style={[
                  styles.recentItem,
                  { paddingHorizontal: screenPadding },
                ]}
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

        {searchQuery.length === 0 && (
          <View style={[styles.section, { paddingHorizontal: screenPadding }]}>
            <ThemedText style={[styles.sectionTitle, { paddingHorizontal: 0 }]}>
              Start typing to search products
            </ThemedText>
          </View>
        )}

        {searchQuery.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Results</ThemedText>
            {resultsContent}

            {!loading && results.length > 0 && (
              <View style={styles.paginationWrap}>
                <ThemedText style={styles.resultCountText}>
                  Showing {results.length} of {totalCount}
                </ThemedText>
                {hasMore ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMore}
                    disabled={loadingMore}
                  >
                    <ThemedText style={styles.loadMoreButtonText}>
                      {loadingMore ? "Loading..." : "Load More"}
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <ThemedText style={styles.endText}>
                    All results loaded
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: responsiveVerticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createResponsiveStyles({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginRight: 8,
  },
  backIcon: { 
    fontSize: 20, 
    color: "#374151", 
    fontWeight: "600",
    textAlign: "center",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
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
    color: "#111827",
  },
  clearIcon: {
    fontSize: 18,
    color: "#6B7280",
    padding: 4,
  },
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  clearAll: {
    fontSize: 13,
    color: "#FF6A00",
    fontWeight: "600",
  },
  arrowIcon: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  recentIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  removeButton: {
    padding: 4,
  },
  removeIcon: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultFallback: {
    fontSize: 18,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  resultMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
  },
  paginationWrap: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  resultCountText: {
    fontSize: 12,
    color: "#6B7280",
  },
  loadMoreButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadMoreButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  endText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
});
