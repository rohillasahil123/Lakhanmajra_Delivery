/**
 * PAYMENT WEBHOOK SERVICE
 * Handles webhook events from payment providers
 * Updates order payment status based on external payment system callbacks
 */

import { Request, Response } from 'express';
import Order from '../models/order.model';
import { recordAudit } from './audit.service';
import { emitOrderRealtime } from './realtime.service';
import crypto from 'crypto';

type PaymentProvider = 'razorpay' | 'stripe' | 'paypal' | 'paytm';

/**
 * Verify webhook signature from payment provider
 * SECURITY: Prevents forged webhook requests
 */
export const verifyWebhookSignature = (
  provider: PaymentProvider,
  body: string | Buffer,
  signature: string | undefined,
  secret: string | undefined
): boolean => {
  if (!secret || !signature) {
    console.warn('⚠️ PaymentWebhook: Missing signature or secret', { provider });
    return false;
  }

  try {
    let expectedSignature: string;

    switch (provider) {
      case 'razorpay': {
        // Razorpay uses HMAC SHA256
        expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');
        break;
      }

      case 'stripe': {
        // Stripe uses HMAC SHA256 with 't=' prefix
        const signedContent = body;
        const computedSignature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');
        expectedSignature = `v1,${computedSignature}`;
        // For Stripe, signature format is "v1,hash"
        const parts = signature.split(',');
        expectedSignature = parts.length === 2 ? `v1,${computedSignature}` : computedSignature;
        break;
      }

      case 'paypal': {
        // PayPal verification is more complex, but basic HMAC check:
        expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');
        break;
      }

      case 'paytm': {
        // Paytm uses SHA256 checksum
        expectedSignature = crypto
          .createHash('sha256')
          .update(body + '|' + secret)
          .digest('hex');
        break;
      }

      default:
        console.warn('⚠️ PaymentWebhook: Unknown provider', { provider });
        return false;
    }

    // Constant-time comparison to prevent timing attacks
    const match = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!match) {
      console.warn('⚠️ PaymentWebhook: Signature mismatch', {
        provider,
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...',
      });
    }

    return match;
  } catch (err) {
    console.error('⚠️ PaymentWebhook: Signature verification error', {
      provider,
      error: (err as Error)?.message,
    });
    return false;
  }
};

/**
 * Extract order ID from webhook payload based on provider
 */
const extractOrderIdFromPayload = (provider: PaymentProvider, payload: any): string | null => {
  try {
    switch (provider) {
      case 'razorpay':
        // Razorpay webhook format
        return payload?.payload?.payment?.notes?.orderId ||
               payload?.payload?.order?.id ||
               payload?.payload?.id ||
               payload?.orderId ||
               null;

      case 'stripe':
        // Stripe webhook format
        return payload?.data?.object?.metadata?.orderId ||
               payload?.data?.object?.description ||
               payload?.orderId ||
               null;

      case 'paypal':
        // PayPal webhook format
        return payload?.resource?.invoice_number ||
               payload?.resource?.custom_id ||
               payload?.orderId ||
               null;

      case 'paytm':
        // Paytm webhook format
        return payload?.ORDERID || payload?.orderId || null;

      default:
        return payload?.orderId || null;
    }
  } catch (err) {
    console.error('⚠️ PaymentWebhook: Error extracting order ID', {
      provider,
      error: (err as Error)?.message,
    });
    return null;
  }
};

/**
 * Normalize payment status from provider to internal status
 */
const normalizePaymentStatus = (
  provider: PaymentProvider,
  status: string
): 'success' | 'failed' | 'pending' | 'refunded' => {
  const normalized = String(status || '').toLowerCase().trim();

  switch (provider) {
    case 'razorpay':
      if (normalized === 'captured' || normalized === 'authorized') return 'success';
      if (normalized === 'failed' || normalized === 'declined') return 'failed';
      if (normalized === 'refunded') return 'refunded';
      return 'pending';

    case 'stripe':
      if (normalized === 'succeeded' || normalized === 'succeeded') return 'success';
      if (normalized === 'failed') return 'failed';
      if (normalized === 'refunded') return 'refunded';
      return 'pending';

    case 'paypal':
      if (normalized === 'completed' || normalized === 'succeeded') return 'success';
      if (normalized === 'failed' || normalized === 'denied' ||normalized === 'expired') return 'failed';
      if (normalized === 'refunded') return 'refunded';
      return 'pending';

    case 'paytm':
      if (normalized === 'txn_success') return 'success';
      if (normalized === 'txn_failure') return 'failed';
      if (normalized === 'pending') return 'pending';
      return 'pending';

    default:
      return 'pending';
  }
};

