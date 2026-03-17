import { ThemedText } from "@/components/themed-text";
import {
  createResponsiveStyles,
  responsiveModerateScale,
  responsiveScale,
  responsiveVerticalScale,
} from "@/utils/responsive";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useCart from "@/stores/cartStore";
import useLocationStore from "@/stores/locationStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageSourcePropType,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  View,
  useWindowDimensions,
  FlatList,
} from "react-native"; /*  */
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
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

// Helper function to get color for category
const getCategoryColor = (categoryName: string) => {
  const slug = (categoryName || "").toLowerCase().trim();
  return CATEGORY_COLORS[slug] || "#F3F4F6";
};

const getParentCategoryId = (category: any): string => {
  if (!category?.parentCategory) return "";
  if (typeof category.parentCategory === "string")
    return category.parentCategory;
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
  if (
    n.includes("atta") ||
    n.includes("rice") ||
    n.includes("pulse") ||
    n.includes("dal")
  )
    return "rice";
  if (n.includes("dairy") || n.includes("milk")) return "cup";
  if (n.includes("masala") || n.includes("spice")) return "chili-mild";
  if (n.includes("snack") || n.includes("namkeen")) return "french-fries";
  if (
    n.includes("personal") ||
    n.includes("care") ||
    n.includes("soap") ||
    n.includes("perfume")
  )
    return "spray-bottle";
  if (n.includes("oil") || n.includes("ghee")) return "bottle-tonic";
  if (n.includes("instant") || n.includes("ready"))
    return "silverware-fork-knife";
  if (n.includes("beverage") || n.includes("drink")) return "coffee";
  if (n.includes("household") || n.includes("clean")) return "broom";
  if (n.includes("dry") || n.includes("nut")) return "peanut";
  if (n.includes("stationery")) return "pencil";
  if (n.includes("baby")) return "baby-face-outline";
  return "shape-outline";
};

// Color Scheme
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

