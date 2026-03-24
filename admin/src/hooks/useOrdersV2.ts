import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { sanitizeFormInput } from '../utils/sanitize';
import { sanitizeError } from '../utils/errorHandler';

export type OrderItem = {
  productId?: { _id?: string; name?: string; images?: string[] };
  variantId?: { label?: string };
  quantity?: number;
  price?: number;
  mrp?: number;
};

export type ShippingAddress = {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

export type RiderLocation = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: string;
};

export type Order = {
  _id: string;
  orderNumber?: string;
  totalAmount: number;
  deliveryFee?: number;
  paymentMethod?: 'cod' | 'online';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  status: string;
  userId?: { _id?: string; name?: string; email?: string; phone?: string };
  assignedRiderId?: { _id?: string; name?: string; phone?: string };
  shippingAddress?: ShippingAddress;
  riderLocation?: RiderLocation;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/**
 * Custom hook for order management
 * Handles socket connection for real-time updates
 */
export const useOrders = () => {
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection for real-time updates
  useEffect(() => {
    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    // Implements in actual page components
    // This is a placeholder for consistency with other hooks
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<Order> => {
      try {
        const sanitizedStatus = sanitizeFormInput(String(status), 50);
        // Emit via socket or API
        socketRef.current?.emit('update:order:status', { orderId, status: sanitizedStatus });
        return {} as Order;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    []
  );

  const assignRider = useCallback(
    async (orderId: string, riderId: string): Promise<Order> => {
      try {
        const sanitizedOrderId = sanitizeFormInput(String(orderId), 50);
        const sanitizedRiderId = sanitizeFormInput(String(riderId), 50);
        // Emit via socket
        socketRef.current?.emit('assign:rider', { orderId: sanitizedOrderId, riderId: sanitizedRiderId });
        return {} as Order;
      } catch (err) {
        const sanitized = sanitizeError(err);
        throw new Error(sanitized.userMessage);
      }
    },
    []
  );

  const onOrderUpdate = useCallback((callback: (order: Order) => void) => {
    if (socketRef.current) {
      socketRef.current.on('order:updated', callback);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('order:updated', callback);
      }
    };
  }, []);

  return {
    fetchOrders,
    updateOrderStatus,
    assignRider,
    onOrderUpdate,
    socket: socketRef.current,
  };
};