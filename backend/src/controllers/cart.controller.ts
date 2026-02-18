import { Request, Response, NextFunction } from 'express';
import Cart from '../models/Cart.model';

// Extended request type for controllers that rely on `user`, `isAuthenticated`, and `sessionId`
type AuthRequest = Request & {
  user?: { _id?: any } | null;
  isAuthenticated?: boolean;
  sessionId?: string;
};
import { Product } from '../models/product.model';
import Coupon from '../models/Coupon.model';
import { asyncHandler } from '../middlewares/async.middleware';
import ErrorResponse from '../utils/errorResponse';
import {
  AddToCartRequest,
  UpdateQuantityRequest,
  ApplyCouponRequest,
  MergeCartRequest,
  CartResponse,
  CartSummaryResponse,
  CartValidationResponse,
  ValidationError,
} from '../types/cart.types';

// @desc    Get user cart
// @route   GET /api/cart
// @access  Public (Guest + Authenticated)
export const getCart = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let cart;

  if (req.isAuthenticated && req.user) {
    // Get authenticated user's cart
    cart = await Cart.getOrCreateCart(req.user!._id as any);
  } else if (req.sessionId) {
    // Get guest cart
    cart = await Cart.findOne({
      sessionId: req.sessionId,
      isGuest: true,
      status: 'active',
    });

    if (!cart) {
      cart = await Cart.create({
        sessionId: req.sessionId,
        isGuest: true,
        items: [],
      });
    }
  } else {
    return next(new ErrorResponse('Session ID required', 400));
  }

  // Populate product details
  await cart.populate('items.product', 'name images price mrp stock isActive');

  const response: CartResponse = {
    success: true,
    data: cart,
    sessionId: req.sessionId,
  };

  res.status(200).json(response);
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Public (Guest + Authenticated)
export const addToCart = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { productId, quantity = 1, variant }: AddToCartRequest = req.body;

  if (!productId) {
    return next(new ErrorResponse('Product ID is required', 400));
  }

  // Get product details
  const product = await Product.findById(productId);

  if (!product) {
    return next(new ErrorResponse('Product not found', 404));
  }

  if (!product.isActive) {
    return next(new ErrorResponse('Product is not available', 400));
  }

  if (product.stock < quantity) {
    return next(new ErrorResponse(`Only ${product.stock} items available in stock`, 400));
  }

  let cart;

  if (req.isAuthenticated && req.user) {
    // Get or create authenticated user's cart
    cart = await Cart.getOrCreateCart(req.user!._id as any);
  } else if (req.sessionId) {
    // Get or create guest cart
    cart = await Cart.findOne({
      sessionId: req.sessionId,
      isGuest: true,
      status: 'active',
    });

    if (!cart) {
      cart = await Cart.create({
        sessionId: req.sessionId,
        isGuest: true,
        items: [],
      });
    }
  } else {
    return next(new ErrorResponse('Session ID required', 400));
  }

  // Prepare product data with variant if provided
  const productData = {
    ...product.toObject(),
    variant: variant || {},
  };

  // Add item to cart
  try {
    await cart.addItem(productData, quantity);
    await cart.save();

    // Populate and return
    await cart.populate('items.product', 'name images price mrp stock isActive');

    const response: CartResponse = {
      success: true,
      message: 'Item added to cart successfully',
      data: cart,
      sessionId: req.sessionId,
    };

    res.status(200).json(response);
  } catch (error: any) {
    return next(new ErrorResponse(error.message, 400));
  }
});

