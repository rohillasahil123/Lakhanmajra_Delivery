import { connectRabbitMQ, getChannel } from '../../config/rabbitmq';
import connectDB from '../../config/mongo';
import { logQueue, logError, logInfo } from '../../utils/logger';
import type { EmailQueueMessage } from '../../types';
import Order from '../../models/order.model';
import { getEmailTemplate } from '../../services/emailTemplates';

/**
 * Email Service - Sends order notification emails
 * SECURITY: Currently simulates email sending for development
 * TODO: Integrate with Nodemailer service and SMTP provider (SendGrid/AWS SES)
 */

const EMAIL_QUEUE = 'email_queue';
const MAX_RETRIES = 3;
const MESSAGE_TIMEOUT_MS = 30000; // 30 seconds per message

/**
 * Send email notification
 * Currently logs the email that would be sent (for development)
 * In production: would send via Nodemailer/SMTP
 */
const sendEmail = async (
  orderId: string,
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered'
): Promise<void> => {
  try {
    // Fetch full order data with user info for email
    const order = await Order.findById(orderId).populate('userId');
    
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Ensure userId is populated as a user object with email
    const user = typeof order.userId === 'object' && order.userId !== null
      ? (order.userId as any)
      : null;

    if (!user || !user.email) {
      throw new Error(`No email found for order ${orderId}`);
    }

    // Get email template based on type
    const template = getEmailTemplate(type, order.toObject?.() || order);

    // TODO: Integrate with real email service (Nodemailer)
    // const transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: process.env.EMAIL_ADDRESS,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });
    //
    // await transporter.sendMail({
    //   from: process.env.EMAIL_FROM || 'noreply@lakhanmajra.com',
    //   to: user.email,
    //   subject: template.subject,
    //   html: template.html,
    // });

    // For now, log the email that would be sent
    logInfo(`Email would be sent`, {
      type,
      orderId,
      to: user.email,
      subject: template.subject,
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500));

    logInfo(`Email processed`, { orderId, type });
  } catch (error) {
    logError(`Failed to process email for order`, { orderId, type }, error as Error);
    throw error; // Re-throw to trigger retry
  }
};

async function startEmailWorker(): Promise<void> {
  try {
    await connectDB();
    logInfo('Email Worker: Database connected');
    
    await connectRabbitMQ();
    logInfo('Email Worker: RabbitMQ connected');
    
    const channel = await getChannel();
    
    // Set prefetch to 1 to ensure fair distribution
    await channel.prefetch(1);
    
    logQueue('started', EMAIL_QUEUE, { prefetch: 1 });
    
    channel.consume(EMAIL_QUEUE, async (msg) => {
      if (!msg) return;

      const startTime = Date.now();
      let retryCount = 0;

      const processMessage = async (): Promise<void> => {
        try {
          const messageContent = msg.content.toString();
          const { orderId, type }: EmailQueueMessage = JSON.parse(messageContent);

          // Validate message
          if (!orderId || !type) {
            throw new Error('Invalid message format: missing orderId or type');
          }

          logQueue('processing_message', EMAIL_QUEUE, { orderId, type });

          // Send email with timeout protection
          await Promise.race([
            sendEmail(orderId, type),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Email sending timeout')), MESSAGE_TIMEOUT_MS)
            ),
          ]);

          // Acknowledge message on success
          channel.ack(msg);
          const duration = Date.now() - startTime;
          logQueue('message_processed', EMAIL_QUEUE, { orderId, type, duration: `${duration}ms` });

        } catch (error) {
          retryCount++;
          const processingTime = Date.now() - startTime;

          if (retryCount < MAX_RETRIES) {
            const backoffDelay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            logQueue('retrying_message', EMAIL_QUEUE, {
              attempt: retryCount,
              maxRetries: MAX_RETRIES,
              backoffDelay: `${backoffDelay}ms`,
              duration: `${processingTime}ms`,
            });

            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            
            // Retry processing
            return processMessage();
          } else {
            // Max retries exceeded - nack and move to dead letter queue
            logError(`Email message dropped after ${MAX_RETRIES} retries`, {
              maxRetries: MAX_RETRIES,
              totalDuration: `${processingTime}ms`,
            }, error as Error);
            
            // nack with requeue=false to send to DLQ
            channel.nack(msg, false, false);
          }
        }
      };

      // Start processing this message
      await processMessage();
    });

    // Graceful shutdown on signals
    process.on('SIGINT', async () => {
      logInfo('SIGINT received - shutting down Email Worker gracefully...');
      const channel = await getChannel();
      await channel.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logInfo('SIGTERM received - shutting down Email Worker gracefully...');
      const channel = await getChannel();
      await channel.close();
      process.exit(0);
    });

  } catch (error) {
    logError('Email Worker: Failed to start', error);
    process.exit(1);
  }
}

// Start the worker
startEmailWorker().catch((error) => {
  logError('Email Worker: Unhandled error', error);
  process.exit(1);
});

