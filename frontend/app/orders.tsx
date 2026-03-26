import { ThemedText } from "@/components/themed-text";
import { resolveImageUrl, API_BASE_URL } from "@/config/api";
import {
  getResponsiveFont,
  getScreenPadding,
  isSmallScreen,
  createResponsiveStyles,
} from "@/utils/responsive";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import { tokenManager } from "@/utils/tokenManager";
import {
  cancelMyOrderApi,
  getMyOrdersApi,
  OrderRow,
} from "@/services/orderService";
import {
  AddonDeliveryWindow,
  getAddonDeliveryRemainingMs,
  getAddonDeliveryWindow,
} from "@/services/addonWindowService";

const getStatusTone = (status: string) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "delivered") return { bg: "#DCFCE7", text: "#166534" };
  if (normalized === "cancelled") return { bg: "#FEE2E2", text: "#991B1B" };
  if (
    normalized === "shipped" ||
    normalized === "confirmed" ||
    normalized === "processing"
  ) {
    return { bg: "#DBEAFE", text: "#1E40AF" };
  }
  return { bg: "#FEF3C7", text: "#92400E" };
};

const ORDER_TRACK_STAGES = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
] as const;

const getStageIndex = (status: string): number => {
  const normalized = String(status || "").toLowerCase();
  const index = ORDER_TRACK_STAGES.indexOf(
    normalized as (typeof ORDER_TRACK_STAGES)[number],
  );
  return Math.max(index, 0);
};

const prettyStatus = (value: string): string => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "pending") return "Order Placed";
  if (normalized === "processing") return "Processing";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "shipped") return "Out For Delivery";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "cancelled") return "Cancelled";
  return value || "Pending";
};

const mergeIncomingOrder = (
  prev: OrderRow[],
  incoming: OrderRow,
): OrderRow[] => {
  const index = prev.findIndex((row) => row._id === incoming._id);
  if (index === -1) {
    return [incoming, ...prev];
  }

  const next = [...prev];
  next[index] = { ...next[index], ...incoming };
  return next;
};

