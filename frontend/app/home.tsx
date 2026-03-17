import { ThemedText } from "@/components/themed-text";
import TopHeader from "@/components/TopHeader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useCart from "@/stores/cartStore";
import useLocationStore from "@/stores/locationStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ImageSourcePropType,
  ImageBackground,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  View,
  useWindowDimensions,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import {
  fetchCategories,
  fetchProducts,
  fetchOffers,
} from "@/services/catalogService";
import { resolveImageUrl } from "@/config/api";
import { getMyOrdersApi, OrderRow } from "@/services/orderService";
import { getMyNotifications } from "@/services/notificationService";

// Local offer images
const shamImg = require("../assets/images/sham.png");
const msaleImg = require("../assets/images/msale.png");
const teaImg = require("../assets/images/Tea.png");
const oneImg = require("../assets/images/1.png");

// Category colors
const CATEGORY_COLORS: { [key: string]: string } = {
  vegitable: "#D1F2EB",
  vegetables: "#D1F2EB",
  fruits: "#FEF3C7",
  dairy: "#DBEAFE",
  snacks: "#FCE7F3",
  beverages: "#E9D5FF",
  bakery: "#FFE4E6",
  meat: "#FED7AA",
  care: "#D1D5DB",
};

const getCategoryColor = (categoryName: string) => {
  const slug = (categoryName || "").toLowerCase().trim();
  return CATEGORY_COLORS[slug] || "#F3F4F6";
};

const getParentCategoryId = (category: any): string => {
  if (!category?.parentCategory) return "";
  if (typeof category.parentCategory === "string") return category.parentCategory;
  return category.parentCategory?._id || "";
};

const getEntityId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?._id || value?.id || "");
};

const getCategoryIcon = (
  categoryName: string,
): keyof typeof MaterialCommunityIcons.glyphMap => {
  const n = String(categoryName || "").toLowerCase();
  if (n.includes("veg") || n.includes("fruit")) return "carrot";
  if (n.includes("bakery") || n.includes("bread")) return "bread-slice";
  if (n.includes("atta") || n.includes("rice") || n.includes("pulse") || n.includes("dal")) return "rice";
  if (n.includes("dairy") || n.includes("milk")) return "cup";
  if (n.includes("masala") || n.includes("spice")) return "chili-mild";
  if (n.includes("snack") || n.includes("namkeen")) return "french-fries";
  if (n.includes("personal") || n.includes("care") || n.includes("soap") || n.includes("perfume")) return "spray-bottle";
  if (n.includes("oil") || n.includes("ghee")) return "bottle-tonic";
  if (n.includes("instant") || n.includes("ready")) return "silverware-fork-knife";
  if (n.includes("beverage") || n.includes("drink")) return "coffee";
  if (n.includes("household") || n.includes("clean")) return "broom";
  if (n.includes("dry") || n.includes("nut")) return "peanut";
  if (n.includes("stationery")) return "pencil";
  if (n.includes("baby")) return "baby-face-outline";
  return "shape-outline";
};

