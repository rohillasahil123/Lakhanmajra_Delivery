/**
 * PAYMENT WEBHOOK ROUTES
 * Endpoints to receive webhook notifications from payment providers
 * Routes for Razorpay, Stripe, PayPal, Paytm, etc.
 */

import { Router, Request, Response } from 'express';
import {
  handleRazorpayWebhook,
  handleStripeWebhook,
  handlePayPalWebhook,
  handlePaytmWebhook,
  verifyWebhookSignature,
} from '../services/paymentWebhook.service';

const router = Router();

/**
 * SECURITY: All webhook endpoints verify signatures to prevent forged requests
 * No auth middleware needed - external payment provider sends webhook
 */

/**
 * POST /webhooks/razorpay
 * Razorpay payment webhook endpoint
 * Expected signature: X-Razorpay-Signature header with HMAC SHA256
 */
router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    // Verify Razorpay signature
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Get raw body for signature verification
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!verifyWebhookSignature('razorpay', body, signature, secret)) {
      console.warn('⚠️ Razorpay webhook signature verification failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // Process webhook
    return await handleRazorpayWebhook(req, res);
  } catch (err) {
    console.error('❌ Razorpay webhook error', { error: (err as Error)?.message });
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

/**
 * POST /webhooks/stripe
 * Stripe payment webhook endpoint
 * Expected signature: Stripe-Signature header with timestamp and hash
 */
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    // Verify Stripe signature
    const signature = req.headers['stripe-signature'] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    // Raw body is needed for Stripe signature verification
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!verifyWebhookSignature('stripe', body, signature, secret)) {
      console.warn('⚠️ Stripe webhook signature verification failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // Process webhook
    return await handleStripeWebhook(req, res);
  } catch (err) {
    console.error('❌ Stripe webhook error', { error: (err as Error)?.message });
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

/**
 * POST /webhooks/paypal
 * PayPal payment webhook endpoint
 * Expected signature: Transmission-Sig header with HMAC
 */
router.post('/paypal', async (req: Request, res: Response) => {
  try {
    // Verify PayPal signature
    const signature = req.headers['transmission-sig'] as string;
    const secret = process.env.PAYPAL_WEBHOOK_SECRET;

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!verifyWebhookSignature('paypal', body, signature, secret)) {
      console.warn('⚠️ PayPal webhook signature verification failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // Process webhook
    return await handlePayPalWebhook(req, res);
  } catch (err) {
    console.error('❌ PayPal webhook error', { error: (err as Error)?.message });
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

/**
 * POST /webhooks/paytm
 * Paytm payment webhook endpoint
 * Expected signature: CHECKSUMHASH parameter with SHA256
 */
router.post('/paytm', async (req: Request, res: Response) => {
  try {
    // Verify Paytm signature
    const signature = req.body?.CHECKSUMHASH || req.headers['x-paytm-signature'] as string;
    const secret = process.env.PAYTM_WEBHOOK_SECRET;

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!verifyWebhookSignature('paytm', body, signature, secret)) {
      console.warn('⚠️ Paytm webhook signature verification failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // Process webhook
    return await handlePaytmWebhook(req, res);
  } catch (err) {
    console.error('❌ Paytm webhook error', { error: (err as Error)?.message });
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

/**
 * GET /webhooks/health
 * Health check for webhook endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Payment webhook service is running',
    endpoints: ['/razorpay', '/stripe', '/paypal', '/paytm'],
    timestamp: new Date().toISOString(),
  });
});

export default router;
