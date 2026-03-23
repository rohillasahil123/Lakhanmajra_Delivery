import { getChannel } from '../config/rabbitmq';
import { logQueue, logError } from '../utils/logger';

export interface OrderQueueMessage {
  orderId: string;
}

const ORDER_QUEUE = 'order_queue';

/**
 * Initialize Order Queue
 */
export async function initOrderQueue() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(ORDER_QUEUE, { durable: true });
    logQueue('initialized', ORDER_QUEUE);
  } catch (error) {
    logError(`Failed to initialize order queue`, {}, error as Error);
    throw error;
  }
}

/**
 * Publish order to queue for processing
 */
export async function publishOrderToQueue(orderId: string) {
  try {
    const channel = await getChannel();
    const message: OrderQueueMessage = { orderId };
    
    const success = channel.sendToQueue(
      ORDER_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    if (!success) {
      logError(`Failed to publish to order queue - queue full?`, { orderId });
      throw new Error('Failed to publish message to order queue');
    }

    logQueue('published_message', ORDER_QUEUE, { orderId });
    return true;
  } catch (error) {
    logError(`Error publishing to order queue`, { orderId }, error as Error);
    throw error;
  }
}

/**
 * Get queue statistics (for monitoring)
 */
export async function getOrderQueueStats() {
  try {
    const channel = await getChannel();
    const queueInfo = await channel.assertQueue(ORDER_QUEUE, { durable: true });
    return {
      messageCount: queueInfo.messageCount,
      consumerCount: queueInfo.consumerCount,
    };
  } catch (error) {
    logError(`Failed to get queue stats`, {}, error as Error);
    return { messageCount: 0, consumerCount: 0 };
  }
}

export default {
  initOrderQueue,
  publishOrderToQueue,
  getOrderQueueStats,
};
