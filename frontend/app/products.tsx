// ✅ SAME IMPORTS (unchanged)
import { ThemedText } from "@/components/themed-text";
import { Product, Category } from "@/types";
import {
  getResponsiveFont,
  getScreenPadding,
  createResponsiveStyles,
  responsiveScale,
} from "@/utils/responsive";
import useCart from "@/stores/cartStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchCategories, fetchProducts } from "@/services/catalogService";
import { resolveImageUrl } from "@/config/api";

// ───────────────── Product Image ─────────────────
function ProductImage({
  images,
  name,
}: Readonly<{ images?: string[]; name: string }>) {
  const [errored, setErrored] = useState(false);
  const uri = resolveImageUrl(images?.[0] ?? null);

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
        {name?.charAt(0)?.toUpperCase() || "?"}
      </ThemedText>
    </View>
  );
}

// ───────────────── Screen ─────────────────
export default function ProductsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = getScreenPadding(width);
  const cardGap = responsiveScale(8);
  const cardWidth = (width - horizontalPadding * 2 - cardGap * 3) / 2;

  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
    subcategoryId?: string;
  }>();

  const addItem = useCart((s) => s.addItem);

  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedSubCategoryId, setSelectedSubCategoryId] =
    useState<string>("all");

  // ───────── Helpers ─────────
  const getId = (v: any): string =>
    typeof v === "string" ? v : String(v?._id || v?.id || "");

  const getParentCategoryId = (c: any): string =>
    typeof c?.parentCategory === "string"
      ? c.parentCategory
      : c?.parentCategory?._id || "";

  // ───────── Load Data ─────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const catId =
          typeof params.categoryId === "string" ? params.categoryId : undefined;

        const incomingSub =
          typeof params.subcategoryId === "string"
            ? params.subcategoryId
            : "all";

        const cats = await fetchCategories();
        const allProducts = await fetchProducts({ limit: 300 });

        const categoryList = Array.isArray(cats) ? cats : [];
        let prods = Array.isArray(allProducts) ? allProducts : [];
        let derivedSubCategories: any[] = [];

        if (catId) {
          derivedSubCategories = categoryList.filter(
            (c: any) => getParentCategoryId(c) === catId,
          );

          const relatedIds = new Set<string>([catId]);

          categoryList.forEach((c: any) => {
            const parentId = getParentCategoryId(c);
            const id = getId(c);
            if (parentId === catId && id) relatedIds.add(id);
          });

          prods = prods.filter((p: any) => {
            const cid = getId(p.categoryId);
            const sid = getId(p.subcategoryId);
            return relatedIds.has(cid) || relatedIds.has(sid);
          });
        }

        if (!mounted) return;

        setProducts(prods);
        setSubCategories(derivedSubCategories);

        const normalizedIncomingSub = incomingSub || "all";
        const validSubIds = new Set(
          derivedSubCategories.map((c: any) => getId(c)).filter(Boolean),
        );
        const nextSubCategoryId =
          normalizedIncomingSub === "all" ||
          validSubIds.has(normalizedIncomingSub)
            ? normalizedIncomingSub
            : "all";

        setSelectedSubCategoryId(nextSubCategoryId);
      } catch {
        if (!mounted) return;
        setProducts([]);
        setSubCategories([]);
        setSelectedSubCategoryId("all");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.categoryId, params.subcategoryId]);

  // ───────── Filtering ─────────
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleProducts = products
    .filter((p) =>
      selectedSubCategoryId === "all"
        ? true
        : getId(p.subcategoryId) === selectedSubCategoryId ||
          getId(p.categoryId) === selectedSubCategoryId,
    )
    .filter((p) =>
      normalizedQuery === ""
        ? true
        : String(p.name || "")
            .toLowerCase()
            .includes(normalizedQuery),
    );

  // ───────── Discount Helper ─────────
  const getDiscountPercent = (product: any): number => {
    const discount = Number(product?.discount ?? 0);
    if (discount > 0) return Math.round(discount);

    const mrp = Number(product?.mrp ?? 0);
    const price = Number(product?.price ?? 0);

    return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  };

  const handleProductPress = (product: any) => {
    router.push({
      pathname: "/product/[productId]",
      params: { productId: product._id || product.id },
    });
  };

  // ───────── Product Card Renderer (BEST PRACTICE) ─────────
  const renderProduct = (product: any) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];

    const defaultVariant =
      variants.find((v: any) => v?.isDefault) || variants[0];

    const activePrice = Number(defaultVariant?.price ?? product.price ?? 0);
    const activeMrp = Number(defaultVariant?.mrp ?? product.mrp ?? 0);
    const activeStock = Number(defaultVariant?.stock ?? product.stock ?? 0);

    const shouldShowMrp =
      typeof activeMrp === "number" && activeMrp > activePrice;

    const isOutOfStock = activeStock <= 0;

    const discountPercent = defaultVariant
      ? getDiscountPercent(defaultVariant)
      : getDiscountPercent(product);

    return (
      <TouchableOpacity
        key={product._id || product.id}
        style={styles.productCard}
        onPress={() => handleProductPress(product)}
      >
        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>
              {discountPercent}% OFF
            </ThemedText>
          </View>
        )}

        <View style={styles.productImageContainer}>
          <ProductImage images={product.images} name={product.name} />
        </View>

        <View style={styles.productInfo}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {product.name}
          </ThemedText>

          <View style={styles.productFooter}>
            <View>
              <ThemedText style={styles.productPrice}>
                ₹{activePrice}
              </ThemedText>

              {shouldShowMrp && (
                <ThemedText style={styles.originalPrice}>
                  ₹{activeMrp}
                </ThemedText>
              )}

              {isOutOfStock && (
                <ThemedText style={styles.outOfStockText}>
                  Out of stock
                </ThemedText>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                isOutOfStock && styles.addButtonDisabled,
              ]}
              disabled={isOutOfStock}
              onPress={() =>
                addItem(
                  {
                    id: product._id || product.id,
                    productId: product._id || product.id,
                    name: product.name,
                    price: activePrice,
                    unit: "",
                    image: resolveImageUrl(product.images?.[0]),
                    stock: activeStock,
                  },
                  1,
                )
              }
            >
              <ThemedText style={styles.addButtonText}>
                {isOutOfStock ? "×" : "+"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ───────── UI ─────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View
        style={[styles.filtersBar, { paddingHorizontal: horizontalPadding }]}
      >
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search product"
          style={styles.searchInput}
        />
      </View>

      {subCategories.length > 0 && (
        <View style={styles.subCategoryStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.subCategoryStripContent,
              { paddingHorizontal: Math.max(8, horizontalPadding - 4) },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.subCategoryChip,
                selectedSubCategoryId === "all" && styles.subCategoryChipActive,
              ]}
              onPress={() => setSelectedSubCategoryId("all")}
            >
              <Text
                style={[
                  styles.subCategoryChipText,
                  selectedSubCategoryId === "all" &&
                    styles.subCategoryChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {subCategories.map((subCategory: any) => {
              const subId = getId(subCategory);
              const isActive = selectedSubCategoryId === subId;

              return (
                <TouchableOpacity
                  key={subId}
                  style={[
                    styles.subCategoryChip,
                    isActive && styles.subCategoryChipActive,
                  ]}
                  onPress={() => setSelectedSubCategoryId(subId)}
                >
                  <Text
                    style={[
                      styles.subCategoryChipText,
                      isActive && styles.subCategoryChipTextActive,
                    ]}
                  >
                    {subCategory.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View
        style={[
          styles.countContainer,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        <Text
          style={[styles.countText, { fontSize: getResponsiveFont(width, 13) }]}
        >
          {visibleProducts.length} products
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.productsGrid,
            { paddingHorizontal: Math.max(6, horizontalPadding - 4) },
          ]}
        >
          {visibleProducts.map((product) => (
            <View
              key={product._id || product.id}
              style={{ width: cardWidth, marginBottom: cardGap }}
            >
              {renderProduct(product)}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ styles unchanged (keep your existing StyleSheet)
const styles = createResponsiveStyles({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: "#0E7A3D",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 28, color: "#FFFFFF", fontWeight: "600" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    marginLeft: 12,
  },
  cartButton: { position: "relative" },
  cartIcon: { fontSize: 24 },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6A00",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  filtersBar: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  subCategoryStripWrap: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  subCategoryStripContent: { paddingHorizontal: 12, gap: 8 },
  subCategoryChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  subCategoryChipActive: { backgroundColor: "#0E7A3D" },
  subCategoryChipText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  subCategoryChipTextActive: { color: "#FFFFFF" },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  countText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  productCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 1,
  },
  discountText: { fontSize: 9, fontWeight: "700", color: "#FFFFFF" },
  productImageContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  productImg: { width: "100%", height: "100%", borderRadius: 8 },
  productImgPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  productImgPlaceholderText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  productInfo: { gap: 4 },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    minHeight: 36,
  },
  productUnit: { fontSize: 11, color: "#9CA3AF" },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingStar: { fontSize: 12, marginRight: 4 },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  variantStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  variantChipMini: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  variantChipMiniText: { fontSize: 10, color: "#4B5563", fontWeight: "600" },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  productPrice: { fontSize: 16, fontWeight: "700", color: "#0E7A3D" },
  originalPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  outOfStockText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#0E7A3D",
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: { backgroundColor: "#9CA3AF" },
  addButtonText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
});
