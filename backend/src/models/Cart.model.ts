import mongoose, { Schema, Model } from 'mongoose';
import { ICart, ICartItem, IPricing, ICartItemVariant, ICartModel } from '../types/cart.types';

const cartItemVariantSchema = new Schema<ICartItemVariant>(
  {
    size: { type: String },
    color: { type: String },
    flavor: { type: String },
  },
  { _id: false }
);

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: [0, 'MRP cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: ['kg', 'g', 'l', 'ml', 'piece', 'pack'],
        message: '{VALUE} is not a valid unit',
      },
    },
    weight: {
      type: String,
      required: [true, 'Weight is required'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
    },
    maxQuantity: {
      type: Number,
      default: 10,
      min: [1, 'Max quantity must be at least 1'],
    },
    itemTotal: {
      type: Number,
      required: [true, 'Item total is required'],
      min: [0, 'Item total cannot be negative'],
    },
    savings: {
      type: Number,
      default: 0,
      min: [0, 'Savings cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    subCategory: {
      type: String,
    },
    variant: {
      type: cartItemVariantSchema,
    },
    deliveryTime: {
      type: String,
      default: '10 mins',
    },
    offerApplied: {
      type: Boolean,
      default: false,
    },
    offerDetails: {
      offerId: { type: Schema.Types.ObjectId },
      offerName: { type: String },
      discountAmount: { type: Number },
    },
  },
  { _id: true }
);

const pricingSchema = new Schema<IPricing>(
  {
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative'],
    },
    totalMRP: {
      type: Number,
      default: 0,
      min: [0, 'Total MRP cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Total discount cannot be negative'],
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative'],
    },
    handlingFee: {
      type: Number,
      default: 0,
      min: [0, 'Handling fee cannot be negative'],
    },
    platformFee: {
      type: Number,
      default: 2,
      min: [0, 'Platform fee cannot be negative'],
    },
    gst: {
      type: Number,
      default: 0,
      min: [0, 'GST cannot be negative'],
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative'],
    },
    totalSavings: {
      type: Number,
      default: 0,
      min: [0, 'Total savings cannot be negative'],
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function (this: ICart): boolean {
        return !this.isGuest;
      },
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    pricing: {
      type: pricingSchema,
      default: () => ({}),
    },
    deliveryAddress: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
    },
    deliverySlot: {
      date: { type: Date },
      timeSlot: { type: String },
    },
    appliedCoupon: {
      code: { type: String },
      discountAmount: { type: Number },
      couponId: { type: Schema.Types.ObjectId },
    },
    itemCount: {
      type: Number,
      default: 0,
      min: [0, 'Item count cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'merged', 'abandoned', 'converted'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    sessionId: {
      type: String,
    },
    deviceId: {
      type: String,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ lastActivity: 1 });

// Virtuals
cartSchema.virtual('isFreeDelivery').get(function (this: ICart): boolean {
  return this.pricing.subtotal >= 200;
});

cartSchema.virtual('savings').get(function (this: ICart): number {
  return this.pricing.totalMRP - this.pricing.total;
});

// Methods
cartSchema.methods.calculatePricing = function (this: ICart): IPricing {
  let subtotal = 0;
  let totalMRP = 0;
  let totalDiscount = 0;
  let totalSavings = 0;

  // Calculate item totals
  this.items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    const itemMRP = item.mrp * item.quantity;
    const itemDiscount = itemMRP - itemTotal;

    subtotal += itemTotal;
    totalMRP += itemMRP;
    totalDiscount += itemDiscount;

    if (item.savings) {
      totalSavings += item.savings;
    }
  });

  // Calculate delivery fee (free above ₹200)
  const deliveryFee = subtotal >= 200 ? 0 : 25;

  // Calculate GST (5% on subtotal)
  const gst = Math.round(subtotal * 0.05 * 100) / 100;

  // Platform fee
  const platformFee = 2;

  // Handling fee
  const handlingFee = 0;

  // Apply coupon discount if exists
  let couponDiscount = 0;
  if (this.appliedCoupon) {
    couponDiscount = this.appliedCoupon.discountAmount || 0;
  }

  // Calculate total
  const total = subtotal + deliveryFee + platformFee + handlingFee + gst - couponDiscount;

  this.pricing = {
    subtotal: Math.round(subtotal * 100) / 100,
    totalMRP: Math.round(totalMRP * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    deliveryFee,
    handlingFee,
    platformFee,
    gst: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
    totalSavings: Math.round((totalSavings + couponDiscount) * 100) / 100,
  };

  this.itemCount = this.items.length;
  this.lastActivity = new Date();

  return this.pricing;
};

