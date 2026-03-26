import { ThemedText } from "@/components/themed-text";
import {
  getResponsiveFont,
  getScreenPadding,
  createResponsiveStyles,
  responsiveVerticalScale,
} from "@/utils/responsive";
import useCart from "@/stores/cartStore";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  AddonDeliveryWindow,
  getAddonDeliveryRemainingMs,
  getAddonDeliveryWindow,
} from "@/services/addonWindowService";

// Cart items are managed by the global Zustand store (stores/cartStore.ts)

export default function CartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const screenPadding = getScreenPadding(width);
  const headerTitleSize = getResponsiveFont(width, 20);
  const cartItems = useCart((s) => s.items);
  const increaseQuantity = useCart((s) => s.increase);
  const decreaseQuantity = useCart((s) => s.decrease);
  const removeFromCart = useCart((s) => s.remove);
  const hydrateLocal = useCart((s) => s.hydrateLocal);
  const syncFromServer = useCart((s) => s.syncFromServer);
  const initialized = useCart((s) => s.initialized);
  const [addonWindow, setAddonWindow] = React.useState<AddonDeliveryWindow | null>(
    null,
  );
  const [addonRemainingMs, setAddonRemainingMs] = React.useState(0);

  useEffect(() => {
    (async () => {
      if (!initialized) await hydrateLocal();
      await syncFromServer();
    })();
  }, [initialized, hydrateLocal, syncFromServer]);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const refreshAddonWindow = async () => {
      const [active, remaining] = await Promise.all([
        getAddonDeliveryWindow(),
        getAddonDeliveryRemainingMs(),
      ]);
      if (!mounted) return;
      setAddonWindow(active);
      setAddonRemainingMs(remaining);
    };

    void refreshAddonWindow();
    timer = setInterval(() => {
      void refreshAddonWindow();
    }, 1000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  // Calculate totals (give explicit types to reduce callback to satisfy strict TS)
  const itemCount = cartItems.length;
  const billTotal = cartItems.reduce(
    (sum: number, item) => sum + item.quantity * item.price,
    0,
  );
  const hasAddonWindow = !!addonWindow && addonRemainingMs > 0;
  const deliveryFee = hasAddonWindow ? 0 : 10;
  const totalPayable = billTotal + deliveryFee;
  const addonSecondsLeft = Math.ceil(addonRemainingMs / 1000);

  // Remove item with confirmation
  const confirmRemove = (id: string) => {
    Alert.alert("Remove Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeFromCart(id);
        },
      },
    ]);
  };

  const goToCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart first.");
      return;
    }

    const invalidItems = cartItems.filter(
      (item) =>
        Number(item.stock ?? 0) <= 0 || item.quantity > Number(item.stock ?? 0),
    );
    if (invalidItems.length > 0) {
      Alert.alert(
        "Out of Stock",
        "Some items are out of stock. Please remove them before checkout.",
      );
      return;
    }

    router.push("/checkout");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: screenPadding }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { fontSize: headerTitleSize }]}>
          My Cart
        </ThemedText>
        <View style={styles.cartBadge}>
          <ThemedText style={styles.cartBadgeText}>{itemCount}</ThemedText>
        </View>
      </View>

      {cartItems.length === 0 ? (
        // Empty Cart
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyIcon}>🛒</ThemedText>
          <ThemedText style={styles.emptyTitle}>Your cart is empty</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Add items to get started
          </ThemedText>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/home")}
          >
            <ThemedText style={styles.shopButtonText}>
              Start Shopping
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
          >
            {/* Cart Items */}
            <View style={[styles.itemsSection, { marginTop: 12 }]}>
              {cartItems.map((item) =>
                (() => {
                  const availableStock = Number(item.stock ?? 0);
                  const isOutOfStock = availableStock <= 0;
                  const canIncrease =
                    !isOutOfStock && item.quantity < availableStock;

                  return (
                    <View
                      key={item.cartItemId || item.id}
                      style={[
                        styles.cartItem,
                        { paddingHorizontal: screenPadding },
                      ]}
                    >
                      <View style={styles.itemImageContainer}>
                        {(() => {
                          const imageValue = String(item.image || "").trim();
                          const isImageUrl =
                            /^(https?:\/\/|file:\/\/|data:image\/)/i.test(
                              imageValue,
                            );

                          if (isImageUrl) {
                            return (
                              <Image
                                source={{ uri: imageValue }}
                                style={styles.itemImage}
                                resizeMode="cover"
                              />
                            );
                          }

                          const fallbackIcon =
                            imageValue && imageValue.length <= 3
                              ? imageValue
                              : "🛍️";
                          return (
                            <ThemedText style={styles.itemImageFallback}>
                              {fallbackIcon}
                            </ThemedText>
                          );
                        })()}
                      </View>

                      <View style={styles.itemDetails}>
                        <ThemedText style={styles.itemName}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={styles.itemUnit}>
                          {item.variantLabel || item.unit}
                        </ThemedText>
                        <ThemedText style={styles.itemPrice}>
                          ₹{item.price}
                        </ThemedText>
                        {isOutOfStock && (
                          <ThemedText style={styles.stockText}>
                            Out of stock
                          </ThemedText>
                        )}
                      </View>

                      <View style={styles.itemActions}>
                        {/* Quantity Controls */}
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => decreaseQuantity(item.id)}
                          >
                            <ThemedText style={styles.quantityButtonText}>
                              −
                            </ThemedText>
                          </TouchableOpacity>
                          <ThemedText style={styles.quantityText}>
                            {item.quantity}
                          </ThemedText>
                          <TouchableOpacity
                            style={[
                              styles.quantityButton,
                              !canIncrease && styles.quantityButtonDisabled,
                            ]}
                            onPress={() => increaseQuantity(item.id)}
                            disabled={!canIncrease}
                          >
                            <ThemedText style={styles.quantityButtonText}>
                              +
                            </ThemedText>
                          </TouchableOpacity>
                        </View>

                        {/* Remove Button */}
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => confirmRemove(item.id)}
                        >
                          <ThemedText style={styles.removeButtonText}>
                            🗑️
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })(),
              )}
            </View>

            {/* Bill Summary */}
            <View
              style={[
                styles.summarySection,
                { paddingHorizontal: screenPadding },
              ]}
            >
              <ThemedText style={styles.summaryTitle}>Bill Details</ThemedText>

              {hasAddonWindow && (
                <View style={styles.addonBanner}>
                  <ThemedText style={styles.addonBannerTitle}>
                    Same Delivery Charge Active
                  </ThemedText>
                  <ThemedText style={styles.addonBannerText}>
                    {`Agle ${addonSecondsLeft}s tak extra order par delivery fee 0 rahegi.`}
                  </ThemedText>
                </View>
              )}

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Items Total</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  ₹{billTotal}
                </ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>
                  Delivery Fee
                </ThemedText>
                <ThemedText style={styles.deliveryFee}>
                  {hasAddonWindow ? "₹0 (same delivery window)" : `₹${deliveryFee}`}
                </ThemedText>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <ThemedText style={styles.totalLabel}>To Pay</ThemedText>
                <ThemedText style={styles.totalValue}>
                  ₹{totalPayable}
                </ThemedText>
              </View>
            </View>

            <View
              style={{
                height: Math.max(
                  isCompact
                    ? responsiveVerticalScale(132)
                    : responsiveVerticalScale(116),
                  insets.bottom + responsiveVerticalScale(96),
                ),
              }}
            />
          </ScrollView>

          {/* Fixed Bottom Checkout Button */}
          <View
            style={[
              styles.bottomContainer,
              {
                paddingBottom: Math.max(
                  responsiveVerticalScale(10),
                  insets.bottom + responsiveVerticalScale(6),
                ),
              },
            ]}
          >
            <View
              style={[
                styles.bottomContent,
                isCompact && styles.bottomContentCompact,
              ]}
            >
              <View>
                <ThemedText style={styles.bottomLabel}>
                  {itemCount} items
                </ThemedText>
                <ThemedText style={styles.bottomTotal}>
                  ₹{totalPayable}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[
                  styles.checkoutButton,
                  isCompact && styles.checkoutButtonCompact,
                ]}
                onPress={goToCheckout}
              >
                <ThemedText style={styles.checkoutButtonText}>
                  Proceed to Checkout
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = createResponsiveStyles({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#10B981",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    borderBottomWidth: 1,
    borderBottomColor: "#D1FAE5",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  backIcon: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  cartBadge: {
    backgroundColor: "#FFFFFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cartBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#FAFAF9",
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 21,
  },
  shopButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  shopButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAF9",
  },
  itemsSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemImageContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexShrink: 0,
  },
  itemImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  itemImageFallback: {
    fontSize: 30,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  itemUnit: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: -0.1,
  },
  stockText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 2,
  },
  itemActions: {
    alignItems: "center",
    marginLeft: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10B981",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    paddingHorizontal: 12,
    minWidth: 40,
    textAlign: "center",
  },
  removeButton: {
    padding: 6,
  },
  removeButtonText: {
    fontSize: 18,
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  addonBanner: {
    backgroundColor: "#D1FAE5",
    borderWidth: 1.2,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: "#10B981",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  addonBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
    letterSpacing: -0.1,
  },
  addonBannerText: {
    marginTop: 3,
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  deliveryFee: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.4,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  bottomContent: {
    flexDirection: "row",
    marginBottom: 10,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  bottomContentCompact: {
    flexWrap: "wrap",
  },
  bottomLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 4,
    fontWeight: "500",
  },
  bottomTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  checkoutButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: "#10B981",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checkoutButtonCompact: {
    width: "100%",
    alignItems: "center",
  },
  checkoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
});