/**
 * Handle payment webhook from any provider
 */
export const handlePaymentWebhook = async (
  provider: PaymentProvider,
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = req.body;
    const orderId = extractOrderIdFromPayload(provider, payload);

    if (!orderId) {
      console.warn('⚠️ PaymentWebhook: Unable to extract order ID', {
        provider,
        payloadKeys: Object.keys(payload),
      });
      res.status(400).json({
        success: false,
        message: 'Unable to extract order ID from webhook payload',
      });
      return;
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      console.warn('⚠️ PaymentWebhook: Order not found', { orderId, provider });
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Get payment status from webhook payload
    const paymentStatus = normalizePaymentStatus(
      provider,
      payload?.status || payload?.paymentStatus || 'pending'
    );

    // Only update if payment method is online
    if (order.paymentMethod !== 'online') {
      console.warn('⚠️ PaymentWebhook: Order payment method is not online', {
        orderId,
        paymentMethod: order.paymentMethod,
      });
      res.status(400).json({
        success: false,
        message: 'Order payment method is not online',
      });
      return;
    }

    // Check if payment status changed
    const oldPaymentStatus = order.paymentStatus || 'pending';
    if (oldPaymentStatus === paymentStatus) {
      // Status unchanged, still acknowledge webhook
      res.json({
        success: true,
        message: 'Webhook received (no status change)',
      });
      return;
    }

    /**
     * SECURITY: Log payment status update for audit and fraud detection
     */
    recordAudit({
      actorId: null, // System action
      action: `payment_${paymentStatus}`,
      resource: 'order_payment',
      resourceId: orderId,
      before: { paymentStatus: oldPaymentStatus },
      after: { paymentStatus },
      meta: {
        provider,
        transactionId: payload?.transactionId || payload?.id || 'unknown',
        amount: order.totalAmount,
      },
    }).catch(() => {}); // non-blocking

    // Update order payment status
    let newOrderStatus = order.status;

    // Auto-update order status based on payment success (optional)
    if (paymentStatus === 'success' && order.status === 'pending') {
      newOrderStatus = 'processing';
    } else if (paymentStatus === 'failed' && (!order.status || order.status === 'pending')) {
      newOrderStatus = 'cancelled';
    } else if (paymentStatus === 'refunded') {
      newOrderStatus = 'cancelled';
    }

    // Update order in database
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus,
        status: newOrderStatus,
        paymentUpdatedAt: new Date(),
        paymentProvider: provider,
        paymentTransactionId: payload?.transactionId || payload?.id,
      },
      { new: true }
    ).populate('userId').populate('assignedRiderId');

    if (!updatedOrder) {
      throw new Error('Failed to update order');
    }

    console.log('✅ PaymentWebhook: Order payment updated', {
      orderId,
      provider,
      paymentStatus,
      oldStatus: order.status,
      newStatus: newOrderStatus,
    });

    // Emit real-time update to admins and user
    void emitOrderRealtime(orderId, { event: 'status' }).catch((err) => {
      console.error('⚠️ PaymentWebhook: Failed to emit realtime update', { orderId, error: (err as Error)?.message });
    });

    res.json({
      success: true,
      message: `Payment ${paymentStatus}. Order updated.`,
      orderId,
      paymentStatus,
    });
  } catch (err) {
    console.error('⚠️ PaymentWebhook: Error processing webhook', {
      provider,
      error: (err as Error)?.message,
    });
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
    });
  }
};

/**
 * Razorpay-specific webhook handler
 */
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  await handlePaymentWebhook('razorpay', req, res);
};

/**
 * Stripe-specific webhook handler
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  await handlePaymentWebhook('stripe', req, res);
};

/**
 * PayPal-specific webhook handler
 */
export const handlePayPalWebhook = async (req: Request, res: Response): Promise<void> => {
  await handlePaymentWebhook('paypal', req, res);
};

/**
 * Paytm-specific webhook handler
 */
export const handlePaytmWebhook = async (req: Request, res: Response): Promise<void> => {
  await handlePaymentWebhook('paytm', req, res);
};

export default {
  handlePaymentWebhook,
  handleRazorpayWebhook,
  handleStripeWebhook,
  handlePayPalWebhook,
  handlePaytmWebhook,
  verifyWebhookSignature,
};
