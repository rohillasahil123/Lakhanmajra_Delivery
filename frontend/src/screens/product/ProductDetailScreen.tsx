import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { fetchCategories } from '@/services/catalogService';
import { resolveImageUrl } from '@/config/api';

type CategoryItem = {
  _id: string;
  name: string;
  parentCategory?: string | { _id?: string } | null;
};

type ProductVariant = {
  _id?: string;
  label?: string;
  unitType?: string;
  price?: number;
  mrp?: number;
  discount?: number;
  stock?: number;
  unit?: string;
  isDefault?: boolean;
};

// ───────────────── Helper Functions ─────────────────
const buildCategoryName = (product: any, categories: CategoryItem[]): string => {
  const categoryId = typeof product?.categoryId === 'string'
    ? product.categoryId
    : String(product?.categoryId?._id || '');
  return categories.find((c) => String(c?._id) === categoryId)?.name || product?.categoryName || '';
};

const getActiveUnit = (selectedVariant: ProductVariant | null, product: any): string =>
  selectedVariant?.label || selectedVariant?.unit || selectedVariant?.unitType || product?.unit || 'piece';

const buildImageArray = (product: any): string[] => {
  if (!Array.isArray(product.images)) return [];
  return product.images.map((img: string) => resolveImageUrl(img)).filter(Boolean);
};