cartSchema.methods.addItem = async function (
  this: ICart,
  productData: any,
  quantity: number = 1
): Promise<ICart> {
  const existingItemIndex = this.items.findIndex(
    (item) =>
      item.product.toString() === productData._id.toString() &&
      JSON.stringify(item.variant) === JSON.stringify(productData.variant || {})
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = this.items[existingItemIndex].quantity + quantity;

    // Check stock
    if (newQuantity > productData.stock) {
      throw new Error(`Only ${productData.stock} items available in stock`);
    }

    // Check max quantity limit
    const maxQty = productData.maxQuantity || 10;
    if (newQuantity > maxQty) {
      throw new Error(`Maximum ${maxQty} items can be added`);
    }

    this.items[existingItemIndex].quantity = newQuantity;
    this.items[existingItemIndex].itemTotal = this.items[existingItemIndex].price * newQuantity;
    this.items[existingItemIndex].savings =
      (this.items[existingItemIndex].mrp - this.items[existingItemIndex].price) * newQuantity;
  } else {
    // Add new item
    if (quantity > productData.stock) {
      throw new Error(`Only ${productData.stock} items available in stock`);
    }

    const itemTotal = productData.price * quantity;
    const savings = (productData.mrp - productData.price) * quantity;

    this.items.push({
      product: productData._id,
      name: productData.name,
      image: productData.images?.[0] || productData.image,
      price: productData.price,
      mrp: productData.mrp,
      discount: productData.discount || 0,
      quantity,
      unit: productData.unit,
      weight: productData.weight,
      stock: productData.stock,
      maxQuantity: productData.maxQuantity || 10,
      itemTotal,
      savings,
      category: productData.category,
      subCategory: productData.subCategory,
      variant: productData.variant || {},
      deliveryTime: productData.deliveryTime || '10 mins',
      offerApplied: false,
    });
  }

  this.calculatePricing();
  return this;
};

cartSchema.methods.updateItemQuantity = function (
  this: ICart,
  itemId: string,
  quantity: number
): ICart {
  const item = this.items.find(i => i._id?.toString() === itemId);

  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  if (quantity > item.stock) {
    throw new Error(`Only ${item.stock} items available in stock`);
  }

  if (quantity > item.maxQuantity) {
    throw new Error(`Maximum ${item.maxQuantity} items can be added`);
  }

  item.quantity = quantity;
  item.itemTotal = item.price * quantity;
  item.savings = (item.mrp - item.price) * quantity;

  this.calculatePricing();
  return this;
};

cartSchema.methods.removeItem = function (this: ICart, itemId: string): ICart {
  const itemIndex = this.items.findIndex((item) => item._id?.toString() === itemId);

  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  this.items.splice(itemIndex, 1);
  this.calculatePricing();
  return this;
};

cartSchema.methods.clearCart = function (this: ICart): ICart {
  this.items = [];
  this.appliedCoupon = undefined;
  this.calculatePricing();
  return this;
};

cartSchema.methods.applyCoupon = function (this: ICart, couponData: any): ICart {
  this.appliedCoupon = {
    code: couponData.code,
    discountAmount: couponData.discountAmount,
    couponId: couponData._id,
  };
  this.calculatePricing();
  return this;
};

cartSchema.methods.removeCoupon = function (this: ICart): ICart {
  this.appliedCoupon = undefined;
  this.calculatePricing();
  return this;
};

// Static Methods
(cartSchema.statics as any).getOrCreateCart = async function (
  this: Model<ICart>,
  userId: mongoose.Types.ObjectId,
  sessionId?: string
): Promise<ICart> {
  let cart = await (this as any).findOne({
    user: userId,
    status: 'active',
  });

  if (!cart) {
    cart = await this.create({
      user: userId,
      sessionId,
      items: [],
    });
  }

  return cart;
};

(cartSchema.statics as any).mergeGuestCart = async function (
  this: Model<ICart>,
  guestSessionId: string,
  userId: mongoose.Types.ObjectId
): Promise<ICart | null> {
  const guestCart = await (this as any).findOne({
    sessionId: guestSessionId,
    isGuest: true,
    status: 'active',
  });

  if (!guestCart || guestCart.items.length === 0) {
    return null;
  }

  let userCart = await this.findOne({
    user: userId,
    status: 'active',
  });

  if (!userCart) {
    userCart = await this.create({
      user: userId,
      items: [],
    });
  }

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItemIndex = userCart.items.findIndex(
      (item) => item.product.toString() === guestItem.product.toString()
    );

    if (existingItemIndex > -1) {
      const newQty = userCart.items[existingItemIndex].quantity + guestItem.quantity;
      userCart.items[existingItemIndex].quantity = Math.min(newQty, guestItem.maxQuantity);
      userCart.items[existingItemIndex].itemTotal =
        userCart.items[existingItemIndex].price * userCart.items[existingItemIndex].quantity;
      userCart.items[existingItemIndex].savings =
        (userCart.items[existingItemIndex].mrp - userCart.items[existingItemIndex].price) *
        userCart.items[existingItemIndex].quantity;
    } else {
      userCart.items.push(guestItem);
    }
  }

  userCart.calculatePricing();
  await userCart.save();

  // Mark guest cart as merged
  guestCart.status = 'merged';
  await guestCart.save();

  return userCart;
};

const Cart = mongoose.model<ICart, ICartModel>('Cart', cartSchema);

export default Cart;
