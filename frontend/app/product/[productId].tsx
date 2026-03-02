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

export default function ProductDetailDynamic() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.productId as string;

  const addItem = useCart((s) => s.addItem);

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [imgErrored, setImgErrored] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');

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
  const images: string[] = Array.isArray(product.images)
    ? product.images.map((img: string) => resolveImageUrl(img)).filter(Boolean)
    : [];

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

  // ✅ STEP-1 (THIS IS THE IMPORTANT FIX)
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
      <ScrollView>

        {/* Image */}
        <View style={styles.imageContainer}>
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
          <ThemedText style={styles.productName}>
            {product.name}
          </ThemedText>

          {/* ✅ FIXED PRICE BLOCK */}
          <View style={styles.priceRow}>
            <View>
              <ThemedText style={styles.price}>
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

          <View style={{ height: 120 }} />
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
  imageContainer: { height: 280, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 72, color: '#D1D5DB', fontWeight: '700' },
  infoSection: { backgroundColor: '#FFF', padding: 16 },
  productName: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 28, fontWeight: '800', color: '#0E7A3D' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  savingsContainer: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  savingsText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 16 },
  addToCartButton: { backgroundColor: '#0E7A3D', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  addToCartText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  addToCartPrice: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});