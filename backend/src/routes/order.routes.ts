import express from 'express';
import { createOrder, getMyOrders, getOrderById } from '../controllers/order.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

export default router;
