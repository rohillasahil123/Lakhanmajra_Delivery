import { connectRabbitMQ, getChannel } from '../../config/rabbitmq';
import connectDB from '../../config/mongo';
import { EmailQueueMessage } from '../../types';
import Order from '../../models/order.model';
import { getEmailTemplate } from '../../services/emailTemplates';

/**
 * Email Service - Sends order notification emails
 * SECURITY: Currently simulates email sending for development
 * TODO: Integrate with Nodemailer service and SMTP provider (SendGrid/AWS SES)
 */

const MAX_RETRIES = 3;
const MESSAGE_TIMEOUT_MS = 30000; // 30 seconds per message

/**
 * Send email notification
 * Currently logs the email that would be sent (for development)
 * In production: would send via Nodemailer/SMTP
 */
const sendEmail = async (
  orderId: string,
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered',
  orderData: any
): Promise<void> => {
  try {
    // Fetch full order data with user info for email
    const order = await Order.findById(orderId).populate('userId');
    
    if (!order) {
      console.error(`❌ Email Worker: Order not found - ${orderId}`);
      throw new Error(`Order ${orderId} not found`);
    }

    if (!order.userId || !order.userId.email) {
      console.error(`❌ Email Worker: No email found for user in order - ${orderId}`);
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
    //   to: (order.userId as any).email,
    //   subject: template.subject,
    //   html: template.html,
    // });

    // For now, log the email that would be sent
    console.log(`📧 Email would be sent:`, {
      type: type,
      orderId: orderId,
      to: (order.userId as any).email,
      subject: template.subject,
      timestamp: new Date().toISOString(),
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`✅ Email processed for order ${orderId} (type: ${type})`);
  } catch (error) {
    console.error(`❌ Email Worker: Failed to process email for order ${orderId}`, {
      type: type,
      error: (error as Error)?.message,
      orderId: orderId,
    });
    throw error; // Re-throw to trigger retry
  }
};

async function startEmailWorker(): Promise<void> {
  try {
    await connectDB();
    console.log('✅ Email Worker: Database connected');
    
    await connectRabbitMQ();
    console.log('✅ Email Worker: RabbitMQ connected');
    
    const channel = getChannel();
    
    // Set prefetch to 1 to ensure fair distribution
    await channel.prefetch(1);
    
    console.log('📧 Email Worker started successfully...\n');
    
    channel.consume('email_queue', async (msg) => {
      if (!msg) return;

      const startTime = Date.now();
      let retryCount = 0;

      const processMessage = async (): Promise<void> => {
        try {
          const messageContent = msg.content.toString();
          const { orderId, type }: EmailQueueMessage = JSON.parse(messageContent);

          // Validate message
          if (!orderId || !type) {
            console.error('❌ Email Worker: Invalid message format', { messageContent });
            throw new Error('Invalid message format: missing orderId or type');
          }

          console.log(`📨 Processing email for order: ${orderId} (type: ${type})`);

          // Send email with timeout protection
          await Promise.race([
            sendEmail(orderId, type, {}),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Email sending timeout')), MESSAGE_TIMEOUT_MS)
            ),
          ]);

          // Acknowledge message on success
          channel.ack(msg);
          console.log(`✔️ Email Worker: Message acknowledged for order ${orderId}`);

        } catch (error) {
          retryCount++;
          const processingTime = Date.now() - startTime;

          if (retryCount < MAX_RETRIES) {
            console.warn(
              `⚠️ Email Worker: Retry ${retryCount}/${MAX_RETRIES} for message (time: ${processingTime}ms)`,
              {
                error: (error as Error)?.message,
              }
            );

            // Exponential backoff: 2s, 4s, 8s
            const delayMs = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Retry processing
            return processMessage();
          } else {
            // Max retries exceeded - nack and move to dead letter queue
            console.error(
              `❌ Email Worker: Max retries (${MAX_RETRIES}) exceeded, nacking message`,
              {
                error: (error as Error)?.message,
                processingTime: processingTime,
              }
            );
            
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
      console.log('\n⏹️ Email Worker: Shutting down gracefully...');
      await channel.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️ Email Worker: Shutting down gracefully...');
      await channel.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Email Worker: Failed to start', {
      error: (error as Error)?.message,
    });
    process.exit(1);
  }
}

// Start the worker
startEmailWorker().catch((error) => {
  console.error('❌ Email Worker: Unhandled error', error);
  process.exit(1);
});