export default function OrdersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = isSmallScreen(width);
  const screenPadding = getScreenPadding(width);
  const params = useLocalSearchParams<{ filter?: string }>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [addonWindow, setAddonWindow] = useState<AddonDeliveryWindow | null>(
    null,
  );
  const [addonRemainingMs, setAddonRemainingMs] = useState(0);
  const statusByOrderRef = useRef<Record<string, string>>({});
  const filter = String(params.filter || "all").toLowerCase();

  const normalizeStatus = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const canCancelOrder = (status: string) => {
    const normalized = normalizeStatus(status);
    return (
      normalized === "pending" ||
      normalized === "processing" ||
      normalized === "confirmed"
    );
  };

  const isActiveDeliveryOrder = (status: string) => {
    const normalized = normalizeStatus(status);
    return (
      normalized === "processing" ||
      normalized === "confirmed" ||
      normalized === "shipped"
    );
  };

  const hasAssignedRider = (order: OrderRow) => {
    const rider = order.assignedRiderId as any;
    return !!(
      rider &&
      typeof rider === "object" &&
      (rider.name || rider.phone)
    );
  };

  // ──── Extracted cancel handler ────
  const executeCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrderId(orderId);
      const updated = await cancelMyOrderApi(orderId);
      setOrders((prev) =>
        prev.map((row) =>
          row._id === orderId
            ? { ...row, ...updated, status: "cancelled" }
            : row,
        ),
      );
      Alert.alert(
        "Order Cancelled",
        "Order cancelled successfully and stock restored.",
      );
    } catch (error: any) {
      Alert.alert(
        "Cancel Failed",
        error?.message || "Unable to cancel this order.",
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => {
          void executeCancelOrder(orderId);
        },
      },
    ]);
  };

  const handleOrderUpdated = useCallback((payload: { order?: OrderRow }) => {
    const incoming = payload?.order;
    if (!incoming?._id) return;

    const incomingStatus = normalizeStatus(incoming.status || "");
    const previousStatus = normalizeStatus(
      statusByOrderRef.current[incoming._id] || "",
    );
    statusByOrderRef.current[incoming._id] = incomingStatus;

    if (previousStatus !== incomingStatus && incomingStatus === "delivered") {
      Alert.alert("Order Delivered", "Aapka order deliver ho gaya hai.");
    }

    setOrders((prev) => mergeIncomingOrder(prev, incoming));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getMyOrdersApi();
        setOrders(rows || []);
        statusByOrderRef.current = (rows || []).reduce<Record<string, string>>(
          (accumulator, row) => {
            if (row?._id) {
              accumulator[row._id] = String(row.status || "").toLowerCase();
            }
            return accumulator;
          },
          {},
        );
      } catch {
        setOrders([]);
        statusByOrderRef.current = {};
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    let socket: ReturnType<typeof io> | null = null;

    (async () => {
      const token = await tokenManager.getToken();
      if (!token || !mounted) return;

      const socketBase = API_BASE_URL.replace(/\/api\/?$/, "");
      socket = io(socketBase, {
        transports: ["websocket"],
        auth: { token },
      });

      socket.on("user:orderUpdated", handleOrderUpdated);

      socket.on("user:orderArriving", () => {
        Alert.alert(
          "Rider Arriving",
          "Aapka order ab delivery ke liye aa raha hai.",
        );
      });
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.off("user:orderUpdated", handleOrderUpdated);
        socket.off("user:orderArriving");
        socket.disconnect();
      }
    };
  }, [handleOrderUpdated]);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>My Orders</ThemedText>
        <ThemedText style={styles.subtitle}>
          You have no orders yet. Start shopping!
        </ThemedText>
      </View>
    );
  }

  const visibleOrders =
    filter === "delivered"
      ? orders.filter((order) => normalizeStatus(order.status) === "delivered")
      : orders.filter((order) => normalizeStatus(order.status) !== "cancelled");

  const pageTitle = filter === "delivered" ? "Delivered Products" : "My Orders";
  const totalProducts = visibleOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || []).reduce(
        (inner, item) => inner + Number(item.quantity || 0),
        0,
      ),
    0,
  );
  const totalSpend = visibleOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0,
  );
  const hasAddonWindow = !!addonWindow && addonRemainingMs > 0;
  const addonSecondsLeft = Math.ceil(addonRemainingMs / 1000);

  if (visibleOrders.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{pageTitle}</ThemedText>
        <ThemedText style={styles.subtitle}>
          No products found for this section.
        </ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: screenPadding,
            paddingTop: compact ? 4 : 8,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ThemedText style={styles.backIcon}>‹</ThemedText>
          </TouchableOpacity>
          <ThemedText
            style={[
              styles.pageHeaderTitle,
              { fontSize: getResponsiveFont(width, 18) },
            ]}
          >
            {pageTitle}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <ThemedText
            style={[styles.title, { fontSize: getResponsiveFont(width, 22) }]}
          >
            Order Summary
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Track your order history and purchased products
          </ThemedText>

          {hasAddonWindow && (
            <TouchableOpacity
              style={styles.addonAddBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/cart")}
            >
              <View style={styles.addonAddBtnLeft}>
                <ThemedText style={styles.addonAddBtnTitle}>
                  + Add More Items
                </ThemedText>
                <ThemedText style={styles.addonAddBtnSub}>
                  {`Same delivery charge — ${addonSecondsLeft}s baaki`}
                </ThemedText>
              </View>
              <ThemedText style={styles.addonAddBtnArrow}>→</ThemedText>
            </TouchableOpacity>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <ThemedText style={styles.summaryLabel}>Orders</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {visibleOrders.length}
              </ThemedText>
            </View>
            <View style={styles.summaryChip}>
              <ThemedText style={styles.summaryLabel}>Products</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {totalProducts}
              </ThemedText>
            </View>
            <View style={styles.summaryChip}>
              <ThemedText style={styles.summaryLabel}>Spent</ThemedText>
              <ThemedText style={styles.summaryValue}>
                ₹{Math.round(totalSpend)}
              </ThemedText>
            </View>
          </View>
        </View>

        {visibleOrders.map((order) => {
          // NOSONAR
          const tone = getStatusTone(order.status);
          const normalizedStatus = normalizeStatus(order.status);
          const isCompactHistoryOrder =
            normalizedStatus === "delivered" ||
            normalizedStatus === "cancelled";
          const rider = (order.assignedRiderId || null) as {
            name?: string;
            phone?: string;
          } | null;

          if (isCompactHistoryOrder) {
            const totalItems = (order.items || []).reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0,
            );

            return (
              <View key={order._id} style={styles.compactCard}>
                <View style={styles.compactTopRow}>
                  <ThemedText style={styles.compactOrderId}>
                    #{order._id.slice(-8).toUpperCase()}
                  </ThemedText>
                  <View
                    style={[styles.statusBadge, { backgroundColor: tone.bg }]}
                  >
                    <ThemedText
                      style={[styles.statusText, { color: tone.text }]}
                    >
                      {String(order.status || "pending").toUpperCase()}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.compactMetaRow}>
                  <ThemedText style={styles.compactMetaText}>
                    Items: {totalItems}
                  </ThemedText>
                  <ThemedText style={styles.compactAmount}>
                    ₹{order.totalAmount}
                  </ThemedText>
                </View>

                <ThemedText style={styles.compactDate}>
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : ""}
                </ThemedText>
              </View>
            );
          }

          return (
            <View key={order._id} style={styles.card}>
              <View style={styles.orderTopRow}>
                <View>
                  <ThemedText style={styles.orderId}>
                    Order #{order._id.slice(-8).toUpperCase()}
                  </ThemedText>
                  <ThemedText style={styles.orderDate}>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString()
                      : ""}
                  </ThemedText>
                </View>

                <View
                  style={[styles.statusBadge, { backgroundColor: tone.bg }]}
                >
                  <ThemedText style={[styles.statusText, { color: tone.text }]}>
                    {String(order.status || "pending").toUpperCase()}
                  </ThemedText>
                </View>
              </View>

              {canCancelOrder(order.status) ? (
                <View style={styles.orderActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      cancellingOrderId === order._id &&
                        styles.cancelButtonDisabled,
                    ]}
                    onPress={() => handleCancelOrder(order._id)}
                    disabled={cancellingOrderId === order._id}
                  >
                    <ThemedText style={styles.cancelButtonText}>
                      {cancellingOrderId === order._id
                        ? "Cancelling..."
                        : "Cancel Order"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.amountRow}>
                <ThemedText style={styles.amountLabel}>Total Amount</ThemedText>
                <ThemedText style={styles.amountValue}>
                  ₹{order.totalAmount}
                </ThemedText>
              </View>

              {normalizeStatus(order.status) === "cancelled" ? null : (
                <View style={styles.trackingBlock}>
                  <ThemedText style={styles.trackingTitle}>
                    Tracking Progress
                  </ThemedText>
                  <View style={styles.trackingRow}>
                    {ORDER_TRACK_STAGES.map((stage, index) => {
                      const active = index <= getStageIndex(order.status);
                      return (
                        <View
                          key={`${order._id}-${stage}`}
                          style={styles.trackingStepWrap}
                        >
                          <View
                            style={[
                              styles.trackingDot,
                              active && styles.trackingDotActive,
                            ]}
                          />
                          <ThemedText
                            style={[
                              styles.trackingLabel,
                              active && styles.trackingLabelActive,
                            ]}
                          >
                            {prettyStatus(stage)}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.paymentMetaRow}>
                <ThemedText style={styles.paymentMetaText}>
                  Payment: {String(order.paymentMethod || "cod").toUpperCase()}
                </ThemedText>
                <ThemedText style={styles.paymentMetaText}>
                  Delivery: ₹{Number(order.deliveryFee ?? 0)}
                </ThemedText>
              </View>

              {isActiveDeliveryOrder(order.status) ||
              hasAssignedRider(order) ? (
                <View style={styles.riderCard}>
                  <ThemedText style={styles.riderTitle}>
                    Rider Information
                  </ThemedText>
                  {hasAssignedRider(order) ? (
                    <>
                      <ThemedText style={styles.riderMeta}>
                        Name: {rider?.name || "Not available"}
                      </ThemedText>
                      <ThemedText style={styles.riderMeta}>
                        Phone: {rider?.phone || "Not available"}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText style={styles.riderMeta}>
                      Rider abhi assign nahi hua.
                    </ThemedText>
                  )}

                  {typeof order.riderLocation?.latitude === "number" &&
                  typeof order.riderLocation?.longitude === "number" ? (
                    <>
                      <ThemedText style={styles.riderMeta}>
                        Live Location:{" "}
                        {Number(order.riderLocation.latitude).toFixed(5)},{" "}
                        {Number(order.riderLocation.longitude).toFixed(5)}
                      </ThemedText>
                      <ThemedText style={styles.riderMeta}>
                        Updated:{" "}
                        {order.riderLocation.timestamp
                          ? new Date(
                              order.riderLocation.timestamp,
                            ).toLocaleTimeString()
                          : "just now"}
                      </ThemedText>
                    </>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.itemsBlock}>
                <ThemedText style={styles.itemsTitle}>Products</ThemedText>
                {(order.items || []).map((item, idx) => {
                  const productObj =
                    typeof item.productId === "object" && item.productId
                      ? item.productId
                      : null;
                  const productName = productObj?.name || "Product";

                  const rawImage =
                    (Array.isArray(productObj?.images) &&
                    productObj.images.length > 0
                      ? productObj.images[0]
                      : productObj?.image) || "";
                  const imageUrl = resolveImageUrl(rawImage);

                  const unitText =
                    productObj?.unitType || productObj?.unit || "piece";
                  const categoryText =
                    productObj?.category || productObj?.categoryName || "";
                  const linePrice = (item.price || 0) * (item.quantity || 0);

                  return (
                    <View key={`${order._id}-${idx}`} style={styles.productRow}>
                      <View style={styles.productImageWrap}>
                        {imageUrl ? (
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <ThemedText style={styles.productImageFallback}>
                            🛍️
                          </ThemedText>
                        )}
                      </View>

                      <View style={styles.productInfo}>
                        <ThemedText
                          style={styles.productName}
                          numberOfLines={2}
                        >
                          {productName}
                        </ThemedText>
                        <ThemedText style={styles.productMeta}>
                          {unitText}
                          {categoryText ? ` · ${categoryText}` : ""}
                        </ThemedText>
                        <ThemedText style={styles.productMeta}>
                          Qty: {item.quantity} · ₹{item.price} each
                        </ThemedText>
                        <ThemedText style={styles.productTotal}>
                          Line Total: ₹{linePrice}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createResponsiveStyles({
  safe: { flex: 1, backgroundColor: "#F4F6F8" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  list: { flex: 1, backgroundColor: "#F4F6F8" },
  listContent: { padding: 14, paddingTop: 6, paddingBottom: 26 },
  headerRow: {
    marginTop: 0,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backIcon: { 
    fontSize: 20, 
    color: "#374151", 
    fontWeight: "600",
    textAlign: "center",
  },
  pageHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  heroCard: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    padding: 14,
    marginTop: 0,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#D1FAE5", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 8 },
  addonAddBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addonAddBtnLeft: { flex: 1 },
  addonAddBtnTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#166534",
  },
  addonAddBtnSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
    opacity: 0.8,
  },
  addonAddBtnArrow: {
    fontSize: 20,
    color: "#16A34A",
    fontWeight: "bold",
    marginLeft: 8,
  },
  addonSummaryBanner: {
    backgroundColor: "rgba(236,253,243,0.14)",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  addonSummaryTitle: {
    fontSize: 12,
    color: "#D1FAE5",
    fontWeight: "800",
  },
  addonSummaryText: {
    fontSize: 12,
    color: "#ECFDF5",
    marginTop: 2,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  summaryLabel: { fontSize: 11, color: "#D1FAE5", marginBottom: 2 },
  summaryValue: { fontSize: 14, color: "#FFFFFF", fontWeight: "800" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E6EBF1",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  compactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E6EBF1",
  },
  compactTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  compactOrderId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  compactMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  compactMetaText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  compactAmount: {
    fontSize: 15,
    color: "#10B981",
    fontWeight: "800",
  },
  compactDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackingBlock: {
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
  },
  trackingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  trackingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  trackingStepWrap: {
    flex: 1,
    alignItems: "center",
  },
  trackingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
    marginBottom: 4,
  },
  trackingDotActive: {
    backgroundColor: "#10B981",
  },
  trackingLabel: {
    fontSize: 10,
    textAlign: "center",
    color: "#64748B",
  },
  trackingLabelActive: {
    color: "#0F172A",
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: "800" },
  orderActionRow: {
    marginTop: 10,
    alignItems: "flex-start",
  },
  cancelButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
  },
  amountRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountLabel: { fontSize: 12, color: "#6B7280" },
  amountValue: { fontSize: 18, color: "#10B981", fontWeight: "800" },
  paymentMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentMetaText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  riderCard: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 10,
    padding: 10,
  },
  riderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  riderMeta: {
    fontSize: 12,
    color: "#1E40AF",
    marginBottom: 2,
  },
  itemsBlock: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F7",
    paddingTop: 10,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EEF5",
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
  },
  productImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImageFallback: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  productMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  productTotal: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "700",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 3,
  },
  orderText: { fontSize: 13, color: "#374151", marginBottom: 4 },
  orderDate: { fontSize: 12, color: "#6B7280" },
});
