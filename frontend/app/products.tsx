import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
  const cartCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));
  const [selectedSort, setSelectedSort] = useState('popular');
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

  const getSortedProducts = () => {
    const sorted = [...products];
    switch (selectedSort) {
      case 'price-low':  return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high': return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'discount':   return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      default:           return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
  };

  const handleProductPress = (product: any) => {
    const id = product._id || product.id;
    router.push({ pathname: '/product/[productId]', params: { productId: id } });
  };

  const sortOptions = [
    { key: 'popular',    label: 'Popular' },
    { key: 'price-low',  label: 'Price: Low to High' },
    { key: 'price-high', label: 'Price: High to Low' },
    { key: 'discount',   label: 'Discount' },
  ];

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

      {/* Sort Filter Bar */}
      <View style={styles.filtersBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sortOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, selectedSort === opt.key && styles.filterChipActive]}
              onPress={() => setSelectedSort(opt.key)}
            >
              <ThemedText
                style={[styles.filterText, selectedSort === opt.key && styles.filterTextActive]}
              >
                {opt.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>{products.length} products found</ThemedText>
      </View>

      {/* Products Grid */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.productsGrid}>
          {getSortedProducts().map((product) => (
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
                  {product.unit || product.unitType || ''}
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
                          unit: product.unit || product.unitType || '',
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
  filterChip:              { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive:        { backgroundColor: '#0E7A3D' },
  filterText:              { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive:        { color: '#FFFFFF' },
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