// @desc    Update item quantity
// @route   PUT /api/cart/update/:itemId
// @access  Public (Guest + Authenticated)
export const updateQuantity = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let { itemId } = req.params;
  if (Array.isArray(itemId)) itemId = itemId[0];
  const { quantity }: UpdateQuantityRequest = req.body;

  if (!quantity || quantity < 1) {
    return next(new ErrorResponse('Valid quantity is required', 400));
  }

  let cart;

  if (req.isAuthenticated && req.user) {
    cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' });
  } else if (req.sessionId) {
    cart = await Cart.findOne({
      sessionId: req.sessionId,
      isGuest: true,
      status: 'active',
    });
  } else {
    return next(new ErrorResponse('Session ID required', 400));
  }

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  const item = cart.items.find((cartItem: any) => cartItem?._id?.toString() === itemId);
  if (!item) {
    return next(new ErrorResponse('Cart item not found', 404));
  }

  const product = await Product.findById(item.product);
  if (!product || !product.isActive) {
    return next(new ErrorResponse('Product not found or inactive', 404));
  }

  if (product.stock < quantity) {
    return next(new ErrorResponse(`Only ${product.stock} items available in stock`, 400));
  }

  try {
    cart.updateItemQuantity(itemId, quantity);
    await cart.save();

    await cart.populate('items.product', 'name images price mrp stock isActive');

    const response: CartResponse = {
      success: true,
      message: 'Quantity updated successfully',
      data: cart,
      sessionId: req.sessionId,
    };

    res.status(200).json(response);
  } catch (error: any) {
    return next(new ErrorResponse(error.message, 400));
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Public (Guest + Authenticated)
export const removeItem = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let { itemId } = req.params;
  if (Array.isArray(itemId)) itemId = itemId[0];

  let cart;

  if (req.isAuthenticated && req.user) {
    cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' });
  } else if (req.sessionId) {
    cart = await Cart.findOne({
      sessionId: req.sessionId,
      isGuest: true,
      status: 'active',
    });
  } else {
    return next(new ErrorResponse('Session ID required', 400));
  }

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  try {
    cart.removeItem(itemId);
    await cart.save();

    await cart.populate('items.product', 'name images price mrp stock isActive');

    const response: CartResponse = {
      success: true,
      message: 'Item removed from cart successfully',
      data: cart,
      sessionId: req.sessionId,
    };

    res.status(200).json(response);
  } catch (error: any) {
    return next(new ErrorResponse(error.message, 400));
  }
});

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Public (Guest + Authenticated)
export const clearCart = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let cart;

  if (req.isAuthenticated && req.user) {
    cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' });
  } else if (req.sessionId) {
    cart = await Cart.findOne({
      sessionId: req.sessionId,
      isGuest: true,
      status: 'active',
    });
  } else {
    return next(new ErrorResponse('Session ID required', 400));
  }

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  cart.clearCart();
  await cart.save();

  const response: CartResponse = {
    success: true,
    message: 'Cart cleared successfully',
    data: cart,
    sessionId: req.sessionId,
  };

  res.status(200).json(response);
});

// @desc    Merge guest cart with user cart
// @route   POST /api/cart/merge
// @access  Private (Authenticated only)
export const mergeGuestCart = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { guestSessionId }: MergeCartRequest = req.body;

  if (!guestSessionId) {
    return next(new ErrorResponse('Guest session ID is required', 400));
  }

  if (!req.user) {
    return next(new ErrorResponse('User not authenticated', 401));
  }

  const mergedCart = await Cart.mergeGuestCart(guestSessionId, req.user!._id as any);

  if (!mergedCart) {
    // No guest cart to merge, return user's cart
    const userCart = await Cart.getOrCreateCart(req.user!._id as any);
    await userCart.populate('items.product', 'name images price mrp stock isActive');

    const response: CartResponse = {
      success: true,
      message: 'No guest cart to merge',
      data: userCart,
    };

    res.status(200).json(response);
    return;
  }

  await mergedCart.populate('items.product', 'name images price mrp stock isActive');

  const response: CartResponse = {
    success: true,
    message: 'Guest cart merged successfully',
    data: mergedCart,
  };

  res.status(200).json(response);
});

// @desc    Apply coupon
// @route   POST /api/cart/coupon/apply
// @access  Private
export const applyCoupon = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { couponCode }: ApplyCouponRequest = req.body;

  if (!couponCode) {
    return next(new ErrorResponse('Coupon code is required', 400));
  }

  if (!req.user) {
    return next(new ErrorResponse('User not authenticated', 401));
  }

  const cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' });

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  if (cart.items.length === 0) {
    return next(new ErrorResponse('Cart is empty', 400));
  }

  // Validate coupon
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
    validTo: { $gte: new Date() },
  });

  if (!coupon) {
    return next(new ErrorResponse('Invalid or expired coupon', 400));
  }

  // Check valid from date
  if (coupon.validFrom > new Date()) {
    return next(new ErrorResponse('Coupon is not yet valid', 400));
  }

  // Check minimum order value
  if (cart.pricing.subtotal < coupon.minOrderValue) {
    return next(new ErrorResponse(`Minimum order value of \u20B9${coupon.minOrderValue} required`, 400));
  }

  // Check if user already used this coupon
  const userIdForCouponCheck = req.user ? req.user._id : undefined;
  if (coupon.usedBy && userIdForCouponCheck && coupon.usedBy.some((id) => id.toString() === userIdForCouponCheck.toString())) {
    return next(new ErrorResponse('Coupon already used', 400));
  }

  // Check max usage count
  if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
    return next(new ErrorResponse('Coupon usage limit reached', 400));
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cart.pricing.subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  cart.applyCoupon({
    _id: coupon._id,
    code: coupon.code,
    discountAmount: Math.round(discountAmount * 100) / 100,
  });

  await cart.save();
  await cart.populate('items.product', 'name images price mrp stock isActive');

  const response: CartResponse = {
    success: true,
    message: 'Coupon applied successfully',
    data: cart,
  };

  res.status(200).json(response);
});

