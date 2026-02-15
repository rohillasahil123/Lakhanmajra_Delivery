import { Document, Types, Model } from 'mongoose';

export interface ICartItemVariant {
  size?: string;
  color?: string;
  flavor?: string;
}

export interface IOfferDetails {
  offerId: Types.ObjectId;
  offerName: string;
  discountAmount: number;
}

export interface ICartItem {
  _id?: Types.ObjectId;
  product: Types.ObjectId;
  name: string;
  image: string;
  price: number;
  mrp: number;
  discount: number;
  quantity: number;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'piece' | 'pack';
  weight: string;
  stock: number;
  maxQuantity: number;
  itemTotal: number;
  savings: number;
  category: string;
  subCategory?: string;
  variant?: ICartItemVariant;
  deliveryTime: string;
  offerApplied: boolean;
  offerDetails?: IOfferDetails;
}

export interface IPricing {
  subtotal: number;
  totalMRP: number;
  totalDiscount: number;
  deliveryFee: number;
  handlingFee: number;
  platformFee: number;
  gst: number;
  total: number;
  totalSavings: number;
}

export interface IAppliedCoupon {
  code: string;
  discountAmount: number;
  couponId: Types.ObjectId;
}

export interface IDeliverySlot {
  date: Date;
  timeSlot: string;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: ICartItem[];
  pricing: IPricing;
  deliveryAddress?: Types.ObjectId;
  deliverySlot?: IDeliverySlot;
  appliedCoupon?: IAppliedCoupon;
  itemCount: number;
  status: 'active' | 'merged' | 'abandoned' | 'converted';
  lastActivity: Date;
  sessionId?: string;
  deviceId?: string;
  isGuest: boolean;
  guestEmail?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isFreeDelivery: boolean;
  savings: number;

  // Methods
  calculatePricing(): IPricing;
  addItem(productData: any, quantity: number): Promise<ICart>;
  updateItemQuantity(itemId: string, quantity: number): ICart;
  removeItem(itemId: string): ICart;
  clearCart(): ICart;
  applyCoupon(couponData: any): ICart;
  removeCoupon(): ICart;
}

export interface ICartModel extends Model<ICart> {
  getOrCreateCart(userId: Types.ObjectId, sessionId?: string): Promise<ICart>;
  mergeGuestCart(guestSessionId: string, userId: Types.ObjectId): Promise<ICart | null>;
}

// Request interfaces
export interface AddToCartRequest {
  productId: string;
  quantity?: number;
  variant?: ICartItemVariant;
}

export interface UpdateQuantityRequest {
  quantity: number;
}

export interface ApplyCouponRequest {
  couponCode: string;
}

export interface MergeCartRequest {
  guestSessionId: string;
}

// Response interfaces
export interface CartResponse {
  success: boolean;
  message?: string;
  data: ICart;
  sessionId?: string;
}

export interface CartSummaryResponse {
  success: boolean;
  data: {
    itemCount: number;
    subtotal: number;
    total: number;
    savings: number;
    isFreeDelivery: boolean;
  };
}

export interface ValidationError {
  item: string;
  message: string;
}

export interface CartValidationResponse {
  success: boolean;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  data: ICart | null;
}
