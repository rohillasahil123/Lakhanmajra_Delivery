import { connectRabbitMQ, getChannel } from '../../config/rabbitmq';
import connectDB from '../../config/mongo';
import Order from '../../models/order.model';
import { EmailQueueMessage, OrderQueueMessage } from '../../types';

async function startOrderWorker(): Promise<void> {
  await connectDB();
  await connectRabbitMQ();

  const channel = getChannel();
  console.log('Order Worker started');

  channel.consume('order_queue', async (msg) => {
    if (!msg) {
      return;
    }

    try {
      const { orderId }: OrderQueueMessage = JSON.parse(msg.content.toString());
      console.log(`Processing order: ${orderId}`);

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      order.status = 'processing';
      await order.save();

      setTimeout(async () => {
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        await order.save();

        const emailMessage: EmailQueueMessage = {
          orderId,
          type: 'order_confirmation',
        };

        channel.sendToQueue('email_queue', Buffer.from(JSON.stringify(emailMessage)), {
          persistent: true,
        });

        console.log(`Order ${orderId} confirmed`);
      }, 3000);

      channel.ack(msg);
    } catch (error) {
      console.error('Order processing error:', error);
      channel.nack(msg, false, true);
    }
  });
}

startOrderWorker().catch((error) => {
  console.error('Failed to start order worker:', error);
});
