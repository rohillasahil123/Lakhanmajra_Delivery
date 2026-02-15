import express from 'express';
import {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart,
  mergeGuestCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  validateCart,
} from '../controllers/cart.controller';
import { protect } from '../middlewares/auth.middleware';
import { optionalAuth } from '../middlewares/optionalAuth.middleware';
import { cartLimiter } from '../middlewares/rateLimiter.middleware';

const router = express.Router();

// Public routes (guest + authenticated)
router.get('/', optionalAuth, getCart);
router.post('/add', cartLimiter, optionalAuth, addToCart);
router.put('/update/:itemId', cartLimiter, optionalAuth, updateQuantity);
router.delete('/remove/:itemId', cartLimiter, optionalAuth, removeItem);
router.delete('/clear', optionalAuth, clearCart);

// Authenticated routes only
router.post('/merge', protect, mergeGuestCart);
router.post('/coupon/apply', protect, applyCoupon);
router.delete('/coupon/remove', protect, removeCoupon);
router.get('/summary', protect, getCartSummary);
router.post('/validate', protect, validateCart);

export default router;