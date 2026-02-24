import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import useLocationStore from '@/stores/locationStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  View,
  useWindowDimensions,
  FlatList,
  Dimensions,
} from 'react-native';/*  */
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import catalogService, { fetchCategories, fetchProducts, fetchOffers } from '@/services/catalogService';
import { resolveImageUrl } from '@/config/api';
// Local offer images
const shamImg = require('../assets/images/sham.png');
const msaleImg = require('../assets/images/msale.png');
const teaImg = require('../assets/images/Tea.png');
const oneImg = require('../assets/images/1.png');

// Category colors
const CATEGORY_COLORS: { [key: string]: string } = {
  'vegitable': '#D1F2EB',
  'vegetables': '#D1F2EB',
  'fruits': '#FEF3C7',
  'dairy': '#DBEAFE',
  'snacks': '#FCE7F3',
  'beverages': '#E9D5FF',
  'bakery': '#FFE4E6',
  'meat': '#FED7AA',
  'care': '#D1D5DB',
};

// Helper function to get color for category
const getCategoryColor = (categoryName: string) => {
  const slug = (categoryName || '').toLowerCase().trim();
  return CATEGORY_COLORS[slug] || '#F3F4F6';
};

// Color Scheme
const COLORS = {
  primary: '#F8C200',
  primaryDark: '#E5B000',
  accent: '#0D3D1E',
  bg: '#F7F7F2',
  white: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  light: '#EFEFEA',
  green: '#22C55E',
  red: '#EF4444',
};

