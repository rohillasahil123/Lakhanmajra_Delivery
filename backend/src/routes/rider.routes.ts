import {Router} from 'express';
import {
	getRiderProfile,
	getRiderMe,
	getRiderOrderById,
	getRiderOrders,
	ocrRiderDocumentPrefill,
	requestRiderProfileOtp,
	riderLogin,
	riderLogout,
	uploadRiderDocument,
	updateRiderProfile,
	updateRiderOrderStatus,
	updateRiderOnlineStatus,
	updateRiderLocation,
} from '../controllers/riderAuth.controller';
import {verifyRiderToken} from '../middlewares/verifyRiderToken.middleware';
import { authLimiter, riderLocationLimiter } from '../middlewares/rateLimiter.middleware';
import { handleUploadError, uploadRiderDocument as riderDocumentUploader } from '../middlewares/upload.middleware';

const router = Router();

router.post('/login', authLimiter, riderLogin);
router.post('/logout', verifyRiderToken, riderLogout);
router.get('/me', verifyRiderToken, getRiderMe);
router.get('/profile', verifyRiderToken, getRiderProfile);
router.post('/profile/request-otp', verifyRiderToken, requestRiderProfileOtp);
router.post('/profile/ocr-prefill', verifyRiderToken, ocrRiderDocumentPrefill);
router.put('/profile', verifyRiderToken, updateRiderProfile);
router.post('/upload-document', verifyRiderToken, riderDocumentUploader.single('file'), handleUploadError, uploadRiderDocument);
router.get('/orders', verifyRiderToken, getRiderOrders);
router.get('/orders/:orderId', verifyRiderToken, getRiderOrderById);
router.patch('/orders/:orderId/status', verifyRiderToken, updateRiderOrderStatus);
router.patch('/status', verifyRiderToken, updateRiderOnlineStatus);
router.post('/location', riderLocationLimiter, verifyRiderToken, updateRiderLocation);

export default router;