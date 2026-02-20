import { ThemedText } from '@/components/themed-text';
import useCart from '@/stores/cartStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  LinearGradient,
  Dimensions,
  useWindowDimensions,
} from 'react-native';/*  */
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

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

const CATEGORIES = [
  { id: 1, name: 'Trending', icon: '🔥' },
  { id: 2, name: 'Veggies', icon: '🥦' },
  { id: 3, name: 'Fruits', icon: '🍎' },
  { id: 4, name: 'Dairy', icon: '🥛' },
  { id: 5, name: 'Meat', icon: '🍗' },
  { id: 6, name: 'Bakery', icon: '🥖' },
  { id: 7, name: 'Snacks', icon: '🍫' },
  { id: 8, name: 'Drinks', icon: '🧃' },
  { id: 9, name: 'Care', icon: '🧴' },
];

const FEATURED_PRODUCTS = [
  { id: 1, name: 'Fresh Avocado Premium', price: 79, oldPrice: 105, unit: 'piece', image: '🥑', category: 'Organics', discount: '25% OFF', rating: 4.8, reviews: 320 },
  { id: 2, name: 'Imported Strawberry Pack', price: 149, oldPrice: 190, unit: 'pack', image: '🍓', category: 'Fruits', discount: 'NEW', rating: 4.9, reviews: 512 },
  { id: 3, name: 'Amul Full Cream Milk', price: 66, oldPrice: 69, unit: 'litre', image: '🥛', category: 'Dairy', discount: '5% OFF', rating: 4.7, reviews: 1200 },
  { id: 4, name: 'Robusta Banana Bunch', price: 45, oldPrice: null, unit: 'bunch', image: '🍌', category: 'Fruits', discount: null, rating: 4.6, reviews: 680 },
  { id: 5, name: 'Chocolate Truffle Cupcake', price: 179, oldPrice: 256, unit: 'pack', image: '🧁', category: 'Bakery', discount: '30% OFF', rating: 4.5, reviews: 290 },
  { id: 6, name: 'Dove Moisturising Body Wash', price: 289, oldPrice: 340, unit: 'bottle', image: '🧴', category: 'Care', discount: '15% OFF', rating: 4.8, reviews: 870 },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.items.reduce((sum: number, it) => sum + it.quantity, 0));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(1);

  // Responsive values
  const isSmallScreen = width < 380;
  const headerPadding = getResponsiveValue(12, 16, width);
  const horizontalPadding = getResponsiveValue(12, 16, width);
  const locationTextSize = getResponsiveValue(12, 13, width);
  const heroFontSize = getResponsiveValue(28, 36, width);
  const productGridColumns = width < 360 ? 1.8 : 2;
  const productCardWidth = (width - horizontalPadding * 2 - 8) / productGridColumns;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: headerPadding, paddingVertical: 10, gap: 12 }]}>
        {/* Location Pill */}
        <TouchableOpacity
          style={[styles.locationPill, { paddingHorizontal: 12, paddingVertical: 8 }]}
          onPress={() => router.push('/location')}
        >
          <ThemedText style={styles.locationPin}>📍</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.locText, { fontSize: 12 }]}>Home — Sector 12</ThemedText>
            <ThemedText style={[styles.locSub, { fontSize: 10 }]}>Greater Noida, UP</ThemedText>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingHorizontal: 6, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <ThemedText style={{ fontSize: 22 }}>{cat.icon}</ThemedText>
              <ThemedText style={[styles.catName, { fontSize: 10 }]}>{cat.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products */}
        <View style={styles.sectionHead}>
          <ThemedText style={[styles.sectionTitle, { fontSize: 20 }]}>🔥 Trending Now</ThemedText>
          <TouchableOpacity onPress={() => router.push('/products')}>
            <ThemedText style={styles.seeAll}>See All →</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {FEATURED_PRODUCTS.map((product) => (
            <TouchableOpacity key={product.id} style={styles.productCard}>
              <View style={styles.productImg}>
                <ThemedText style={{ fontSize: 28}}>{product.image}</ThemedText>
                {product.discount && <View style={styles.discountTag}>
                  <ThemedText style={styles.discountText}>{product.discount}</ThemedText>
                </View>}
                <TouchableOpacity style={styles.wishlistBtn}>
                  <ThemedText style={{ fontSize: 16 }}>♡</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.productBody}>
                <ThemedText style={styles.productMeta}>{product.category}</ThemedText>
                <View style={styles.rating}>
                  <ThemedText style={styles.ratingText}>⭐ {product.rating}</ThemedText>
                </View>
                <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
                <ThemedText style={styles.productWeight}>Per {product.unit}</ThemedText>
                <View style={styles.productFooter}>
                  <View>
                    <ThemedText style={styles.price}>₹{product.price}</ThemedText>
                    {product.oldPrice && <ThemedText style={styles.priceOld}>₹{product.oldPrice}</ThemedText>}
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() =>
                      addItem(
                        {
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          unit: product.unit,
                          image: product.image,
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
  categoriesScroll: {
    marginBottom: 24,
  },
  catChip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  catChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFBEB',
  },
  catEmoji: {
    color: COLORS.text,
  },
  catName: {
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