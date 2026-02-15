import amqp, { Channel } from 'amqplib';
import type { ChannelModel } from 'amqplib';

let channel: Channel | null = null;
let connection: ChannelModel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    console.log('Connecting to RabbitMQ at', rabbitmqUrl);

    const rabbitmqConnection = await amqp.connect(rabbitmqUrl);
    const rabbitmqChannel = await rabbitmqConnection.createChannel();

    connection = rabbitmqConnection;
    channel = rabbitmqChannel;

    await rabbitmqChannel.assertQueue('order_queue', { durable: true });
    await rabbitmqChannel.assertQueue('email_queue', { durable: true });

    console.log('RabbitMQ connected successfully');
    return rabbitmqChannel;
  } catch (error) {
    console.error('RabbitMQ connection failed:', error);
    // Retry after 5 seconds
    setTimeout(() => {
      void connectRabbitMQ();
    }, 5000);
    // swallow the error so app can continue — retry loop will attempt reconnection
    return null as any;
  }
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});