// Helper function to get responsive values
const getResponsiveValue = (smallScreen: number, largeScreen: number, width: number) => {
  return width < 380 ? smallScreen : largeScreen;
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const addItem = useCart((s) => s.addItem);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const setSelectedLocation = useLocationStore((s) => s.setSelectedLocation);
  const cartCount = useCart((s) => s.items.reduce((sum: number, it) => sum + it.quantity, 0));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const addressParam = typeof params.address === 'string' ? params.address.trim() : '';
    const instructionsParam = typeof params.deliveryInstructions === 'string' ? params.deliveryInstructions.trim() : '';
    const latitudeParam = typeof params.latitude === 'string' ? Number(params.latitude) : NaN;
    const longitudeParam = typeof params.longitude === 'string' ? Number(params.longitude) : NaN;

    if (!addressParam) {
      return;
    }

    setSelectedLocation({
      address: addressParam,
      deliveryInstructions: instructionsParam,
      latitude: Number.isFinite(latitudeParam) ? latitudeParam : selectedLocation.latitude,
      longitude: Number.isFinite(longitudeParam) ? longitudeParam : selectedLocation.longitude,
    });
  }, [params.address, params.deliveryInstructions, params.latitude, params.longitude]);

  // Load remote catalog data
  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      setLoading(true);
      try {
        const [cats, prods, offs] = await Promise.all([
          fetchCategories(),
          fetchProducts({ limit: 12 }),
          fetchOffers(),
        ]);
        if (!mounted) return;
        setCategories(cats || []);
        setProducts(prods || []);
        // Attach local images as fallbacks for offers. Prefer remote offers if available.
        const localImgs = [shamImg, msaleImg, teaImg, oneImg];
        let finalOffers: any[] = [];
        if (offs && offs.length > 0) {
          finalOffers = offs.map((o: any, i: number) => ({
            ...o,
            image: o.image && (typeof o.image === 'number' || typeof o.image === 'object') ? o.image : localImgs[i % localImgs.length],
          }));
        } else {
          finalOffers = localImgs.map((img, i) => ({ id: `local-${i}`, title: '', subtitle: '', image: img }));
        }
        setOffers(finalOffers);
        // Set first category as selected
        if (cats && cats.length > 0) {
          setSelectedCategory(cats[0]._id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const isLocalImage = (img: any) => typeof img === 'number';

  // Filter products by selected category
  const filteredProducts = selectedCategory 
    ? products.filter((p: any) => p.categoryId === selectedCategory)
    : products;

  const locationLines = useMemo(() => {
    const fallback = ['Select your location', 'Tap to choose delivery address'];
    if (!selectedLocation.address || selectedLocation.address === 'Select your delivery location') {
      return fallback;
    }

    const pieces = selectedLocation.address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (pieces.length <= 1) {
      return [pieces[0], 'Tap to update location'];
    }

    return [pieces.slice(0, 2).join(', '), pieces.slice(2).join(', ') || 'Tap to update location'];
  }, [selectedLocation.address]);

  // Responsive values
  const isSmallScreen = width < 380;
  const headerPadding = getResponsiveValue(12, 16, width);
  const horizontalPadding = getResponsiveValue(12, 16, width);
  const heroFontSize = getResponsiveValue(28, 36, width);
  const productGridColumns = width < 360 ? 1.8 : 2;
  const productCardWidth = (width - horizontalPadding * 2 - 8) / productGridColumns;
  const offerCardWidth = width - horizontalPadding * 2;

  const handleOfferScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / offerCardWidth);
    if (nextIndex !== activeOfferIndex) {
      setActiveOfferIndex(nextIndex);
    }
  };

  // Refs to control offer auto-scroll and keep current index in sync
  const offerScrollRef = useRef<any>(null);
  const offerIndexRef = useRef<number>(0);

  useEffect(() => {
    offerIndexRef.current = activeOfferIndex;
  }, [activeOfferIndex]);

  useEffect(() => {
    if (!offers || offers.length <= 1) return;
    let mounted = true;
    const interval = setInterval(() => {
      if (!mounted) return;
      const next = (offerIndexRef.current + 1) % offers.length;
      try {
        offerScrollRef.current?.scrollTo({ x: next * offerCardWidth, animated: true });
      } catch (e) {
        // ignore if ref not ready
      }
      offerIndexRef.current = next;
      // update visible index state
      setActiveOfferIndex(next);
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [offers, offerCardWidth]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: headerPadding, paddingVertical: 10, gap: 12 }]}>
        {/* Location Pill */}
        <TouchableOpacity
          style={[styles.locationPill, { paddingHorizontal: 12, paddingVertical: 8 }]}
          onPress={() =>
            router.push({
              pathname: '/location',
              params: {
                address: selectedLocation.address,
                deliveryInstructions: selectedLocation.deliveryInstructions,
                latitude: selectedLocation.latitude.toString(),
                longitude: selectedLocation.longitude.toString(),
              },
            })
          }
        >
          <ThemedText style={styles.locationPin}>📍</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.locText, { fontSize: 12 }]} numberOfLines={1}>{locationLines[0]}</ThemedText>
            <ThemedText style={[styles.locSub, { fontSize: 10 }]} numberOfLines={1}>{locationLines[1]}</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Search Bar & Actions Row */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {/* Search Bar */}
          <View style={[styles.searchBar, { flex: 1 }]}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              style={[styles.searchInput, { fontSize: 13 }]}
              placeholder={isSmallScreen ? 'Search...' : 'Search "eggs", "milk"…'}
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Header Actions */}
          <TouchableOpacity style={[styles.iconBtn, { width: 44, height: 44 }]}>
            <ThemedText style={{ fontSize: 22 }}>🔔</ThemedText>
            <View style={styles.dot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { width: 44, height: 44 }]}
            onPress={() => router.push('/profile')}
          >
            <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.cartBtn, { paddingHorizontal: 14, paddingVertical: 10, height: 44, justifyContent: 'center' }]} onPress={() => router.push('/cart')}>
            <ThemedText style={{ fontSize: 22 }}>🛒</ThemedText>
            {cartCount > 0 && <ThemedText style={[styles.cartCount, { fontSize: 12 }]}>
              {cartCount}
            </ThemedText>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>
        {/* Active Order */}
        <View style={styles.orderStatus}>
          <View style={styles.orderDot} />
          <View style={styles.orderStatusInfo}>
            <ThemedText style={styles.orderStatusTitle}>Order #QC-4892 is on the way!</ThemedText>
            <ThemedText style={styles.orderStatusSub}>Arriving in 6 minutes · 5 items</ThemedText>
          </View>
          <TouchableOpacity style={styles.orderTrackBtn}>
            <ThemedText style={styles.orderTrackBtnText}>Track →</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHead}>
          <ThemedText style={[styles.sectionTitle, { fontSize: 20 }]}>🎁 Offers For You</ThemedText>
        </View>

        <View style={styles.offerSection}>
          <ScrollView
            ref={offerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleOfferScroll}
            decelerationRate="fast"
          >
            {offers.map((offer, idx) => (
              <View key={offer.id ?? idx} style={{ width: offerCardWidth }}>
                {isLocalImage(offer.image) ? (
                  <ImageBackground source={offer.image} style={styles.offerCard} imageStyle={styles.offerCardImage}>
                    <View style={styles.offerOverlay} />
                    <View style={styles.offerContent}>
                      <ThemedText style={styles.offerTitle}>{offer.title}</ThemedText>
                      <ThemedText style={styles.offerSubtitle}>{offer.subtitle}</ThemedText>
                      {offer.cta && (
                        <TouchableOpacity style={styles.offerCta}>
                          <ThemedText style={styles.offerCtaText}>{offer.cta}</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.offerCard, { backgroundColor: COLORS.accent }]}> 
                    <View style={styles.offerOverlay} />
                    <View style={styles.offerContent}>
                      <ThemedText style={styles.offerTitle}>{offer.title}</ThemedText>
                      <ThemedText style={styles.offerSubtitle}>{offer.subtitle}</ThemedText>
                      {offer.cta && (
                        <TouchableOpacity style={styles.offerCta}>
                          <ThemedText style={styles.offerCtaText}>{offer.cta}</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.offerDots}>
            {offers.map((offer, index) => (
              <View
                key={offer.id ?? index}
                style={[styles.offerDot, index === activeOfferIndex && styles.offerDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Hero Banner */}
        <ExpoLinearGradient
          colors={[COLORS.accent, '#1a5c32', COLORS.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroBadge}>
              <ThemedText style={styles.heroBadgeText}>⚡ Fastest Delivery</ThemedText>
            </View>
            <ThemedText style={[styles.heroTitle, { fontSize: heroFontSize }]}>
              Groceries at{'\n'}<ThemedText style={styles.heroTitleSpan}>Lightning Speed</ThemedText>
            </ThemedText>
            <ThemedText style={styles.heroDesc}>Fresh fruits & dairy — delivered in 10 mins</ThemedText>
            <TouchableOpacity style={styles.heroCta}>
              <ThemedText style={styles.heroCtaText}>Shop Now →</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.heroRight}>
            <ThemedText style={{ fontSize: 35 }}>🛒</ThemedText>
          </View>
        </ExpoLinearGradient>

        {/* Delivery Info Cards */}
        <View style={styles.deliveryStrip}>
          <View style={styles.deliveryCard}>
            <View style={[styles.dcIcon, { backgroundColor: '#FFF8D0', width: 44, height: 44 }]}>
              <ThemedText style={{ fontSize: 22 }}>⚡</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.deliveryTime}>10 MIN</ThemedText>
              <ThemedText style={styles.dcTitle}>Lightning Fast</ThemedText>
              <ThemedText style={styles.dcDesc}>Average delivery</ThemedText>
            </View>
          </View>

          <View style={styles.deliveryCard}>
            <View style={[styles.dcIcon, { backgroundColor: '#DCFCE7', width: 44, height: 44 }]}>
              <ThemedText style={{ fontSize: 22 }}>🌿</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.deliveryTime, { backgroundColor: '#22C55E' }]}>100% FRESH</ThemedText>
              <ThemedText style={styles.dcTitle}>Farm Fresh</ThemedText>
              <ThemedText style={styles.dcDesc}>Sourced daily</ThemedText>
            </View>
          </View>

          <View style={styles.deliveryCard}>
            <View style={[styles.dcIcon, { backgroundColor: '#DBEAFE', width: 44, height: 44 }]}>
              <ThemedText style={{ fontSize: 22 }}>🏷️</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.deliveryTime, { backgroundColor: '#8B5CF6' }]}>BEST PRICE</ThemedText>
              <ThemedText style={styles.dcTitle}>Zero Fees</ThemedText>
              <ThemedText style={styles.dcDesc}>Free delivery</ThemedText>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHead}>
          <ThemedText style={[styles.sectionTitle, { fontSize: 20 }]}>Shop by Category</ThemedText>
          <TouchableOpacity onPress={() => router.push('/categories')}>
            <ThemedText style={styles.seeAll}>View All →</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Categories — horizontal FlatList single-row */}
        <View>
          {(() => {
            const visibleOnScreen = 5; // how many cards fit before scrolling
            const gap = 12;
            const horizontalPadding = 32; // 16 left + 16 right
            const winW = Dimensions.get('window').width;
            const cardSize = Math.floor((winW - horizontalPadding - (visibleOnScreen - 1) * gap) / visibleOnScreen);

            return (
              <FlatList
                key="categories-horizontal"
                data={categories}
                keyExtractor={(item, idx) => item._id ?? String(idx)}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedCategory(item._id)}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      { backgroundColor: getCategoryColor(item.name), width: cardSize, height: cardSize, marginRight: gap, transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    <ThemedText style={styles.categoryIcon}>{item.icon || '🥬'}</ThemedText>
                    <ThemedText style={styles.categoryTitle} numberOfLines={2} ellipsizeMode="tail">
                      {item.name || item.title}
                    </ThemedText>
                  </Pressable>
                )}
                ListEmptyComponent={<View style={{ height: 8 }} />}
              />
            );
          })()}
        </View>

        {/* Products */}
        <View style={styles.sectionHead}>
          <ThemedText style={[styles.sectionTitle, { fontSize: 20 }]}>🔥 Trending Now</ThemedText>
          <TouchableOpacity onPress={() => router.push('/products')}>
            <ThemedText style={styles.seeAll}>See All →</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {filteredProducts.map((product) => (
            <TouchableOpacity key={product.id || product._id} style={styles.productCard}>
              <View style={styles.productImg}>
                {/* Show MinIO image if available, else fallback to emoji or placeholder */}
                {Array.isArray(product.images) && product.images[0] ? (
                  <ImageBackground
                    source={{ uri: resolveImageUrl(product.images[0]) }}
                    style={{ width: 80, height: 80, justifyContent: 'center', alignItems: 'center' }}
                    imageStyle={{ resizeMode: 'contain', borderRadius: 12 }}
                  >
                    {/* Optionally overlay discount or wishlist here if needed */}
                  </ImageBackground>
                ) : (
                  <ThemedText style={{ fontSize: 28 }}>{product.emoji || product.image || '🛍️'}</ThemedText>
                )}
                {product.discount && <View style={styles.discountTag}>
                  <ThemedText style={styles.discountText}>{product.discount}</ThemedText>
                </View>}
                <TouchableOpacity style={styles.wishlistBtn}>
                  <ThemedText style={{ fontSize: 16 }}>♡</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.productBody}>
                <ThemedText style={styles.productMeta}>{product.category || product.meta || product.type}</ThemedText>
                {product.rating && (
                  <View style={styles.rating}>
                    <ThemedText style={styles.ratingText}>⭐ {product.rating}</ThemedText>
                  </View>
                )}
                <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
                <ThemedText style={styles.productWeight}>Per {product.unit || 'piece'}</ThemedText>
                <View style={styles.productFooter}>
                  <View>
                    <ThemedText style={styles.price}>₹{product.price}</ThemedText>
                    {product.mrp && <ThemedText style={styles.priceOld}>₹{product.mrp}</ThemedText>}
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() =>
                      addItem(
                        {
                          id: product._id || product.id,
                          name: product.name,
                          price: product.price,
                          unit: product.unit || '',
                          image: (Array.isArray(product.images) && product.images[0])
                            ? resolveImageUrl(product.images[0])
                            : (product.emoji || product.image || '🛍️'),
                        },
                        1,
                      )
                    }
                  >
                    <ThemedText style={styles.addBtnText}>ADD</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Deals Section */}
        <View style={styles.sectionHead}>
          <ThemedText style={[styles.sectionTitle, { fontSize: 20 }]}>🏷️ Hot Deals</ThemedText>
        </View>

        <View style={styles.dealsRow}>
          <ExpoLinearGradient
            colors={['#FF6B35', '#F7C59F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealCard}
          >
            <View style={styles.dealInfo}>
              <ThemedText style={styles.dealTitle}>Weekend Sale!{'\n'}Up to 40%</ThemedText>
              <ThemedText style={styles.dealDesc}>Fresh fruits & veggies</ThemedText>
              <TouchableOpacity style={styles.dealBtn}>
                <ThemedText style={styles.dealBtnText}>Shop →</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 40 }}>🍉</ThemedText>
          </ExpoLinearGradient>

          <ExpoLinearGradient
            colors={['#7C3AED', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealCard}
          >
            <View style={styles.dealInfo}>
              <ThemedText style={styles.dealTitle}>Buy 2 Get 1{'\n'}FREE</ThemedText>
              <ThemedText style={styles.dealDesc}>On dairy products</ThemedText>
              <TouchableOpacity style={styles.dealBtn}>
                <ThemedText style={styles.dealBtnText}>Shop →</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 40 }}>🥛</ThemedText>
          </ExpoLinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingVertical: 40,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'column',
    
  
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    gap: 8,
    flexShrink: 1,
  },
  locationPin: {
    fontSize: 18,
    color: COLORS.primaryDark,
  },
  locText: {
    fontWeight: '600',
    color: COLORS.text,
  },
  locSub: {
    color: COLORS.muted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.muted,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 50,
    gap: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.muted,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontFamily: 'DM Sans',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    backgroundColor: COLORS.red,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
  },
  cartCount: {
    fontWeight: '700',
    color: COLORS.white,
  },
  main: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  orderStatus: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  orderDot: {
    width: 9,
    height: 9,
    backgroundColor: COLORS.green,
    borderRadius: 50,
    shadowColor: COLORS.green,
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  orderStatusInfo: {
    flex: 1,
  },
  orderStatusTitle: {
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  orderStatusSub: {
    color: 'rgba(255,255,255,0.7)',
  },
  orderTrackBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  orderTrackBtnText: {
    fontWeight: '700',
    color: COLORS.accent,
    fontSize: 12,
  },
  offerSection: {
    marginBottom: 24,
  },
  offerCard: {
    height: 165,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.accent,
  },
  offerCardImage: {
    resizeMode: 'cover',
    borderRadius: 18,
  },
  offerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,61,30,0.52)',
  },
  offerContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  offerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  offerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  offerCta: {
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  offerCtaText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  offerDots: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  offerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  offerDotActive: {
    width: 22,
    backgroundColor: COLORS.accent,
  },
  hero: {
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  heroLeft: {
    flex: 1,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(248,194,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(248,194,0,0.4)',
    borderRadius: 50,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  heroTitle: {
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 10,
    lineHeight: 40,
  },
  heroTitleSpan: {
    color: COLORS.primary,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 16,
    lineHeight: 22,
  },
  heroCta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  heroCtaText: {
    fontWeight: '800',
    color: COLORS.accent,
  },
  heroRight: {
    marginRight: -10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
  },
  deliveryStrip: {
    marginBottom: 28,
    gap: 12,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  dcIcon: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  deliveryTime: {
    color: COLORS.white,
    fontWeight: '800',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  dcTitle: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  dcDesc: {
    color: COLORS.muted,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: '800',
    color: COLORS.text,
  },
  seeAll: {
    fontWeight: '600',
    color: COLORS.accent,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryCard: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0,
  },
  categoryCardActive: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  categoryIcon: {
    fontSize: 44,
    width: 44,
    height: 44,
    textAlign: 'center',
    marginBottom: 8,
    color: COLORS.text,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 10,
  },
  productCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  productImg: {
    backgroundColor: COLORS.light,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  discountTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.green,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  discountText: {
    fontWeight: '800',
    color: COLORS.white,
    fontSize: 10,
  },
  wishlistBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    backgroundColor: COLORS.white,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  productBody: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  productMeta: {
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 2,
    fontSize: 10,
  },
  rating: {
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
    marginBottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontWeight: '700',
    color: '#166534',
    fontSize: 10,
  },
  productName: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
    fontSize: 13,
    lineHeight: 16,
  },
  productWeight: {
    color: COLORS.muted,
    marginBottom: 8,
    fontSize: 11,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  price: {
    fontWeight: '800',
    color: COLORS.text,
    fontSize: 15,
  },
  priceOld: {
    color: COLORS.muted,
    textDecorationLine: 'line-through',
    fontWeight: '400',
    fontSize: 11,
  },
  addBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    fontWeight: '800',
    color: COLORS.accent,
    fontSize: 11,
  },
  dealsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  dealCard: {
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dealInfo: {
    flex: 1,
  },
  dealTitle: {
    fontWeight: '800',
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 20,
  },
  dealDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 10,
  },
  dealBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dealBtnText: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 11,
  },
  dealEmoji: {
    marginRight: -8,
  },
});