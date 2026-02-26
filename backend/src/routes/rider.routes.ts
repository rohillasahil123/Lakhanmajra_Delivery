import {Router} from 'express';
import {getRiderMe, getRiderOrders, riderLogin} from '../controllers/riderAuth.controller';
import {verifyRiderToken} from '../middlewares/verifyRiderToken.middleware';

const router = Router();

router.post('/login', riderLogin);
router.get('/me', verifyRiderToken, getRiderMe);
router.get('/orders', verifyRiderToken, getRiderOrders);

export default router;