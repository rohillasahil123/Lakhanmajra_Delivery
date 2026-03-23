import { connectRabbitMQ, getChannel } from '../../config/rabbitmq';
import connectDB from '../../config/mongo';
import Order from '../../models/order.model';
import { logQueue, logError, logInfo } from '../../utils/logger';
import type { EmailQueueMessage, OrderQueueMessage } from '../../types';

const ORDER_QUEUE = 'order_queue';
const EMAIL_QUEUE = 'email_queue';
const MAX_RETRIES = 3;
const MESSAGE_TIMEOUT_MS = 30000; // 30 seconds
const ORDER_PROCESSING_DELAY_MS = 3000; // 3 seconds before confirming

interface MessageWithRetry {
  content: Buffer;
  fields: any;
  properties: any;
  retryCount?: number;
}

async function processOrderMessage(message: MessageWithRetry): Promise<boolean> {
  const startTime = Date.now();

  try {
    const { orderId }: OrderQueueMessage = JSON.parse(message.content.toString());

    logQueue('processing_message', ORDER_QUEUE, {
      orderId,
      retryCount: message.retryCount || 0,
    });

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Update to processing status
    order.status = 'processing';
    await order.save();

    logInfo(`Order status updated to processing`, { orderId, duration: `${Date.now() - startTime}ms` });

    // Wait before confirming (simulating processing time)
    await new Promise(resolve => setTimeout(resolve, ORDER_PROCESSING_DELAY_MS));

    // Update to confirmed status
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    await order.save();

    logInfo(`Order confirmed`, {
      orderId,
      paymentStatus: 'paid',
      totalDuration: `${Date.now() - startTime}ms`,
    });

    // Publish to email queue for order confirmation email
    const emailMessage: EmailQueueMessage = {
      orderId,
      type: 'order_confirmation',
    };

    const channel = await getChannel();
    const success = channel.sendToQueue(
      EMAIL_QUEUE,
      Buffer.from(JSON.stringify(emailMessage)),
      { persistent: true }
    );

    if (!success) {
      throw new Error('Failed to publish to email queue');
    }

    logQueue('published_message', EMAIL_QUEUE, {
      orderId,
      type: 'order_confirmation',
    });

    return true;
  } catch (error) {
    logError(`Error processing order message`, {
      duration: `${Date.now() - startTime}ms`,
    }, error as Error);
    return false;
  }
}

export async function startOrderWorker(): Promise<void> {
  try {
    logInfo('Starting Order Worker...');

    await connectDB();
    logInfo('Database connected');

    await connectRabbitMQ();
    logInfo('RabbitMQ connected');

    const channel = await getChannel();
    await channel.assertQueue(ORDER_QUEUE, { durable: true });

    // Set prefetch to 1 for fair distribution across multiple workers
    await channel.prefetch(1);

    logQueue('started', ORDER_QUEUE, { prefetch: 1 });

    channel.consume(ORDER_QUEUE, async (message) => {
      if (!message) return;

      const msgWithRetry = message as MessageWithRetry;
      msgWithRetry.retryCount = msgWithRetry.retryCount || 0;

      try {
        const processTimeout = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Message processing timeout')), MESSAGE_TIMEOUT_MS)
        );

        const processingPromise = processOrderMessage(msgWithRetry);
        const result = await Promise.race([processingPromise, processTimeout]);

        if (result) {
          // Success: acknowledge and remove from queue
          channel.ack(message);
        } else {
          throw new Error('Order processing failed');
        }
      } catch (error) {
        const retryCount = (msgWithRetry.retryCount || 0) + 1;

        logError(`Order message processing failed (attempt ${retryCount}/${MAX_RETRIES})`, {
          retryCount,
          maxRetries: MAX_RETRIES,
        }, error as Error);

        if (retryCount < MAX_RETRIES) {
          // Retry with exponential backoff
          const backoffDelay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          logQueue('retrying_message', ORDER_QUEUE, {
            attempt: retryCount,
            backoffDelay: `${backoffDelay}ms`,
          });

          // Add back to queue with retry count
          msgWithRetry.retryCount = retryCount;
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          channel.nack(message, false, true); // Requeue
        } else {
          // Max retries exceeded: dead letter
          logError(`Order message dropped after ${MAX_RETRIES} retries - moving to DLX`, {
            maxRetries: MAX_RETRIES,
          }, new Error('Max retries exceeded'));
          channel.nack(message, false, false); // Don't requeue - dead letter
        }
      }
    });
  } catch (error) {
    logError(`Failed to start Order Worker`, {}, error as Error);
    throw error;
  }
}

export async function stopOrderWorker() {
  try {
    const channel = await getChannel();
    await channel.cancel(`${ORDER_QUEUE}-consumer`);
    logQueue('stopped', ORDER_QUEUE);
  } catch (error) {
    logError(`Error stopping Order Worker`, {}, error as Error);
  }
}

// Auto-start if run directly
if (require.main === module) {
  startOrderWorker()
    .then(() => {
      logInfo('Order Worker started successfully');
    })
    .catch((error) => {
      logError('Failed to start Order Worker', {}, error);
      process.exit(1);
    });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logInfo('SIGINT received - shutting down Order Worker gracefully...');
    await stopOrderWorker();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logInfo('SIGTERM received - shutting down Order Worker gracefully...');
    await stopOrderWorker();
    process.exit(0);
  });
}

export default { startOrderWorker, stopOrderWorker };
