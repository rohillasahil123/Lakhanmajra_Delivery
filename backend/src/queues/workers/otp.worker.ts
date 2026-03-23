import { getChannel } from '../../config/rabbitmq';
import { logQueue, logError, logInfo } from '../../utils/logger';
import type { OtpQueueMessage } from '../otp.queue';

const OTP_QUEUE = 'otp_queue';
const MAX_RETRIES = 3;
const MESSAGE_TIMEOUT_MS = 30000; // 30 seconds

/**
 * OTP Worker - Handles OTP delivery via SMS and Email
 * 
 * Message flow:
 * 1. OTP request triggered in auth.service
 * 2. OtpQueueMessage published to otp_queue
 * 3. This worker consumes and delivers OTP
 * 4. On success: ack message
 * 5. On failure: nack with exponential backoff retry
 */

interface MessageWithRetry {
  content: Buffer;
  fields: any;
  properties: any;
  retryCount?: number;
}

async function deliverOtpViaEmail(email: string, otp: string): Promise<boolean> {
  try {
    // TODO: Integrate with email service (Nodemailer, SendGrid, AWS SES)
    // For now, we'll log the OTP (development mode)
    logInfo(`[OTP EMAIL] Sending OTP to ${email}`, {
      email,
      otp: isDevelopment ? otp : '****',
      method: 'email',
    });

    // Simulated email sending (replace with actual Nodemailer)
    // Example:
    // await transporter.sendMail({
    //   to: email,
    //   subject: 'Your OTP for Lakhanmajra Delivery',
    //   html: `Your OTP is: <strong>${otp}</strong>. Valid for 10 minutes.`
    // });

    return true;
  } catch (error) {
    logError(`Failed to deliver OTP via email`, { email }, error as Error);
    return false;
  }
}

async function deliverOtpViaSms(phone: string, otp: string): Promise<boolean> {
  try {
    // TODO: Integrate with SMS provider (Twilio, AWS SNS, Exotel, MessageBird)
    // For now, we'll log the OTP (development mode)
    logInfo(`[OTP SMS] Sending OTP to ${phone}`, {
      phone,
      otp: isDevelopment ? otp : '****',
      method: 'sms',
    });

    // Simulated SMS sending (replace with actual SMS provider)
    // Example:
    // const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    // await client.messages.create({
    //   body: `Your OTP is ${otp}. Valid for 10 minutes.`,
    //   from: TWILIO_PHONE,
    //   to: phone
    // });

    return true;
  } catch (error) {
    logError(`Failed to deliver OTP via SMS`, { phone }, error as Error);
    return false;
  }
}

async function processOtpMessage(message: MessageWithRetry): Promise<boolean> {
  const startTime = Date.now();

  try {
    const otpMessage: OtpQueueMessage = JSON.parse(message.content.toString());
    const { phone, otp, email } = otpMessage;

    logQueue('processing_message', OTP_QUEUE, {
      phone,
      hasEmail: !!email,
      retryCount: message.retryCount || 0,
    });

    // Send OTP via both SMS and Email (if email provided)
    const smsResult = await deliverOtpViaSms(phone, otp);
    const emailResult = email ? await deliverOtpViaEmail(email, otp) : true;

    if (smsResult && emailResult) {
      const duration = Date.now() - startTime;
      logQueue('message_processed', OTP_QUEUE, {
        phone,
        duration: `${duration}ms`,
      });
      return true;
    } else {
      throw new Error('OTP delivery failed - SMS or Email service error');
    }
  } catch (error) {
    logError(`Error processing OTP message`, {}, error as Error);
    return false;
  }
}

export async function startOtpWorker() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(OTP_QUEUE, { durable: true });

    // Set prefetch to 1 for fair distribution across workers
    await channel.prefetch(1);

    logQueue('started', OTP_QUEUE);

    channel.consume(OTP_QUEUE, async (message) => {
      if (!message) return;

      const msgWithRetry = message as MessageWithRetry;
      msgWithRetry.retryCount = msgWithRetry.retryCount || 0;

      try {
        const processTimeout = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Message processing timeout')), MESSAGE_TIMEOUT_MS)
        );

        const processingPromise = processOtpMessage(msgWithRetry);
        const result = await Promise.race([processingPromise, processTimeout]);

        if (result) {
          // Success: acknowledge and remove from queue
          channel.ack(message);
        } else {
          // Failure: nack with requeue for retry
          throw new Error('OTP processing failed');
        }
      } catch (error) {
        const retryCount = (msgWithRetry.retryCount || 0) + 1;

        logError(`OTP message processing failed (attempt ${retryCount}/${MAX_RETRIES})`, {
          retryCount,
          maxRetries: MAX_RETRIES,
        }, error as Error);

        if (retryCount < MAX_RETRIES) {
          // Retry with exponential backoff
          const backoffDelay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          logQueue('retrying_message', OTP_QUEUE, {
            attempt: retryCount,
            backoffDelay: `${backoffDelay}ms`,
          });

          // Add back to queue with retry count
          msgWithRetry.retryCount = retryCount;
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          channel.nack(message, false, true); // Requeue
        } else {
          // Max retries exceeded: dead letter
          logError(`OTP message dropped after ${MAX_RETRIES} retries`, {}, new Error('Max retries exceeded'));
          channel.nack(message, false, false); // Don't requeue - dead letter
        }
      }
    });
  } catch (error) {
    logError(`Failed to start OTP worker`, {}, error as Error);
    throw error;
  }
}

// Graceful shutdown
export async function stopOtpWorker() {
  try {
    const channel = await getChannel();
    await channel.cancel(`${OTP_QUEUE}-worker`);
    logQueue('stopped', OTP_QUEUE);
  } catch (error) {
    logError(`Error stopping OTP worker`, {}, error as Error);
  }
}

const isDevelopment = process.env.NODE_ENV !== 'production';

// Auto-start if run directly
if (require.main === module) {
  startOtpWorker()
    .then(() => {
      logInfo('OTP Worker started successfully');
    })
    .catch((error) => {
      logError('Failed to start OTP Worker', {}, error);
      process.exit(1);
    });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logInfo('SIGINT received, shutting down OTP worker gracefully...');
    await stopOtpWorker();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logInfo('SIGTERM received, shutting down OTP worker gracefully...');
    await stopOtpWorker();
    process.exit(0);
  });
}

export default { startOtpWorker, stopOtpWorker };
