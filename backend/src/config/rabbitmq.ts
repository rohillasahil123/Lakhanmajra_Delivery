import amqp, { Channel } from 'amqplib';
import type { ChannelModel } from 'amqplib';
import { logInfo, logError } from '../utils/logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RECONNECT_DELAY_MS = Number(process.env.RABBITMQ_RETRY_DELAY_MS || 5000);

let channel: Channel | null = null;
let connection: ChannelModel | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let connectionPromise: Promise<Channel> | null = null;

const clearConnectionState = (): void => {
  channel = null;
  connection = null;
};

const scheduleReconnect = (): void => {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectRabbitMQ().catch((error) => {
      logError('RabbitMQ reconnect attempt failed', error);
      scheduleReconnect();
    });
  }, RECONNECT_DELAY_MS);
};

const attachConnectionListeners = (rabbitConnection: ChannelModel): void => {
  rabbitConnection.once('close', () => {
    clearConnectionState();
    scheduleReconnect();
  });

  rabbitConnection.once('error', (error) => {
    logError('RabbitMQ connection error', error);
  });
};

const createChannel = async (): Promise<Channel> => {
  logInfo('Connecting to RabbitMQ at', { url: RABBITMQ_URL });

  const rabbitConnection = await amqp.connect(RABBITMQ_URL);
  const rabbitChannel = await rabbitConnection.createChannel();

  await rabbitChannel.assertQueue('order_queue', { durable: true });
  await rabbitChannel.assertQueue('email_queue', { durable: true });

  connection = rabbitConnection;
  channel = rabbitChannel;

  attachConnectionListeners(rabbitConnection);

  logInfo('RabbitMQ connected successfully', {});
  return rabbitChannel;
};

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) {
    return channel;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = createChannel()
    .catch((error) => {
      logError('RabbitMQ connection failed', error);
      clearConnectionState();
      scheduleReconnect();
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

export async function closeRabbitMQConnection(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const activeChannel = channel;
  const activeConnection = connection;

  clearConnectionState();

  if (activeChannel) {
    await activeChannel.close();
  }
  if (activeConnection) {
    await activeConnection.close();
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRabbitMQConnection();
  process.exit(0);
});
