import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Order from "../models/order.model";

let io: Server | null = null;

type JwtPayload = {
  id?: string;
  _id?: string;
  role?: string;
  roleName?: string;
};

type RiderFlowStatus = "Assigned" | "Accepted" | "Picked" | "OutForDelivery" | "Delivered" | "Rejected";

const getAllowedOrigins = (): string[] => {
  const configured =
    process.env.FRONTEND_URLS ||
    "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175";

  return configured
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

const normalizeRole = (payload: JwtPayload): string => {
  return String(payload.roleName || payload.role || "").toLowerCase();
};

const mapBackendToRiderStatus = (order: any): RiderFlowStatus => {
  if (order?.riderStatus) return order.riderStatus as RiderFlowStatus;
  const status = String(order?.status || "processing");
  if (status === "pending" || status === "processing") return "Assigned";
  if (status === "confirmed") return "Accepted";
  if (status === "shipped") return "OutForDelivery";
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Rejected";
  return "Assigned";
};

const mapToRiderOrder = (orderDoc: any) => {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  const user = order?.userId && typeof order.userId === "object" ? order.userId : null;

  const items = Array.isArray(order?.items)
    ? order.items.map((item: any) => {
        const product = item?.productId && typeof item.productId === "object" ? item.productId : null;
        const quantity = Number(item?.quantity || 0);
        const price = Number(item?.price || 0);
        const image = Array.isArray(product?.images) && product.images.length > 0 ? String(product.images[0]) : "";

        return {
          productId: String(product?._id || item?.productId || ""),
          name: product?.name ? String(product.name) : "Product",
          quantity,
          price,
          total: quantity * price,
          image,
        };
      })
    : [];

  const firstItem = Array.isArray(order?.items) ? order.items[0] : null;
  const firstProduct = firstItem?.productId && typeof firstItem.productId === "object" ? firstItem.productId : null;
  const previewImage =
    Array.isArray(firstProduct?.images) && firstProduct.images.length > 0 ? String(firstProduct.images[0]) : "";

  return {
    id: String(order?._id || ""),
    riderId: String(order?.assignedRiderId || ""),
    status: mapBackendToRiderStatus(order),
    paymentType: order?.paymentMethod === "online" ? "PREPAID" : "COD",
    amount: Number(order?.totalAmount || 0),
    items,
    productPreview:
      firstProduct && (firstProduct?.name || previewImage)
        ? {
            name: firstProduct?.name ? String(firstProduct.name) : "Product",
            image: previewImage,
          }
        : null,
    customer: {
      name: user?.name || "Customer",
      phone: user?.phone || "",
    },
    deliveryAddress: {
      line1: order?.shippingAddress?.street || "",
      city: order?.shippingAddress?.city || "",
      state: order?.shippingAddress?.state || "",
      postalCode: order?.shippingAddress?.pincode || "",
      latitude:
        typeof order?.shippingAddress?.latitude === "number" ? Number(order.shippingAddress.latitude) : undefined,
      longitude:
        typeof order?.shippingAddress?.longitude === "number" ? Number(order.shippingAddress.longitude) : undefined,
    },
    assignedAt: new Date(order?.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(order?.updatedAt || Date.now()).toISOString(),
  };
};

export const initRealtime = (server: HttpServer): Server => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error("JWT_SECRET is required"));
    }

    const bearerHeader = socket.handshake.headers.authorization;
    const bearerToken =
      typeof bearerHeader === "string" && bearerHeader.startsWith("Bearer ")
        ? bearerHeader.slice(7)
        : undefined;
    const authToken =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined) ||
      bearerToken;

    if (!authToken) {
      return next(new Error("Token missing"));
    }

    try {
      const decoded = jwt.verify(authToken, secret) as JwtPayload;
      (socket.data as any).userId = decoded.id || decoded._id;
      (socket.data as any).role = normalizeRole(decoded);
      return next();
    } catch (_error) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String((socket.data as any).userId || "");
    const role = String((socket.data as any).role || "");

    if (role === "admin" || role === "superadmin") {
      socket.join("admin:orders");
    }

    if (role === "rider" && userId) {
      socket.join("riders:online");
      socket.join(`rider:${userId}`);
    }

    if (role === "user" && userId) {
      socket.join(`user:${userId}`);
    }

    socket.emit("socket:ready", { socketId: socket.id, role, userId });
  });

  return io;
};

export const getRealtime = (): Server | null => io;

export const emitOrderRealtime = async (
  orderId: string,
  options?: { event?: "created" | "assigned" | "updated" | "status" | "cancelled" }
): Promise<void> => {
  const socket = getRealtime();
  if (!socket || !orderId) return;

  const fullOrder = await Order.findById(orderId)
    .populate("userId", "name email phone")
    .populate("assignedRiderId", "name email phone")
    .populate("items.productId", "name images price");

  if (!fullOrder) return;

  const eventType = options?.event || "updated";
  const plainOrder = fullOrder.toObject();
  socket.to("admin:orders").emit("admin:orderUpdated", {
    event: eventType,
    order: plainOrder,
    socketEventId: `${Date.now()}_${orderId}`,
  });

  const riderPayload = mapToRiderOrder(fullOrder);
  const assignedRiderId = riderPayload?.riderId;
  const customerId = plainOrder?.userId?._id
    ? String(plainOrder.userId._id)
    : plainOrder?.userId
    ? String(plainOrder.userId)
    : "";

  if (customerId) {
    socket.to(`user:${customerId}`).emit("user:orderUpdated", {
      event: eventType,
      order: plainOrder,
      socketEventId: `${Date.now()}_${orderId}`,
    });
  }

  if (assignedRiderId) {
    const riderEvent = eventType === "assigned" ? "rider:orderAssigned" : "rider:orderUpdated";
    socket.to(`rider:${assignedRiderId}`).emit(riderEvent, {
      event: eventType,
      order: riderPayload,
      socketEventId: `${Date.now()}_${orderId}`,
    });
    return;
  }

  if (riderPayload.status === "Assigned") {
    socket.to("riders:online").emit("rider:orderAssigned", {
      event: eventType,
      order: riderPayload,
      socketEventId: `${Date.now()}_${orderId}`,
    });
  }
};