const COLORS = {
  primary: "#F8C200",
  primaryDark: "#E5B000",
  accent: "#0D3D1E",
  bg: "#F7F7F2",
  white: "#FFFFFF",
  text: "#1A1A1A",
  muted: "#6B6B6B",
  light: "#EFEFEA",
  green: "#22C55E",
  red: "#EF4444",
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const addItem = useCart((s) => s.addItem);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const setSelectedLocation = useLocationStore((s) => s.setSelectedLocation);
  const cartCount = useCart((s) => s.items.length);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [latestOrder, setLatestOrder] = useState<OrderRow | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showOrderToast, setShowOrderToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const offerFlatListRef = useRef<FlatList>(null);
  const [activeOfferIdx, setActiveOfferIdx] = useState(0);

  // Tablet check
  const isTablet = width >= 600;
  const isSmallScreen = width < 380;

  const getParamText = (value: unknown) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return "";
  };

  useEffect(() => {
    const addressParam = getParamText(params.address).trim();
    const instructionsParam = getParamText(params.deliveryInstructions).trim();
    const latitudeParam = Number(getParamText(params.latitude));
    const longitudeParam = Number(getParamText(params.longitude));
    if (!addressParam) return;
    setSelectedLocation({
      address: addressParam,
      deliveryInstructions: instructionsParam,
      latitude: Number.isFinite(latitudeParam) ? latitudeParam : selectedLocation.latitude,
      longitude: Number.isFinite(longitudeParam) ? longitudeParam : selectedLocation.longitude,
    });
  }, [
    params.address,
    params.deliveryInstructions,
    params.latitude,
    params.longitude,
    selectedLocation.latitude,
    selectedLocation.longitude,
    setSelectedLocation,
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      try {
        const [cats, prods, offs] = await Promise.all([
          fetchCategories(),
          fetchProducts({ limit: 12 }),
          fetchOffers(),
        ]);
        if (!mounted) return;
        const mainCategories = (cats || []).filter((c: any) => !getParentCategoryId(c));
        setCategories(mainCategories);
        setProducts(prods || []);
        const localImgs = [shamImg, msaleImg, teaImg, oneImg];
        let finalOffers: any[] = [];
        if (offs && offs.length > 0) {
          finalOffers = offs.map((o: any, i: number) => ({
            ...o,
            id: o?._id || o?.id || `offer-${i}`,
            image: typeof o?.image === "string" && o.image.trim().length > 0
              ? resolveImageUrl(o.image)
              : localImgs[i % localImgs.length],
          }));
        } else {
          finalOffers = localImgs.map((img, i) => ({ id: `local-${i}`, title: "", subtitle: "", image: img }));
        }
        setOffers(finalOffers);
        if (mainCategories.length > 0) setSelectedCategory(mainCategories[0]._id);
      } finally {}
    }
    loadCatalog();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadUnreadCount = async () => {
      try {
        const result = await getMyNotifications("unread");
        if (!mounted) return;
        setUnreadNotificationCount(Number(result.unreadCount || 0));
      } catch {
        if (mounted) setUnreadNotificationCount(0);
      }
    };
    loadUnreadCount().catch(() => {});
    const intervalId = setInterval(() => { loadUnreadCount().catch(() => {}); }, 25000);
    return () => { mounted = false; clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getMyOrdersApi();
        if (!mounted) return;
        if (!rows || rows.length === 0) { setLatestOrder(null); return; }
        const sorted = [...rows].sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        setLatestOrder(sorted[0] ?? null);
      } catch {
        if (mounted) setLatestOrder(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!latestOrder) { setShowOrderToast(false); return; }
    setShowOrderToast(true);
    Animated.timing(toastAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    const hideTimeout = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 260, useNativeDriver: true })
        .start(({ finished }) => finished && setShowOrderToast(false));
    }, 4200);
    return () => { clearTimeout(hideTimeout); };
  }, [latestOrder, toastAnim]);

  const getOfferImageSource = (imageValue: unknown): ImageSourcePropType | null => {
    if (typeof imageValue === "number") return imageValue;
    if (typeof imageValue === "string" && imageValue.trim().length > 0) return { uri: imageValue };
    return null;
  };

  const filteredProducts = selectedCategory
    ? products.filter((p: any) => getEntityId(p.categoryId) === selectedCategory)
    : products;

  const getDiscountPercent = (product: any): number => {
    const discount = Number(product?.discount ?? 0);
    if (Number.isFinite(discount) && discount > 0) return Math.round(discount);
    const mrp = Number(product?.mrp ?? 0);
    const price = Number(product?.price ?? 0);
    if (mrp > 0 && price >= 0 && price < mrp) return Math.round(((mrp - price) / mrp) * 100);
    return 0;
  };

  const locationLines = useMemo(() => {
    const fallback = ["Select your location", "Tap to choose delivery address"];
    if (!selectedLocation.address || selectedLocation.address === "Select your delivery location") return fallback;
    const pieces = selectedLocation.address.split(",").map((p) => p.trim()).filter(Boolean);
    if (pieces.length <= 1) return [pieces[0], "Tap to update location"];
    return [pieces.slice(0, 2).join(", "), pieces.slice(2).join(", ") || "Tap to update location"];
  }, [selectedLocation.address]);

  useEffect(() => {
    if (offers.length <= 1) return;
    const timer = setInterval(() => {
      setActiveOfferIdx((prev) => {
        const next = (prev + 1) % offers.length;
        offerFlatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [offers.length]);

  // Responsive category card size
  const visibleOnScreen = isSmallScreen ? 4 : isTablet ? 7 : 5;
  const catGap = scale(10);
  const catHPadding = scale(32);
  const cardSize = Math.floor((width - catHPadding - (visibleOnScreen - 1) * catGap) / visibleOnScreen);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>

      {/* ───── HEADER ───── */}
      <View style={styles.header}>
        <TopHeader
          location={locationLines[0] ?? "Select your location"}
          onLocationPress={() =>
            router.push({
              pathname: "/location",
              params: {
                returnTo: "/home",
                address: selectedLocation.address,
                deliveryInstructions: selectedLocation.deliveryInstructions,
                latitude: selectedLocation.latitude.toString(),
                longitude: selectedLocation.longitude.toString(),
              },
            })
          }
          onProfilePress={() => router.push("/profile")}
          onOrdersPress={() => router.push("/orders")}
          hasOrder={!!latestOrder}
        />

        {/* Search + Icons Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setUnreadNotificationCount(0);
              router.push("/notifications");
            }}
          >
            <ThemedText style={styles.iconEmoji}>🔔</ThemedText>
            {unreadNotificationCount > 0 && <View style={styles.dot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push("/cart")}>
            <ThemedText style={styles.iconEmoji}>🛒</ThemedText>
            {cartCount > 0 && (
              <ThemedText style={styles.cartCount}>{cartCount}</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.searchBar} onPress={() => router.push("/search")}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <ThemedText numberOfLines={1} style={styles.searchInput}>
              {isSmallScreen ? "Search..." : 'Search "eggs", "milk"…'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* ───── ORDER TOAST ───── */}
      {showOrderToast && latestOrder && (
        <Animated.View
          style={[
            styles.orderToast,
            {
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }),
              }],
            },
          ]}
        >
          <ThemedText style={styles.orderToastText}>
            🚚 Tracking order {latestOrder?._id || "your latest order"} in progress
          </ThemedText>
        </Animated.View>
      )}

      {/* ───── MAIN SCROLL ───── */}
      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>

        {/* Offers heading */}
        <View style={styles.sectionHead}>
          <ThemedText style={styles.sectionTitle}>🎁 Offers For You</ThemedText>
        </View>

        {/* Offers Slider */}
        <View style={styles.offerSection}>
          <FlatList
            ref={offerFlatListRef}
            data={offers}
            keyExtractor={(item, idx) => String(item.id ?? idx)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveOfferIdx(Math.max(0, Math.min(idx, offers.length - 1)));
            }}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            renderItem={({ item }) => (
              <View style={{ width }}>
                {getOfferImageSource(item.image) ? (
                  <ImageBackground
                    source={getOfferImageSource(item.image) as ImageSourcePropType}
                    style={[styles.offerCard, { width }]}
                    imageStyle={styles.offerCardImage}
                  >
                    <View style={styles.offerOverlay} />
                    <View style={styles.offerContent}>
                      <ThemedText style={styles.offerTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.offerSubtitle}>{item.subtitle}</ThemedText>
                      {item.cta && (
                        <TouchableOpacity style={styles.offerCta}>
                          <ThemedText style={styles.offerCtaText}>{item.cta}</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.offerCard, { width, backgroundColor: COLORS.accent }]}>
                    <View style={styles.offerOverlay} />
                    <View style={styles.offerContent}>
                      <ThemedText style={styles.offerTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.offerSubtitle}>{item.subtitle}</ThemedText>
                      {item.cta && (
                        <TouchableOpacity style={styles.offerCta}>
                          <ThemedText style={styles.offerCtaText}>{item.cta}</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          />
          {offers.length > 1 && (
            <View style={styles.offerDots}>
              {offers.map((_, idx) => (
                <View key={idx} style={[styles.offerDot, idx === activeOfferIdx && styles.offerDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Hero Banner */}
        <ExpoLinearGradient
          colors={[COLORS.accent, "#1a5c32", COLORS.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroBadge}>
              <ThemedText style={styles.heroBadgeText}>⚡ Fastest Delivery</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>
              Groceries at{"\n"}
              <ThemedText style={styles.heroTitleSpan}>Lightning Speed</ThemedText>
            </ThemedText>
            <ThemedText style={styles.heroDesc}>Fresh fruits & dairy — delivered in 10 mins</ThemedText>
            <TouchableOpacity style={styles.heroCta}>
              <ThemedText style={styles.heroCtaText}>Shop Now →</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.heroRight}>
            <ThemedText style={styles.heroEmoji}>🛒</ThemedText>
          </View>
        </ExpoLinearGradient>

        {/* Delivery Info Cards */}
        <View style={styles.deliveryStrip}>
          {[
            { bg: "#FFF8D0", emoji: "⚡", badge: "10 MIN", badgeBg: COLORS.accent, title: "Lightning Fast", desc: "Average delivery" },
            { bg: "#DCFCE7", emoji: "🌿", badge: "100% FRESH", badgeBg: "#22C55E", title: "Farm Fresh", desc: "Sourced daily" },
            { bg: "#DBEAFE", emoji: "🏷️", badge: "BEST PRICE", badgeBg: "#8B5CF6", title: "Zero Fees", desc: "Free delivery" },
          ].map((card) => (
            <View key={card.title} style={styles.deliveryCard}>
              <View style={[styles.dcIcon, { backgroundColor: card.bg }]}>
                <ThemedText style={styles.dcEmoji}>{card.emoji}</ThemedText>
              </View>
              <View style={styles.flexOne}>
                <ThemedText style={[styles.deliveryTime, { backgroundColor: card.badgeBg }]}>
                  {card.badge}
                </ThemedText>
                <ThemedText style={styles.dcTitle}>{card.title}</ThemedText>
                <ThemedText style={styles.dcDesc}>{card.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.sectionHead}>
          <ThemedText style={styles.sectionTitle}>Shop by Category</ThemedText>
          <TouchableOpacity onPress={() => router.push("/categories")}>
            <ThemedText style={styles.seeAll}>View All →</ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          key="categories-horizontal"
          data={categories}
          keyExtractor={(item, idx) => item._id ?? String(idx)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: scale(16),
            paddingBottom: verticalScale(8),
          }}
          nestedScrollEnabled
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedCategory(item._id)}
              style={({ pressed }) => [
                styles.categoryCard,
                {
                  backgroundColor: getCategoryColor(item.name),
                  width: cardSize,
                  height: cardSize,
                  marginRight: catGap,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <MaterialCommunityIcons
                name={getCategoryIcon(item?.name)}
                size={moderateScale(28)}
                color="#0E7A3D"
              />
            </Pressable>
          )}
          ListEmptyComponent={<View style={{ height: verticalScale(8) }} />}
        />

        {/* Products */}
        <View style={[styles.sectionHead, { marginTop: verticalScale(16) }]}>
          <ThemedText style={styles.sectionTitle}>🔥 Trending Now</ThemedText>
          <TouchableOpacity onPress={() => router.push("/products")}>
            <ThemedText style={styles.seeAll}>See All →</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {filteredProducts.length === 0 ? (
            <View style={styles.noResultsWrap}>
              <ThemedText style={styles.noResultsTitle}>No products available</ThemedText>
              <ThemedText style={styles.noResultsSubtext}>Try another category or check again later</ThemedText>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const variants = Array.isArray(product?.variants) ? product.variants : [];
              const defaultVariant = variants.find((v: any) => v?.isDefault) || variants[0] || null;
              const activePrice = Number(defaultVariant?.price ?? product?.price ?? 0);
              const activeMrp = Number(defaultVariant?.mrp ?? product?.mrp ?? 0);
              const activeStock = Number(defaultVariant?.stock ?? product?.stock ?? 0);
              const activeUnitLabel = String(defaultVariant?.label || defaultVariant?.unitType || product?.unit || "piece");
              const isOutOfStock = activeStock <= 0;
              const discountPercent = defaultVariant ? getDiscountPercent(defaultVariant) : getDiscountPercent(product);
              const previewVariants = variants.slice(0, 3);
              const extraVariantCount = Math.max(0, variants.length - previewVariants.length);

              return (
                <TouchableOpacity
                  key={product.id || product._id}
                  style={styles.productCard}
                  onPress={() => {
                    const id = product._id || product.id;
                    router.push({ pathname: "/product/[productId]", params: { productId: id } });
                  }}
                >
                  <View style={styles.productImg}>
                    {Array.isArray(product.images) && product.images[0] ? (
                      <ImageBackground
                        source={{ uri: resolveImageUrl(product.images[0]) }}
                        style={styles.productImgBg}
                        imageStyle={styles.productImgStyle}
                      />
                    ) : (
                      <ThemedText style={styles.productEmoji}>
                        {product.emoji || product.image || "🛍️"}
                      </ThemedText>
                    )}
                    {discountPercent > 0 && (
                      <View style={styles.discountTag}>
                        <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
                      </View>
                    )}
                    <TouchableOpacity style={styles.wishlistBtn}>
                      <ThemedText style={styles.wishlistIcon}>♡</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productBody}>
                    <ThemedText style={styles.productMeta}>
                      {product.category || product.meta || product.type}
                    </ThemedText>
                    {product.rating && (
                      <View style={styles.rating}>
                        <ThemedText style={styles.ratingText}>⭐ {product.rating}</ThemedText>
                      </View>
                    )}
                    <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
                    <ThemedText style={styles.productWeight}>Per {activeUnitLabel}</ThemedText>

                    {previewVariants.length > 0 && (
                      <View style={styles.productVariantStrip}>
                        {previewVariants.map((variant: any) => {
                          const label = String(variant?.label || variant?.unitType || "Variant");
                          return (
                            <View key={String(variant?._id || label)} style={styles.productVariantChip}>
                              <ThemedText style={styles.productVariantChipText}>{label}</ThemedText>
                            </View>
                          );
                        })}
                        {extraVariantCount > 0 && (
                          <View style={styles.productVariantChip}>
                            <ThemedText style={styles.productVariantChipText}>+{extraVariantCount}</ThemedText>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.productFooter}>
                      <View>
                        <ThemedText style={styles.price}>₹{activePrice}</ThemedText>
                        {activeMrp > activePrice && (
                          <ThemedText style={styles.priceOld}>₹{activeMrp}</ThemedText>
                        )}
                        {isOutOfStock && <ThemedText style={styles.stockWarning}>Out of stock</ThemedText>}
                      </View>
                      <TouchableOpacity
                        style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
                        onPress={() =>
                          addItem({
                            id: defaultVariant?._id
                              ? `${product._id || product.id}:${String(defaultVariant._id)}`
                              : product._id || product.id,
                            productId: product._id || product.id,
                            variantId: defaultVariant?._id ? String(defaultVariant._id) : undefined,
                            variantLabel: defaultVariant?.label || defaultVariant?.unitType || undefined,
                            name: product.name,
                            price: activePrice,
                            unit: activeUnitLabel,
                            image: Array.isArray(product.images) && product.images[0]
                              ? resolveImageUrl(product.images[0])
                              : product.emoji || product.image || "🛍️",
                            stock: activeStock,
                          }, 1)
                        }
                        disabled={isOutOfStock}
                      >
                        <ThemedText style={[styles.addBtnText, isOutOfStock && { color: "#9CA3AF" }]}>
                          {isOutOfStock ? "OUT" : "ADD"}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Hot Deals */}
        <View style={styles.sectionHead}>
          <ThemedText style={styles.sectionTitle}>🏷️ Hot Deals</ThemedText>
        </View>

        <View style={styles.dealsRow}>
          <ExpoLinearGradient
            colors={["#FF6B35", "#F7C59F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealCard}
          >
            <View style={styles.dealInfo}>
              <ThemedText style={styles.dealTitle} numberOfLines={2}>Weekend Sale!{"\n"}Up to 40%</ThemedText>
              <ThemedText style={styles.dealDesc} numberOfLines={1}>Fresh fruits & veggies</ThemedText>
              <TouchableOpacity style={styles.dealBtn}>
                <ThemedText style={styles.dealBtnText}>Shop →</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.dealEmoji}>
              <ThemedText style={styles.dealEmojiText}>🍉</ThemedText>
            </View>
          </ExpoLinearGradient>

          <ExpoLinearGradient
            colors={["#7C3AED", "#A78BFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealCard}
          >
            <View style={styles.dealInfo}>
              <ThemedText style={styles.dealTitle} numberOfLines={2}>Buy 2 Get 1{"\n"}FREE</ThemedText>
              <ThemedText style={styles.dealDesc} numberOfLines={1}>On dairy products</ThemedText>
              <TouchableOpacity style={styles.dealBtn}>
                <ThemedText style={styles.dealBtnText}>Shop →</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.dealEmoji}>
              <ThemedText style={styles.dealEmojiText}>🥛</ThemedText>
            </View>
          </ExpoLinearGradient>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
//  STYLES — react-native-size-matters
//  scale()         → width, horizontal padding/margin
//  verticalScale() → height, vertical padding/margin
//  moderateScale() → font sizes, border radius
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  // ── Header ──
  header: {
    backgroundColor: COLORS.white,
    borderBottomColor: "rgba(0,0,0,0.06)",
    borderBottomWidth: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    gap: moderateScale(10),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  iconBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(12),
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconEmoji: {
    fontSize: moderateScale(20),
  },
  dot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: scale(8),
    height: scale(8),
    backgroundColor: COLORS.red,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: COLORS.accent,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(14),
    height: scale(44),
    justifyContent: "center",
  },
  cartCount: {
    fontWeight: "700",
    color: COLORS.white,
    fontSize: moderateScale(12),
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1.2,
    borderColor: COLORS.light,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(44),
    gap: scale(6),
  },
  searchIcon: {
    fontSize: moderateScale(15),
    color: COLORS.muted,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: COLORS.muted,
  },

  // ── Toast ──
  orderToast: {
    position: "absolute",
    top: verticalScale(76),
    left: scale(16),
    right: scale(16),
    zIndex: 99,
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    elevation: 6,
  },
  orderToastText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: moderateScale(12),
    textAlign: "center",
  },

  // ── Main scroll ──
  main: {
    flex: 1,
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(12),
  },

  // ── Section head ──
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: moderateScale(18),
  },
  seeAll: {
    fontWeight: "600",
    color: COLORS.accent,
    fontSize: moderateScale(13),
  },

  // ── Offers ──
  offerSection: {
    marginBottom: verticalScale(20),
    marginHorizontal: -scale(14),
    overflow: "hidden",
  },
  offerCard: {
    height: verticalScale(155),
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: COLORS.accent,
  },
  offerCardImage: {
    resizeMode: "cover",
  },
  offerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,61,30,0.48)",
  },
  offerContent: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    gap: verticalScale(4),
  },
  offerTitle: {
    color: COLORS.white,
    fontSize: moderateScale(16),
    fontWeight: "800",
  },
  offerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: moderateScale(10),
  },
  offerCta: {
    alignSelf: "flex-start",
    marginTop: verticalScale(2),
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
  },
  offerCtaText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: moderateScale(12),
  },
  offerDots: {
    marginTop: verticalScale(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  offerDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
  },
  offerDotActive: {
    width: scale(22),
    backgroundColor: COLORS.accent,
  },

  // ── Hero ──
  hero: {
    borderRadius: moderateScale(14),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    minHeight: verticalScale(110),
  },
  heroLeft: { flex: 1 },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(248,194,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(248,194,0,0.4)",
    borderRadius: moderateScale(36),
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(4),
  },
  heroBadgeText: {
    fontWeight: "700",
    color: COLORS.primary,
    fontSize: moderateScale(10),
  },
  heroTitle: {
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: verticalScale(5),
    lineHeight: moderateScale(26),
    fontSize: moderateScale(22),
  },
  heroTitleSpan: {
    color: COLORS.primary,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.75)",
    marginBottom: verticalScale(10),
    lineHeight: moderateScale(17),
    fontSize: moderateScale(11),
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
  },
  heroCtaText: {
    fontWeight: "800",
    color: COLORS.accent,
    fontSize: moderateScale(13),
  },
  heroRight: {
    justifyContent: "center",
    alignItems: "center",
    width: scale(70),
    height: scale(70),
  },
  heroEmoji: {
    fontSize: moderateScale(34),
  },

  // ── Delivery Strip ──
  deliveryStrip: {
    marginBottom: verticalScale(18),
    gap: verticalScale(10),
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  dcIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(12),
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  dcEmoji: {
    fontSize: moderateScale(20),
  },
  flexOne: { flex: 1 },
  deliveryTime: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: moderateScale(10),
    borderRadius: moderateScale(4),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    marginBottom: verticalScale(2),
    alignSelf: "flex-start",
  },
  dcTitle: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: moderateScale(13),
    marginBottom: verticalScale(2),
  },
  dcDesc: {
    color: COLORS.muted,
    fontSize: moderateScale(11),
  },

  // ── Category Card ──
  categoryCard: {
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 3,
  },

  // ── Product Grid ──
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: verticalScale(20),
    gap: scale(8),
  },
  noResultsWrap: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(18),
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsTitle: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: verticalScale(6),
  },
  noResultsSubtext: {
    fontSize: moderateScale(12),
    color: COLORS.muted,
    textAlign: "center",
  },
  productCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  productImg: {
    backgroundColor: COLORS.light,
    height: verticalScale(115),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  productImgBg: {
    width: scale(80),
    height: verticalScale(80),
    justifyContent: "center",
    alignItems: "center",
  },
  productImgStyle: {
    resizeMode: "contain",
    borderRadius: moderateScale(12),
  },
  productEmoji: {
    fontSize: moderateScale(28),
  },
  discountTag: {
    position: "absolute",
    top: verticalScale(6),
    left: scale(6),
    backgroundColor: COLORS.green,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(4),
  },
  discountText: {
    fontWeight: "800",
    color: COLORS.white,
    fontSize: moderateScale(9),
  },
  wishlistBtn: {
    position: "absolute",
    top: verticalScale(6),
    right: scale(6),
    width: scale(30),
    height: scale(30),
    backgroundColor: COLORS.white,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistIcon: {
    fontSize: moderateScale(15),
  },
  productBody: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
  },
  productMeta: {
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: verticalScale(2),
    fontSize: moderateScale(10),
  },
  rating: {
    backgroundColor: "#F0FDF4",
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(3),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    alignSelf: "flex-start",
  },
  ratingText: {
    fontWeight: "700",
    color: "#166534",
    fontSize: moderateScale(10),
  },
  productName: {
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: verticalScale(2),
    fontSize: moderateScale(12),
    lineHeight: moderateScale(16),
  },
  productWeight: {
    color: COLORS.muted,
    marginBottom: verticalScale(6),
    fontSize: moderateScale(10),
  },
  productVariantStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(5),
    marginBottom: verticalScale(6),
  },
  productVariantChip: {
    backgroundColor: COLORS.light,
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(3),
  },
  productVariantChipText: {
    fontSize: moderateScale(9),
    color: COLORS.muted,
    fontWeight: "700",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: scale(6),
  },
  price: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: moderateScale(14),
  },
  priceOld: {
    color: COLORS.muted,
    textDecorationLine: "line-through",
    fontWeight: "400",
    fontSize: moderateScale(10),
  },
  stockWarning: {
    color: "#EF4444",
    fontSize: moderateScale(10),
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
  },
  addBtnDisabled: {
    borderColor: "#9CA3AF",
    backgroundColor: "#F3F4F6",
  },
  addBtnText: {
    fontWeight: "800",
    color: COLORS.accent,
    fontSize: moderateScale(11),
  },

  // ── Deals ──
  dealsRow: {
    flexDirection: "row",
    gap: scale(12),
    marginBottom: verticalScale(24),
  },
  dealCard: {
    flex: 1,
    borderRadius: moderateScale(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
  },
  dealInfo: { flex: 1 },
  dealTitle: {
    fontWeight: "800",
    color: COLORS.white,
    fontSize: moderateScale(13),
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(18),
  },
  dealDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: moderateScale(11),
    marginBottom: verticalScale(10),
  },
  dealBtn: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(8),
    alignSelf: "flex-start",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  dealBtnText: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: moderateScale(11),
  },
  dealEmoji: {
    width: scale(36),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dealEmojiText: {
    fontSize: moderateScale(28),
  },
});