// @desc    Remove coupon
// @route   DELETE /api/cart/coupon/remove
// @access  Private
export const removeCoupon = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    return next(new ErrorResponse('User not authenticated', 401));
  }

  const cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' });

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  cart.removeCoupon();
  await cart.save();
  await cart.populate('items.product', 'name images price mrp stock isActive');

  const response: CartResponse = {
    success: true,
    message: 'Coupon removed successfully',
    data: cart,
  };

  res.status(200).json(response);
});

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
export const getCartSummary = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    return next(new ErrorResponse('User not authenticated', 401));
  }

  const cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' });

  if (!cart) {
    const response: CartSummaryResponse = {
      success: true,
      data: {
        itemCount: 0,
        subtotal: 0,
        total: 0,
        savings: 0,
        isFreeDelivery: false,
      },
    };

    res.status(200).json(response);
    return;
  }

  const response: CartSummaryResponse = {
    success: true,
    data: {
      itemCount: cart.itemCount,
      subtotal: cart.pricing.subtotal,
      total: cart.pricing.total,
      savings: cart.pricing.totalSavings,
      isFreeDelivery: cart.isFreeDelivery,
    },
  };

  res.status(200).json(response);
});

// @desc    Validate cart before checkout
// @route   POST /api/cart/validate
// @access  Private
export const validateCart = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    return next(new ErrorResponse('User not authenticated', 401));
  }

  const cart = await Cart.findOne({ user: req.user!._id as any, status: 'active' }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    return next(new ErrorResponse('Cart is empty', 400));
  }

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let cartModified = false;

  // Validate each item
  for (let i = cart.items.length - 1; i >= 0; i--) {
    const item = cart.items[i];
    const product = item.product as any;

    // Check if product exists and is active
    if (!product || !product.isActive) {
      cart.items.splice(i, 1);
      cartModified = true;
      errors.push({
        item: item.name,
        message: 'Product is no longer available',
      });
      continue;
    }

    // Check stock availability
    if (product.stock === 0) {
      cart.items.splice(i, 1);
      cartModified = true;
      errors.push({
        item: item.name,
        message: 'Product is out of stock',
      });
      continue;
    }

    // Check if requested quantity is available
    if (item.quantity > product.stock) {
      item.quantity = product.stock;
      item.itemTotal = item.price * item.quantity;
      item.savings = (item.mrp - item.price) * item.quantity;
      cartModified = true;
      warnings.push({
        item: item.name,
        message: `Only ${product.stock} items available. Quantity adjusted.`,
      });
    }

    // Check for price changes
    if (item.price !== product.price) {
      const priceDiff = product.price - item.price;
      item.price = product.price;
      item.itemTotal = item.price * item.quantity;
      item.savings = (item.mrp - item.price) * item.quantity;
      cartModified = true;

      if (priceDiff > 0) {
        warnings.push({
          item: item.name,
          message: `Price increased by \u20B9${priceDiff.toFixed(2)}`,
        });
      } else {
        warnings.push({
          item: item.name,
          message: `Price decreased by \u20B9${Math.abs(priceDiff).toFixed(2)}`,
        });
      }
    }

    // Check for MRP changes
    if (item.mrp !== product.mrp) {
      item.mrp = product.mrp;
      item.savings = (item.mrp - item.price) * item.quantity;
      cartModified = true;
    }
  }

  if (cartModified) {
    cart.calculatePricing();
    await cart.save();
  }

  const isValid = errors.length === 0;

  const response: CartValidationResponse = {
    success: true,
    isValid,
    errors,
    warnings,
    data: cartModified ? cart : null,
  };

  res.status(200).json(response);
});


