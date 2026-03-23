import { getChannel } from '../config/rabbitmq';
import { logQueue, logError } from '../utils/logger';

export interface OtpQueueMessage {
  phone: string;
  otp: string;
  email?: string;
}

const OTP_QUEUE = 'otp_queue';

/**
 * Initialize OTP Queue
 */
export async function initOtpQueue() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(OTP_QUEUE, { durable: true });
    logQueue('initialized', OTP_QUEUE);
  } catch (error) {
    logError(`Failed to initialize OTP queue`, {}, error as Error);
    throw error;
  }
}

/**
 * Publish OTP to queue for delivery (SMS/Email)
 */
export async function publishOtpToQueue(phone: string, otp: string, email?: string) {
  try {
    const channel = await getChannel();
    const message: OtpQueueMessage = { phone, otp, email };
    
    const success = channel.sendToQueue(
      OTP_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    if (!success) {
      logError(`Failed to publish to OTP queue - queue full?`, { phone });
      throw new Error('Failed to publish message to OTP queue');
    }

    logQueue('published_message', OTP_QUEUE, { phone, hasEmail: !!email });
    return true;
  } catch (error) {
    logError(`Error publishing to OTP queue`, { phone }, error as Error);
    throw error;
  }
}

/**
 * Get queue statistics (for monitoring)
 */
export async function getOtpQueueStats() {
  try {
    const channel = await getChannel();
    const queueInfo = await channel.assertQueue(OTP_QUEUE, { durable: true });
    return {
      messageCount: queueInfo.messageCount,
      consumerCount: queueInfo.consumerCount,
    };
  } catch (error) {
    logError(`Failed to get OTP queue stats`, {}, error as Error);
    return { messageCount: 0, consumerCount: 0 };
  }
}

export default {
  initOtpQueue,
  publishOtpToQueue,
  getOtpQueueStats,
};