// Helper function to get responsive values
const getResponsiveValue = (
  smallScreen: number,
  largeScreen: number,
  width: number,
) => {
  return width < 380 ? smallScreen : largeScreen;
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
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [latestOrder, setLatestOrder] = useState<OrderRow | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

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

    if (!addressParam) {
      return;
    }

    setSelectedLocation({
      address: addressParam,
      deliveryInstructions: instructionsParam,
      latitude: Number.isFinite(latitudeParam)
        ? latitudeParam
        : selectedLocation.latitude,
      longitude: Number.isFinite(longitudeParam)
        ? longitudeParam
        : selectedLocation.longitude,
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

  // Load remote catalog data
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
        const mainCategories = (cats || []).filter(
          (category: any) => !getParentCategoryId(category),
        );
        setCategories(mainCategories);
        setProducts(prods || []);
        // Attach local images as fallbacks for offers. Prefer remote offers if available.
        const localImgs = [shamImg, msaleImg, teaImg, oneImg];
        let finalOffers: any[] = [];
        if (offs && offs.length > 0) {
          finalOffers = offs.map((o: any, i: number) => ({
            ...o,
            id: o?._id || o?.id || `offer-${i}`,
            image:
              typeof o?.image === "string" && o.image.trim().length > 0
                ? resolveImageUrl(o.image)
                : localImgs[i % localImgs.length],
          }));
        } else {
          finalOffers = localImgs.map((img, i) => ({
            id: `local-${i}`,
            title: "",
            subtitle: "",
            image: img,
          }));
        }
        setOffers(finalOffers);
        // Set first category as selected
        if (mainCategories.length > 0) {
          setSelectedCategory(mainCategories[0]._id);
        }
      } finally {
        // no-op: screen renders independently without explicit loading spinner
      }
    }

    loadCatalog();
    return () => {
      mounted = false;
    };
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
    const intervalId = setInterval(() => {
      loadUnreadCount().catch(() => {});
    }, 25000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rows = await getMyOrdersApi();
        if (!mounted) return;

        if (!rows || rows.length === 0) {
          setLatestOrder(null);
          return;
        }

        const sortedOrders = [...rows].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        setLatestOrder(sortedOrders[0] ?? null);
      } catch {
        if (mounted) setLatestOrder(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getOfferImageSource = (
    imageValue: unknown,
  ): ImageSourcePropType | null => {
    if (typeof imageValue === "number") {
      return imageValue;
    }

    if (typeof imageValue === "string" && imageValue.trim().length > 0) {
      return { uri: imageValue };
    }

    return null;
  };

  // Filter products by selected category
  const categoryFilteredProducts = selectedCategory
    ? products.filter(
        (p: any) => getEntityId(p.categoryId) === selectedCategory,
      )
    : products;
  const filteredProducts = categoryFilteredProducts;

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

  const locationLines = useMemo(() => {
    const fallback = ["Select your location", "Tap to choose delivery address"];
    if (
      !selectedLocation.address ||
      selectedLocation.address === "Select your delivery location"
    ) {
      return fallback;
    }

    const pieces = selectedLocation.address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (pieces.length <= 1) {
      return [pieces[0], "Tap to update location"];
    }

    return [
      pieces.slice(0, 2).join(", "),
      pieces.slice(2).join(", ") || "Tap to update location",
    ];
  }, [selectedLocation.address]);

  // Responsive values
  const isSmallScreen = width < 380;
  const headerPadding = getResponsiveValue(12, 16, width);
  const horizontalPadding = getResponsiveValue(12, 16, width);
  const heroFontSize = getResponsiveValue(28, 36, width);
  const offerCardWidth = width - horizontalPadding * 2;

  const handleOfferScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / offerCardWidth,
    );
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
        offerScrollRef.current?.scrollTo({
          x: next * offerCardWidth,
          animated: true,
        });
      } catch {
        // ref may not be mounted during initial render
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
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: headerPadding,
            paddingVertical: responsiveVerticalScale(10),
            gap: responsiveModerateScale(12),
          },
        ]}
      >
        {/* Location + Profile/Order row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: responsiveVerticalScale(6),
          }}
        >
          <TouchableOpacity
            style={styles.locationChip}
            onPress={() =>
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
          >
            <ThemedText style={styles.locationPin}>📍</ThemedText>
            <ThemedText
              style={[styles.locText, { fontSize: responsiveModerateScale(11), marginLeft: 4 }]}
              numberOfLines={1}
            >
              {locationLines[0]}
            </ThemedText>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: responsiveModerateScale(8) }}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  width: responsiveScale(38),
                  height: responsiveVerticalScale(38),
                },
              ]}
              onPress={() => router.push("/orders")}
            >
              <ThemedText style={{ fontSize: responsiveModerateScale(18) }}>🧾</ThemedText>
              {latestOrder && <View style={styles.dotMini} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  width: responsiveScale(38),
                  height: responsiveVerticalScale(38),
                },
              ]}
              onPress={() => router.push("/profile")}
            >
              <ThemedText style={{ fontSize: responsiveModerateScale(18) }}>👤</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar & Actions Row */}
        <View
          style={{
            flexDirection: "row",
            gap: responsiveModerateScale(10),
            alignItems: "center",
          }}
        >
          {/* Header Actions */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                width: responsiveScale(44),
                height: responsiveVerticalScale(44),
              },
            ]}
            onPress={() => {
              setUnreadNotificationCount(0);
              router.push("/notifications");
            }}
          >
            <ThemedText style={{ fontSize: responsiveModerateScale(22) }}>
              🔔
            </ThemedText>
            {unreadNotificationCount > 0 && <View style={styles.dot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cartBtn,
              {
                paddingHorizontal: responsiveScale(14),
                paddingVertical: responsiveVerticalScale(10),
                height: responsiveVerticalScale(44),
                justifyContent: "center",
              },
            ]}
            onPress={() => router.push("/cart")}
          >
            <ThemedText style={{ fontSize: responsiveModerateScale(22) }}>
              🛒
            </ThemedText>
            {cartCount > 0 && (
              <ThemedText
                style={[
                  styles.cartCount,
                  { fontSize: responsiveModerateScale(12) },
                ]}
              >
                {cartCount}
              </ThemedText>
            )}
          </TouchableOpacity>

          {/* Search Bar */}
          <TouchableOpacity
            style={[styles.searchBar, { flex: 1 }]}
            onPress={() => router.push("/search")}
          >
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <ThemedText
              style={[
                styles.searchInput,
                { fontSize: responsiveModerateScale(13), color: COLORS.muted },
              ]}
            >
              {isSmallScreen ? "Search..." : 'Search "eggs", "milk"…'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHead}>
          <ThemedText
            style={[
              styles.sectionTitle,
              { fontSize: responsiveModerateScale(20) },
            ]}
          >
            🎁 Offers For You
          </ThemedText>
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
                {getOfferImageSource(offer.image) ? (
                  <ImageBackground
                    source={
                      getOfferImageSource(offer.image) as ImageSourcePropType
                    }
                    style={styles.offerCard}
                    imageStyle={styles.offerCardImage}
                  >
                    <View style={styles.offerOverlay} />
                    <View style={styles.offerContent}>
                      <ThemedText style={styles.offerTitle}>
                        {offer.title}
                      </ThemedText>
                      <ThemedText style={styles.offerSubtitle}>
                        {offer.subtitle}
                      </ThemedText>
                      {offer.cta && (
                        <TouchableOpacity style={styles.offerCta}>
                          <ThemedText style={styles.offerCtaText}>
                            {offer.cta}
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ImageBackground>
                ) : (
                  <View
                    style={[
                      styles.offerCard,
                      { backgroundColor: COLORS.accent },
                    ]}
                  >
                    <View style={styles.offerOverlay} />
                    <View style={styles.offerContent}>
                      <ThemedText style={styles.offerTitle}>
                        {offer.title}
                      </ThemedText>
                      <ThemedText style={styles.offerSubtitle}>
                        {offer.subtitle}
                      </ThemedText>
                      {offer.cta && (
                        <TouchableOpacity style={styles.offerCta}>
                          <ThemedText style={styles.offerCtaText}>
                            {offer.cta}
                          </ThemedText>
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
                style={[
                  styles.offerDot,
                  index === activeOfferIndex && styles.offerDotActive,
                ]}
              />
            ))}
          </View>
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
              <ThemedText style={styles.heroBadgeText}>
                ⚡ Fastest Delivery
              </ThemedText>
            </View>
            <ThemedText style={[styles.heroTitle, { fontSize: heroFontSize }]}>
              Groceries at{"\n"}
              <ThemedText style={styles.heroTitleSpan}>
                Lightning Speed
              </ThemedText>
            </ThemedText>
            <ThemedText style={styles.heroDesc}>
              Fresh fruits & dairy — delivered in 10 mins
            </ThemedText>
            <TouchableOpacity style={styles.heroCta}>
              <ThemedText style={styles.heroCtaText}>Shop Now →</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.heroRight}>
            <ThemedText style={{ fontSize: responsiveModerateScale(35) }}>
              🛒
            </ThemedText>
          </View>
        </ExpoLinearGradient>

        {/* Delivery Info Cards */}
        <View style={styles.deliveryStrip}>
          <View style={styles.deliveryCard}>
            <View
              style={[
                styles.dcIcon,
                {
                  backgroundColor: "#FFF8D0",
                  width: responsiveScale(44),
                  height: responsiveVerticalScale(44),
                },
              ]}
            >
              <ThemedText style={{ fontSize: responsiveModerateScale(22) }}>
                ⚡
              </ThemedText>
            </View>
            <View style={styles.flexOne}>
              <ThemedText style={styles.deliveryTime}>10 MIN</ThemedText>
              <ThemedText style={styles.dcTitle}>Lightning Fast</ThemedText>
              <ThemedText style={styles.dcDesc}>Average delivery</ThemedText>
            </View>
          </View>

          <View style={styles.deliveryCard}>
            <View
              style={[
                styles.dcIcon,
                {
                  backgroundColor: "#DCFCE7",
                  width: responsiveScale(44),
                  height: responsiveVerticalScale(44),
                },
              ]}
            >
              <ThemedText style={{ fontSize: responsiveModerateScale(22) }}>
                🌿
              </ThemedText>
            </View>
            <View style={styles.flexOne}>
              <ThemedText
                style={[styles.deliveryTime, { backgroundColor: "#22C55E" }]}
              >
                100% FRESH
              </ThemedText>
              <ThemedText style={styles.dcTitle}>Farm Fresh</ThemedText>
              <ThemedText style={styles.dcDesc}>Sourced daily</ThemedText>
            </View>
          </View>

          <View style={styles.deliveryCard}>
            <View
              style={[
                styles.dcIcon,
                {
                  backgroundColor: "#DBEAFE",
                  width: responsiveScale(44),
                  height: responsiveVerticalScale(44),
                },
              ]}
            >
              <ThemedText style={{ fontSize: responsiveModerateScale(22) }}>
                🏷️
              </ThemedText>
            </View>
            <View style={styles.flexOne}>
              <ThemedText
                style={[styles.deliveryTime, { backgroundColor: "#8B5CF6" }]}
              >
                BEST PRICE
              </ThemedText>
              <ThemedText style={styles.dcTitle}>Zero Fees</ThemedText>
              <ThemedText style={styles.dcDesc}>Free delivery</ThemedText>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHead}>
          <ThemedText
            style={[
              styles.sectionTitle,
              { fontSize: responsiveModerateScale(20) },
            ]}
          >
            Shop by Category
          </ThemedText>
          <TouchableOpacity onPress={() => router.push("/categories")}>
            <ThemedText style={styles.seeAll}>View All →</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Categories — horizontal FlatList single-row */}
        <View>
          {(() => {
            const visibleOnScreen = width < 380 ? 4 : 5; // how many cards fit before scrolling
            const gap = responsiveScale(12);
            const horizontalPadding = responsiveScale(32); // 16 left + 16 right
            const winW = width;
            const cardSize = Math.floor(
              (winW - horizontalPadding - (visibleOnScreen - 1) * gap) /
                visibleOnScreen,
            );

            return (
              <FlatList
                key="categories-horizontal"
                data={categories}
                keyExtractor={(item, idx) => item._id ?? String(idx)}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: responsiveScale(16),
                  paddingBottom: responsiveVerticalScale(8),
                }}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedCategory(item._id)}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor: getCategoryColor(item.name),
                        width: cardSize,
                        height: cardSize,
                        marginRight: gap,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getCategoryIcon(item?.name)}
                      size={responsiveModerateScale(30)}
                      color="#0E7A3D"
                    />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={{ height: responsiveVerticalScale(8) }} />
                }
              />
            );
          })()}
        </View>

        {/* Products */}
        <View style={styles.sectionHead}>
          <ThemedText
            style={[
              styles.sectionTitle,
              { fontSize: responsiveModerateScale(20) },
            ]}
          >
            🔥 Trending Now
          </ThemedText>
          <TouchableOpacity onPress={() => router.push("/products")}>
            <ThemedText style={styles.seeAll}>See All →</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {filteredProducts.length === 0 ? (
            <View style={styles.noResultsWrap}>
              <ThemedText style={styles.noResultsTitle}>
                No products available
              </ThemedText>
              <ThemedText style={styles.noResultsSubtext}>
                Try another category or check again later
              </ThemedText>
            </View>
          ) : (
            filteredProducts.map((product) =>
              (() => {
                const variants = Array.isArray(product?.variants)
                  ? product.variants
                  : [];
                const defaultVariant =
                  variants.find((variant: any) => variant?.isDefault) ||
                  variants[0] ||
                  null;
                const activePrice = Number(
                  defaultVariant?.price ?? product?.price ?? 0,
                );
                const activeMrp = Number(
                  defaultVariant?.mrp ?? product?.mrp ?? 0,
                );
                const activeStock = Number(
                  defaultVariant?.stock ?? product?.stock ?? 0,
                );
                const activeUnitLabel = String(
                  defaultVariant?.label ||
                    defaultVariant?.unitType ||
                    product?.unit ||
                    "piece",
                );
                const isOutOfStock = activeStock <= 0;
                const discountPercent = defaultVariant
                  ? getDiscountPercent(defaultVariant)
                  : getDiscountPercent(product);
                const previewVariants = variants.slice(0, 3);
                const extraVariantCount = Math.max(
                  0,
                  variants.length - previewVariants.length,
                );

                return (
                  <TouchableOpacity
                    key={product.id || product._id}
                    style={styles.productCard}
                    onPress={() => {
                      const id = product._id || product.id;
                      router.push({
                        pathname: "/product/[productId]",
                        params: { productId: id },
                      });
                    }}
                  >
                    <View style={styles.productImg}>
                      {/* Show MinIO image if available, else fallback to emoji or placeholder */}
                      {Array.isArray(product.images) && product.images[0] ? (
                        <ImageBackground
                          source={{ uri: resolveImageUrl(product.images[0]) }}
                          style={{
                            width: responsiveScale(80),
                            height: responsiveVerticalScale(80),
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          imageStyle={{
                            resizeMode: "contain",
                            borderRadius: responsiveModerateScale(12),
                          }}
                        >
                          {/* Optionally overlay discount or wishlist here if needed */}
                        </ImageBackground>
                      ) : (
                        <ThemedText
                          style={{ fontSize: responsiveModerateScale(28) }}
                        >
                          {product.emoji || product.image || "🛍️"}
                        </ThemedText>
                      )}
                      {discountPercent > 0 && (
                        <View style={styles.discountTag}>
                          <ThemedText style={styles.discountText}>
                            {discountPercent}% OFF
                          </ThemedText>
                        </View>
                      )}
                      <TouchableOpacity style={styles.wishlistBtn}>
                        <ThemedText
                          style={{ fontSize: responsiveModerateScale(16) }}
                        >
                          ♡
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.productBody}>
                      <ThemedText style={styles.productMeta}>
                        {product.category || product.meta || product.type}
                      </ThemedText>
                      {product.rating && (
                        <View style={styles.rating}>
                          <ThemedText style={styles.ratingText}>
                            ⭐ {product.rating}
                          </ThemedText>
                        </View>
                      )}
                      <ThemedText style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </ThemedText>
                      <ThemedText style={styles.productWeight}>
                        Per {activeUnitLabel}
                      </ThemedText>
                      {previewVariants.length > 0 && (
                        <View style={styles.productVariantStrip}>
                          {previewVariants.map((variant: any) => {
                            const label = String(
                              variant?.label || variant?.unitType || "Variant",
                            );
                            return (
                              <View
                                key={String(variant?._id || label)}
                                style={styles.productVariantChip}
                              >
                                <ThemedText
                                  style={styles.productVariantChipText}
                                >
                                  {label}
                                </ThemedText>
                              </View>
                            );
                          })}
                          {extraVariantCount > 0 && (
                            <View style={styles.productVariantChip}>
                              <ThemedText style={styles.productVariantChipText}>
                                +{extraVariantCount}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      )}
                      <View style={styles.productFooter}>
                        <View>
                          <ThemedText style={styles.price}>
                            ₹{activePrice}
                          </ThemedText>
                          {activeMrp > activePrice && (
                            <ThemedText style={styles.priceOld}>
                              ₹{activeMrp}
                            </ThemedText>
                          )}
                          {isOutOfStock && (
                            <ThemedText style={styles.stockWarning}>
                              Out of stock
                            </ThemedText>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.addBtn,
                            isOutOfStock && styles.addBtnDisabled,
                          ]}
                          onPress={() =>
                            addItem(
                              {
                                id: defaultVariant?._id
                                  ? `${product._id || product.id}:${String(defaultVariant._id)}`
                                  : product._id || product.id,
                                productId: product._id || product.id,
                                variantId: defaultVariant?._id
                                  ? String(defaultVariant._id)
                                  : undefined,
                                variantLabel:
                                  defaultVariant?.label ||
                                  defaultVariant?.unitType ||
                                  undefined,
                                name: product.name,
                                price: activePrice,
                                unit: activeUnitLabel,
                                image:
                                  Array.isArray(product.images) &&
                                  product.images[0]
                                    ? resolveImageUrl(product.images[0])
                                    : product.emoji || product.image || "🛍️",
                                stock: activeStock,
                              },
                              1,
                            )
                          }
                          disabled={isOutOfStock}
                        >
                          <ThemedText style={styles.addBtnText}>
                            {isOutOfStock ? "OUT" : "ADD"}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })(),
            )
          )}
        </View>

        {/* Deals Section */}
        <View style={styles.sectionHead}>
          <ThemedText
            style={[
              styles.sectionTitle,
              { fontSize: responsiveModerateScale(20) },
            ]}
          >
            🏷️ Hot Deals
          </ThemedText>
        </View>

        <View style={styles.dealsRow}>
          <ExpoLinearGradient
            colors={["#FF6B35", "#F7C59F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealCard}
          >
            <View style={styles.dealInfo}>
              <ThemedText style={styles.dealTitle}>
                Weekend Sale!{"\n"}Up to 40%
              </ThemedText>
              <ThemedText style={styles.dealDesc}>
                Fresh fruits & veggies
              </ThemedText>
              <TouchableOpacity style={styles.dealBtn}>
                <ThemedText style={styles.dealBtnText}>Shop →</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: responsiveModerateScale(40) }}>
              🍉
            </ThemedText>
          </ExpoLinearGradient>

          <ExpoLinearGradient
            colors={["#7C3AED", "#A78BFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealCard}
          >
            <View style={styles.dealInfo}>
              <ThemedText style={styles.dealTitle}>
                Buy 2 Get 1{"\n"}FREE
              </ThemedText>
              <ThemedText style={styles.dealDesc}>On dairy products</ThemedText>
              <TouchableOpacity style={styles.dealBtn}>
                <ThemedText style={styles.dealBtnText}>Shop →</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: responsiveModerateScale(40) }}>
              🥛
            </ThemedText>
          </ExpoLinearGradient>
        </View>

        <View style={{ height: responsiveVerticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createResponsiveStyles({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomColor: "rgba(0,0,0,0.06)",
    flexDirection: "column",
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1.2,
    borderColor: COLORS.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 44,
    gap: 6,
    flexShrink: 1,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 40,
    minWidth: 90,
    maxWidth: 180,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  locText: {
    fontWeight: "600",
    color: COLORS.text,
    fontSize: 12,
  },
  locationPin: {
    fontSize: 16,
    color: COLORS.primaryDark,
  },
  locSub: {
    color: COLORS.muted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.muted,
  },
  flexOne: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1.2,
    borderColor: COLORS.light,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 44,
    gap: 6,
  },
  searchIcon: {
    fontSize: 16,
    color: COLORS.muted,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontFamily: "DM Sans",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
  },
  cartCount: {
    fontWeight: "700",
    color: COLORS.white,
  },
  main: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  orderStatus: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.light,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  orderDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.green,
    borderRadius: 8,
  },
  dotMini: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    backgroundColor: COLORS.red,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  orderStatusInfo: {
    flex: 1,
    minWidth: 80,
  },
  orderStatusTitle: {
    fontWeight: "600",
    color: COLORS.text,
    fontSize: 11,
    marginBottom: 2,
  },
  orderStatusSub: {
    color: COLORS.muted,
    fontSize: 10,
  },
  orderTrackBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orderTrackBtnText: {
    fontWeight: "700",
    color: COLORS.accent,
    fontSize: 11,
  },
  offerSection: {
    marginBottom: 18,
  },
  offerCard: {
    height: 110,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: COLORS.accent,
  },
  offerCardImage: {
    resizeMode: "cover",
    borderRadius: 14,
  },
  offerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,61,30,0.48)",
  },
  offerContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  offerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  offerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
  },
  offerCta: {
    alignSelf: "flex-start",
    marginTop: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  offerCtaText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  offerDots: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  offerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
  },
  offerDotActive: {
    width: 22,
    backgroundColor: COLORS.accent,
  },
  hero: {
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 112,
  },
  heroLeft: {
    flex: 1,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(248,194,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(248,194,0,0.4)",
    borderRadius: 36,
    marginBottom: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontWeight: "700",
    color: COLORS.primary,
    fontSize: 10,
  },
  heroTitle: {
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 6,
    lineHeight: 28,
    fontSize: 16,
  },
  heroTitleSpan: {
    color: COLORS.primary,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.75)",
    marginBottom: 10,
    lineHeight: 18,
    fontSize: 10,
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroCtaText: {
    fontWeight: "800",
    color: COLORS.accent,
  },
  heroRight: {
    marginRight: -8,
    justifyContent: "center",
    alignItems: "center",
    width: 78,
    height: 78,
  },  deliveryStrip: {
    marginBottom: 20,
    gap: 10,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  dcIcon: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  deliveryTime: {
    color: COLORS.white,
    fontWeight: "800",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
    alignSelf: "flex-start",
  },
  dcTitle: {
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  dcDesc: {
    color: COLORS.muted,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: "800",
    color: COLORS.text,
  },
  seeAll: {
    fontWeight: "600",
    color: COLORS.accent,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 18,
    gap: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryCard: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 4,
    borderWidth: 0,
  },
  categoryCardActive: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  categoryIcon: {
    fontSize: 38,
    width: 38,
    height: 38,
    textAlign: "center",
    marginBottom: 6,
    color: COLORS.text,
  },
  categoryImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 8,
  },
  noResultsWrap: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
  },
  productCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  productImg: {
    backgroundColor: COLORS.light,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  discountTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: COLORS.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontWeight: "800",
    color: COLORS.white,
    fontSize: 9,
  },
  wishlistBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    backgroundColor: COLORS.white,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  productBody: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  productMeta: {
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 2,
    fontSize: 10,
  },
  rating: {
    backgroundColor: "#F0FDF4",
    borderRadius: 4,
    marginBottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  ratingText: {
    fontWeight: "700",
    color: "#166534",
    fontSize: 10,
  },
  productName: {
    fontWeight: "700",
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
  productVariantStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  productVariantChip: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productVariantChipText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
  },
  price: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 15,
  },
  priceOld: {
    color: COLORS.muted,
    textDecorationLine: "line-through",
    fontWeight: "400",
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
  addBtnDisabled: {
    borderColor: "#9CA3AF",
    backgroundColor: "#F3F4F6",
  },
  addBtnText: {
    fontWeight: "800",
    color: COLORS.accent,
    fontSize: 11,
  },
  stockWarning: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
  },
  dealsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  dealCard: {
    flex: 1,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dealInfo: {
    flex: 1,
  },
  dealTitle: {
    fontWeight: "800",
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 20,
  },
  dealDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 10,
  },
  dealBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dealBtnText: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: 11,
  },
  dealEmoji: {
    marginRight: -8,
  },
});
