import express from 'express';
import { createOrder, getMyOrders, getOrderById, getOrderEligibility, cancelMyOrder } from '../controllers/order.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/eligibility', protect, getOrderEligibility);
router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.patch('/:id/cancel', protect, cancelMyOrder);
router.get('/:id', protect, getOrderById);

export default router;
