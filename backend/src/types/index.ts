import { Document } from 'mongoose';

// User Interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Product Interface
export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cart Interfaces
export interface ICartItem {
  productId: IProduct['_id'];
  quantity: number;
}

export interface ICart extends Document {
  userId: IUser['_id'];
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Order Interfaces
export interface IOrderItem {
  productId: IProduct['_id'];
  quantity: number;
  price: number;
}

export interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IOrder extends Document {
  userId: IUser['_id'];
  items: IOrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  assignedRiderId?: IUser['_id'] | null;
  etaMinutes?: number | null;
  shippingAddress: IShippingAddress;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// RabbitMQ Message Interfaces
export interface OrderQueueMessage {
  orderId: string;
}

export interface EmailQueueMessage {
  orderId: string;
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered';
}

// Express Request Extension
declare global {
  namespace Express {
    interface Request {
      // Keep compatible with `express.d.ts`'s `AuthenticatedUser`
      user?: {
        _id?: string;
        id?: string;
        email?: string;
        role?: string;
      } | null;
      isAuthenticated?: boolean;
      sessionId?: string;
    }
  }
}

export {};