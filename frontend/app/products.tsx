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
import { fetchCategories, fetchProducts } from '@/services/catalogService';
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
    subcategoryId?: string;
  }>();

  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('all');

  const categoryName = params.categoryName || 'All Products';

  const getId = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return String(value?._id || value?.id || '');
  };

  const getParentCategoryId = (category: any): string => {
    if (!category?.parentCategory) return '';
    if (typeof category.parentCategory === 'string') return category.parentCategory;
    return category.parentCategory?._id || '';
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // ✅ catId is correctly string | undefined
        const catId: string | undefined =
          typeof params.categoryId === 'string' ? params.categoryId : undefined;

        const incomingSubCategoryId =
          typeof params.subcategoryId === 'string' ? params.subcategoryId : 'all';

        const cats = await fetchCategories();
        const allProducts = await fetchProducts({ limit: 300 });

        const categoryList = Array.isArray(cats) ? cats : [];
        let prods = Array.isArray(allProducts) ? allProducts : [];

        if (catId) {
          const relatedCategoryIds = new Set<string>([catId]);

          categoryList.forEach((category: any) => {
            const parentId = getParentCategoryId(category);
            const categoryId = getId(category?._id || category?.id);
            if (parentId === catId && categoryId) {
              relatedCategoryIds.add(categoryId);
            }
          });

          prods = prods.filter((product: any) => {
            const productCategoryId = getId(product?.categoryId);
            const productSubCategoryId = getId(product?.subcategoryId);
            return relatedCategoryIds.has(productCategoryId) || relatedCategoryIds.has(productSubCategoryId);
          });
        }

        if (!mounted) return;
        setProducts(prods || []);
        setCategories(categoryList);
        setSelectedSubCategoryId(incomingSubCategoryId || 'all');
      } catch (e) {
        if (mounted) {
          setProducts([]);
          setCategories([]);
          setSelectedSubCategoryId('all');
        }
      }
    }
    load();
    return () => { mounted = false; };
  }, [params.categoryId, params.subcategoryId]);

  const selectedCategoryId = typeof params.categoryId === 'string' ? params.categoryId : '';
  const subCategories = selectedCategoryId
    ? categories.filter((category) => getParentCategoryId(category) === selectedCategoryId)
    : [];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleProducts = [...products]
    .filter((product) => {
      if (selectedSubCategoryId === 'all') return true;
      return getId(product?.subcategoryId) === selectedSubCategoryId || getId(product?.categoryId) === selectedSubCategoryId;
    })
    .filter((product) => {
      if (!normalizedQuery) return true;
      return String(product?.name || '').toLowerCase().includes(normalizedQuery);
    });

  const getDiscountPercent = (product: any): number => {
    const discount = Number(product?.discount ?? 0);
    if (Number.isFinite(discount) && discount > 0) return Math.round(discount);

    const mrp = Number(product?.mrp ?? 0);
    const price = Number(product?.price ?? 0);
    if (mrp > 0 && price >= 0 && price < mrp) {
      return Math.round(((mrp - price) / mrp) * 100);
    }
    return 0;
  };

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

      {subCategories.length > 0 && (
        <View style={styles.subCategoryStripWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subCategoryStripContent}>
            <TouchableOpacity
              style={[styles.subCategoryChip, selectedSubCategoryId === 'all' && styles.subCategoryChipActive]}
              onPress={() => setSelectedSubCategoryId('all')}
            >
              <ThemedText style={[styles.subCategoryChipText, selectedSubCategoryId === 'all' && styles.subCategoryChipTextActive]}>All</ThemedText>
            </TouchableOpacity>
            {subCategories.map((subCategory: any) => {
              const subCategoryId = subCategory._id || subCategory.id;
              const isActive = selectedSubCategoryId === subCategoryId;
              return (
                <TouchableOpacity
                  key={subCategoryId}
                  style={[styles.subCategoryChip, isActive && styles.subCategoryChipActive]}
                  onPress={() => setSelectedSubCategoryId(subCategoryId)}
                >
                  <ThemedText style={[styles.subCategoryChipText, isActive && styles.subCategoryChipTextActive]}>{subCategory.name}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Products Count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>{visibleProducts.length} products found</ThemedText>
      </View>

      {/* Products Grid */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.productsGrid}>
          {visibleProducts.map((product) => (
            (() => {
              const variants = Array.isArray(product?.variants) ? product.variants : [];
              const defaultVariant = variants.find((variant: any) => variant?.isDefault) || variants[0] || null;
              const activePrice = Number(defaultVariant?.price ?? product?.price ?? 0);
              const activeMrp = Number(defaultVariant?.mrp ?? product?.mrp ?? 0);
              const activeStock = Number(defaultVariant?.stock ?? product?.stock ?? 0);
              const activeUnitLabel = String(
                defaultVariant?.label || defaultVariant?.unitType || product?.unitType || product?.unit || ''
              );
              const isOutOfStock = activeStock <= 0;
              const discountPercent = defaultVariant
                ? getDiscountPercent(defaultVariant)
                : getDiscountPercent(product);
              const previewVariants = variants.slice(0, 3);
              const extraVariantCount = Math.max(0, variants.length - previewVariants.length);

              return (
            <TouchableOpacity
              key={product._id || product.id}
              style={styles.productCard}
              onPress={() => handleProductPress(product)}
            >
              {/* Discount Badge */}
              {discountPercent > 0 && (
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
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
                  {activeUnitLabel}
                </ThemedText>

                {previewVariants.length > 0 && (
                  <View style={styles.variantStrip}>
                    {previewVariants.map((variant: any) => {
                      const label = String(variant?.label || variant?.unitType || 'Variant');
                      return (
                        <View key={String(variant?._id || label)} style={styles.variantChipMini}>
                          <ThemedText style={styles.variantChipMiniText}>{label}</ThemedText>
                        </View>
                      );
                    })}
                    {extraVariantCount > 0 && (
                      <View style={styles.variantChipMini}>
                        <ThemedText style={styles.variantChipMiniText}>+{extraVariantCount}</ThemedText>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.ratingContainer}>
                  <ThemedText style={styles.ratingStar}>⭐</ThemedText>
                  <ThemedText style={styles.ratingText}>{product.rating || '4.0'}</ThemedText>
                </View>

                <View style={styles.productFooter}>
                  <View>
                    <ThemedText style={styles.productPrice}>₹{activePrice}</ThemedText>
                    {activeMrp && activeMrp > activePrice && (
                      <ThemedText style={styles.originalPrice}>₹{activeMrp}</ThemedText>
                    )}
                    {isOutOfStock && (
                      <ThemedText style={styles.outOfStockText}>Out of stock</ThemedText>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
                    onPress={() =>
                      addItem(
                        {
                          id: defaultVariant?._id
                            ? `${product._id || product.id}:${String(defaultVariant._id)}`
                            : product._id || product.id,
                          productId: product._id || product.id,
                          variantId: defaultVariant?._id ? String(defaultVariant._id) : undefined,
                          variantLabel: defaultVariant?.label || defaultVariant?.unitType || undefined,
                          name: product.name,
                          price: activePrice,
                          unit: activeUnitLabel,
                          image: resolveImageUrl(product.images?.[0] || product.image || ''),
                          stock: activeStock,
                        },
                        1
                      )
                    }
                    disabled={isOutOfStock}
                  >
                    <ThemedText style={styles.addButtonText}>{isOutOfStock ? '×' : '+'}</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
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
  subCategoryStripWrap:    { backgroundColor: '#FFFFFF', paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  subCategoryStripContent: { paddingHorizontal: 12, gap: 8 },
  subCategoryChip:         { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  subCategoryChipActive:   { backgroundColor: '#0E7A3D' },
  subCategoryChipText:     { fontSize: 12, color: '#374151', fontWeight: '600' },
  subCategoryChipTextActive: { color: '#FFFFFF' },
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
  variantStrip:            { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  variantChipMini:         { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  variantChipMiniText:     { fontSize: 10, color: '#4B5563', fontWeight: '600' },
  productFooter:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice:            { fontSize: 16, fontWeight: '700', color: '#0E7A3D' },
  originalPrice:           { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  outOfStockText:          { fontSize: 11, color: '#EF4444', fontWeight: '600', marginTop: 2 },
  addButton:               { backgroundColor: '#0E7A3D', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  addButtonDisabled:       { backgroundColor: '#9CA3AF' },
  addButtonText:           { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});