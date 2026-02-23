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
import { fetchProducts } from '@/services/catalogService';
import { resolveImageUrl } from '@/config/api';

export default function ProductDetailDynamic() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.productId as string;

  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0));

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [imgErrored, setImgErrored] = useState(false);

  // Fetch product from API
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `${require('@/config/api').API_BASE_URL}/api/products/${productId}`
        );
        const json = await res.json();
        const p = json?.data || json;
        if (mounted) setProduct(p);
      } catch (e) {
        console.warn('Product fetch error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (productId) load();
    return () => { mounted = false; };
  }, [productId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0E7A3D" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 20 }}>
          <ThemedText>Product not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: '#0E7A3D', marginTop: 12 }}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images: string[] = Array.isArray(product.images)
    ? product.images.map((img: string) => resolveImageUrl(img)).filter(Boolean)
    : [];
  const currentImage = images[activeImage] || null;

  const handleAddToCart = () => {
    addItem({
      id: product._id || product.id,
      name: product.name,
      price: product.price,
      unit: product.unit || product.unitType || '',
      image: images[0] || '',
    }, quantity);
    router.push('/cart');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Main Product Image from MinIO ── */}
        <View style={styles.imageContainer}>
          {product.mrp && product.price < product.mrp && (
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>
                {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
              </ThemedText>
            </View>
          )}

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

        {/* ── Image Thumbnails (if multiple images) ── */}
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailRow}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {images.map((uri, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setActiveImage(i); setImgErrored(false); }}
                style={[styles.thumbnail, activeImage === i && styles.thumbnailActive]}
              >
                <Image
                  source={{ uri }}
                  style={styles.thumbnailImg}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Product Info ── */}
        <View style={styles.infoSection}>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>
              {product.category || product.categoryId || 'Product'}
            </ThemedText>
          </View>

          <ThemedText style={styles.productName}>{product.name}</ThemedText>

          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <ThemedText style={styles.ratingStar}>⭐</ThemedText>
              <ThemedText style={styles.ratingText}>{product.rating || '4.0'}</ThemedText>
            </View>
            {product.stock !== undefined && (
              <ThemedText style={{ fontSize: 13, color: product.stock > 0 ? '#0E7A3D' : '#EF4444' }}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </ThemedText>
            )}
          </View>

          <View style={styles.priceRow}>
            <View>
              <ThemedText style={styles.price}>₹{product.price}</ThemedText>
              {product.mrp && product.mrp > product.price && (
                <ThemedText style={styles.originalPrice}>MRP ₹{product.mrp}</ThemedText>
              )}
            </View>
            {product.mrp && product.mrp > product.price && (
              <View style={styles.savingsContainer}>
                <ThemedText style={styles.savingsText}>
                  Save ₹{product.mrp - product.price}
                </ThemedText>
              </View>
            )}
          </View>

          {product.description ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>About Product</ThemedText>
              <ThemedText style={styles.description}>{product.description}</ThemedText>
            </View>
          ) : null}

          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {product.tags.map((tag: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <ThemedText style={styles.tagText}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* ── Bottom Add to Cart Bar ── */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
            <ThemedText style={styles.quantityButtonText}>−</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
          <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(q => q + 1)}>
            <ThemedText style={styles.quantityButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addToCartButton, product.stock === 0 && { backgroundColor: '#9CA3AF' }]}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
        >
          <ThemedText style={styles.addToCartText}>
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </ThemedText>
          <ThemedText style={styles.addToCartPrice}>₹{product.price * quantity}</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB', paddingVertical: 30 },
  container: { flex: 1 },
  imageContainer: { backgroundColor: '#FFFFFF', height: 280, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 72, fontWeight: '700', color: '#D1D5DB' },
  discountBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, zIndex: 1 },
  discountText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  thumbnailRow: { backgroundColor: '#FFFFFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  thumbnail: { width: 60, height: 60, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  thumbnailActive: { borderColor: '#0E7A3D' },
  thumbnailImg: { width: '100%', height: '100%' },
  infoSection: { backgroundColor: '#FFFFFF', padding: 16, marginTop: 12 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  productName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingStar: { fontSize: 16, marginRight: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  price: { fontSize: 28, fontWeight: '800', color: '#0E7A3D' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through' },
  savingsContainer: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  savingsText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  section: { backgroundColor: '#FFFFFF', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22, color: '#6B7280' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 12, elevation: 8, paddingBottom: 30 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 8 },
  quantityButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  quantityButtonText: { fontSize: 20, fontWeight: '700', color: '#0E7A3D' },
  quantityText: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, minWidth: 50, textAlign: 'center' },
  addToCartButton: { flex: 1, backgroundColor: '#0E7A3D', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, elevation: 6 },
  addToCartText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  addToCartPrice: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});