import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchProducts } from '@/services/catalogService';
import { resolveImageUrl } from '@/config/api';

// ── Helper: render product image from MinIO URL or fallback ──────────────────
function ProductImage({ images, name }: { images?: string[]; name: string }) {
  const [errored, setErrored] = useState(false);
  const rawUri = images && images.length > 0 ? images[0] : null;
  const uri = resolveImageUrl(rawUri);

  if (uri && !errored) {
    return (
      <Image
        source={{ uri }}
        style={styles.productImg}
        resizeMode="cover"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <View style={styles.productImgPlaceholder}>
      <ThemedText style={styles.productImgPlaceholderText}>
        {name?.charAt(0)?.toUpperCase() || '?'}
      </ThemedText>
    </View>
  );
}

export default function ProductsScreen() {
  const router = useRouter();

  // ✅ Fix: typed params so categoryId is string | undefined (not string[])
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);

  const categoryName = params.categoryName || 'All Products';

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // ✅ Fix: catId is now correctly string | undefined
        const catId: string | undefined =
          typeof params.categoryId === 'string' ? params.categoryId : undefined;

        const fetchParams: { limit: number; categoryId?: string } = { limit: 100 };
        if (catId) fetchParams.categoryId = catId;

        const prods = await fetchProducts(fetchParams);
        if (!mounted) return;
        setProducts(prods || []);
      } catch (e) {
        if (mounted) setProducts([]);
      }
    }
    load();
    return () => { mounted = false; };
  }, [params.categoryId]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleProducts = [...products]
    .filter((product) => {
      if (!normalizedQuery) return true;
      return String(product?.name || '').toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  const handleProductPress = (product: any) => {
    const id = product._id || product.id;
    router.push({ pathname: '/product/[productId]', params: { productId: id } });
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{categoryName}</ThemedText>
        <TouchableOpacity onPress={() => router.push('/cart')}>
          <View style={styles.cartButton}>
            <ThemedText style={styles.cartIcon}>🛒</ThemedText>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <ThemedText style={styles.cartBadgeText}>{cartCount}</ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.filtersBar}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search product"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {/* Products Count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>{visibleProducts.length} products found (A-Z)</ThemedText>
      </View>

      {/* Products Grid */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.productsGrid}>
          {visibleProducts.map((product) => (
            <TouchableOpacity
              key={product._id || product.id}
              style={styles.productCard}
              onPress={() => handleProductPress(product)}
            >
              {/* Discount Badge */}
              {product.discount > 0 && (
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>{product.discount}% OFF</ThemedText>
                </View>
              )}

              {/* ── MinIO Product Image ── */}
              <View style={styles.productImageContainer}>
                <ProductImage images={product.images} name={product.name} />
              </View>

              {/* Product Info */}
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName} numberOfLines={2}>
                  {product.name}
                </ThemedText>
                <ThemedText style={styles.productUnit}>
                  {product.unitType || product.unit || ''}
                </ThemedText>

                <View style={styles.ratingContainer}>
                  <ThemedText style={styles.ratingStar}>⭐</ThemedText>
                  <ThemedText style={styles.ratingText}>{product.rating || '4.0'}</ThemedText>
                </View>

                <View style={styles.productFooter}>
                  <View>
                    <ThemedText style={styles.productPrice}>₹{product.price}</ThemedText>
                    {product.mrp && product.mrp > product.price && (
                      <ThemedText style={styles.originalPrice}>₹{product.mrp}</ThemedText>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() =>
                      addItem(
                        {
                          id: product._id || product.id,
                          name: product.name,
                          price: product.price,
                          unit: product.unitType || product.unit || '',
                          image: resolveImageUrl(product.images?.[0] || product.image || ''),
                        },
                        1
                      )
                    }
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
  safe:                    { flex: 1, backgroundColor: '#F9FAFB', paddingVertical: 40 },
  header:                  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4, backgroundColor: '#0E7A3D', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  backButton:              { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon:                { fontSize: 28, color: '#FFFFFF', fontWeight: '600' },
  headerTitle:             { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1, marginLeft: 12 },
  cartButton:              { position: 'relative' },
  cartIcon:                { fontSize: 24 },
  cartBadge:               { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6A00', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText:           { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  filtersBar:              { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchInput:             { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  countContainer:          { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB' },
  countText:               { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  container:               { flex: 1 },
  productsGrid:            { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 8 },
  productCard:             { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, margin: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, position: 'relative' },
  discountBadge:           { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, zIndex: 1 },
  discountText:            { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  productImageContainer:   { backgroundColor: '#F9FAFB', borderRadius: 8, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  productImg:              { width: '100%', height: '100%', borderRadius: 8 },
  productImgPlaceholder:   { width: '100%', height: '100%', backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  productImgPlaceholderText: { fontSize: 36, fontWeight: '700', color: '#9CA3AF' },
  productInfo:             { gap: 4 },
  productName:             { fontSize: 14, fontWeight: '600', color: '#111827', minHeight: 36 },
  productUnit:             { fontSize: 11, color: '#9CA3AF' },
  ratingContainer:         { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingStar:              { fontSize: 12, marginRight: 4 },
  ratingText:              { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  productFooter:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice:            { fontSize: 16, fontWeight: '700', color: '#0E7A3D' },
  originalPrice:           { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  addButton:               { backgroundColor: '#0E7A3D', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  addButtonText:           { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});