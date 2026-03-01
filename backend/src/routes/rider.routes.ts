import {Router} from 'express';
import {
	getRiderMe,
	getRiderOrderById,
	getRiderOrders,
	riderLogin,
	updateRiderOrderStatus,
	updateRiderOnlineStatus,
	updateRiderLocation,
} from '../controllers/riderAuth.controller';
import {verifyRiderToken} from '../middlewares/verifyRiderToken.middleware';
import { authLimiter, riderLocationLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/login', authLimiter, riderLogin);
router.get('/me', verifyRiderToken, getRiderMe);
router.get('/orders', verifyRiderToken, getRiderOrders);
router.get('/orders/:orderId', verifyRiderToken, getRiderOrderById);
router.patch('/orders/:orderId/status', verifyRiderToken, updateRiderOrderStatus);
router.patch('/status', verifyRiderToken, updateRiderOnlineStatus);
router.post('/location', riderLocationLimiter, verifyRiderToken, updateRiderLocation);

export default router;