// ───────────────── Main Component ─────────────────
export default function ProductDetailDynamic() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const imageHeight = Math.min(320, Math.max(220, width * 0.72));
  const params = useLocalSearchParams();
  const productId = params.productId as string;

  const addItem = useCart((s) => s.addItem);

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErrored, setImgErrored] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  // Fixed values - not state since they don't change
  const quantity = 1;
  const activeImage = 0;

  // ───────────────── Fetch ─────────────────
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const [productRes, categoriesRes] = await Promise.all([
          fetch(`${require('@/config/api').API_BASE_URL}/api/products/${productId}`),
          fetchCategories(),
        ]);

        const json = await productRes.json();
        const p = json?.data || json;

        if (!mounted) return;

        setProduct(p);

        const variants = Array.isArray(p?.variants) ? p.variants : [];
        const defaultVariant =
          variants.find((v: ProductVariant) => v?.isDefault) ||
          variants[0];

        setSelectedVariantId(defaultVariant?._id ? String(defaultVariant._id) : '');
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      } catch (e) {
        console.warn('Product fetch error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (productId) load();
    return () => { mounted = false; };
  }, [productId]);

  // ───────────────── Loading / Error ─────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#0E7A3D" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedText>Product not found.</ThemedText>
      </SafeAreaView>
    );
  }

  // ───────────────── Images ─────────────────
  const images: string[] = buildImageArray(product);
  const currentImage = images[activeImage] || null;

  // ───────────────── Variant Logic ─────────────────
  const variants: ProductVariant[] = Array.isArray(product?.variants)
    ? product.variants
    : [];

  const selectedVariant =
    variants.find(v => String(v?._id) === selectedVariantId) ||
    variants.find(v => v?.isDefault) ||
    variants[0] ||
    null;

  const activePrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const activeMrp = Number(selectedVariant?.mrp ?? product?.mrp ?? 0);
  const activeStock = Number(selectedVariant?.stock ?? product?.stock ?? 0);
  const categoryName = buildCategoryName(product, categories);
  const activeUnit = getActiveUnit(selectedVariant, product);
  const productDescription =
    typeof product?.description === 'string' ? product.description.trim() : '';

  const shouldShowDiscount =
    typeof activeMrp === 'number' &&
    typeof activePrice === 'number' &&
    activeMrp > activePrice;

  // ───────────────── Add To Cart ─────────────────
  const handleAddToCart = () => {
    addItem(
      {
        id: product._id || product.id,
        productId: product._id || product.id,
        name: product.name,
        price: activePrice,
        unit: selectedVariant?.label || 'piece',
        image: images[0] || '',
        stock: activeStock,
      },
      quantity
    );

    router.push('/cart');
  };

  // ───────────────── UI ─────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Image */}
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {currentImage && !imgErrored ? (
            <Image
              source={{ uri: currentImage }}
              style={styles.mainImage}
              resizeMode="contain"
              onError={() => setImgErrored(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ThemedText style={styles.imagePlaceholderText}>
                {product.name?.charAt(0)?.toUpperCase() || '?'}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <ThemedText style={[styles.productName, { fontSize: isCompact ? 20 : 22 }]}>
            {product.name}
          </ThemedText>

          <View style={styles.metaRow}>
            {categoryName ? (
              <View style={styles.metaChip}>
                <ThemedText style={styles.metaChipText}>{categoryName}</ThemedText>
              </View>
            ) : null}

            <View style={styles.metaChip}>
              <ThemedText style={styles.metaChipText}>{activeUnit}</ThemedText>
            </View>

            <View
              style={[
                styles.stockChip,
                activeStock > 0 ? styles.stockChipIn : styles.stockChipOut,
              ]}
            >
              <ThemedText
                style={[
                  styles.stockChipText,
                  activeStock > 0 ? styles.stockChipTextIn : styles.stockChipTextOut,
                ]}
              >
                {activeStock > 0 ? `In Stock (${activeStock})` : 'Out of Stock'}
              </ThemedText>
            </View>
          </View>

          {/* ✅ FIXED PRICE BLOCK */}
          <View style={[styles.priceRow, isCompact && styles.priceRowCompact]}>
            <View>
                <ThemedText style={[styles.price, { fontSize: isCompact ? 24 : 28 }]}>
                ₹{activePrice}
              </ThemedText>

              {shouldShowDiscount && (
                <ThemedText style={styles.originalPrice}>
                  MRP ₹{activeMrp}
                </ThemedText>
              )}
            </View>

            {shouldShowDiscount && (
              <View style={styles.savingsContainer}>
                <ThemedText style={styles.savingsText}>
                  Save ₹{activeMrp - activePrice}
                </ThemedText>
              </View>
            )}
          </View>

          {variants.length > 1 && (
            <View style={styles.sectionBlock}>
              <ThemedText style={styles.sectionTitle}>Available Variants</ThemedText>
              <View style={styles.variantsWrap}>
                {variants.map((variant, index) => {
                  const variantId = String(variant?._id || index);
                  const isSelected = variantId === selectedVariantId;
                  const variantPrice = Number(variant?.price ?? activePrice ?? 0);
                  const variantLabel =
                    variant?.label ||
                    variant?.unit ||
                    variant?.unitType ||
                    `Variant ${index + 1}`;

                  return (
                    <TouchableOpacity
                      key={variantId}
                      style={[
                        styles.variantChip,
                        { minWidth: isCompact ? 80 : 92 },
                        isSelected && styles.variantChipActive,
                      ]}
                      onPress={() => setSelectedVariantId(variantId)}
                    >
                      <ThemedText
                        style={[
                          styles.variantChipLabel,
                          isSelected && styles.variantChipLabelActive,
                        ]}
                      >
                        {variantLabel}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.variantChipPrice,
                          isSelected && styles.variantChipPriceActive,
                        ]}
                      >
                        ₹{variantPrice}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {productDescription ? (
            <View style={styles.sectionBlock}>
              <ThemedText style={styles.sectionTitle}>Product Details</ThemedText>
              <ThemedText style={styles.descriptionText}>{productDescription}</ThemedText>
            </View>
          ) : null}

        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            activeStock === 0 && { backgroundColor: '#9CA3AF' },
          ]}
          onPress={handleAddToCart}
          disabled={activeStock === 0}
        >
          <ThemedText style={styles.addToCartText}>
            {activeStock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </ThemedText>

          <ThemedText style={styles.addToCartPrice}>
            ₹{activePrice * quantity}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 120 },
  imageContainer: { height: 280, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 72, color: '#D1D5DB', fontWeight: '700' },
  infoSection: { backgroundColor: '#FFF', padding: 16 },
  productName: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#111827' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metaChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  metaChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  stockChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  stockChipIn: { backgroundColor: '#DCFCE7' },
  stockChipOut: { backgroundColor: '#FEE2E2' },
  stockChipText: { fontSize: 12, fontWeight: '700' },
  stockChipTextIn: { color: '#166534' },
  stockChipTextOut: { color: '#991B1B' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceRowCompact: { gap: 8, flexWrap: 'wrap' },
  price: { fontSize: 28, fontWeight: '800', color: '#0E7A3D' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  savingsContainer: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  savingsText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  sectionBlock: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  variantsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    minWidth: 92,
  },
  variantChipActive: { borderColor: '#0E7A3D', backgroundColor: '#ECFDF3' },
  variantChipLabel: { fontSize: 12, fontWeight: '700', color: '#111827' },
  variantChipLabelActive: { color: '#0E7A3D' },
  variantChipPrice: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  variantChipPriceActive: { color: '#065F46', fontWeight: '600' },
  descriptionText: { fontSize: 14, lineHeight: 22, color: '#374151' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 16 },
  addToCartButton: { backgroundColor: '#0E7A3D', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  addToCartText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  addToCartPrice: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});